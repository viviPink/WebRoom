/**
 * mediasoupClient.js — клиентская обёртка для mediasoup-client
 * Используется и преподавателем, и студентом
 */
import { Device } from 'mediasoup-client';

class MediasoupClient {
  constructor() {
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map(); // label -> producer
    this.consumers = new Map(); // consumerId -> { consumer, stream }
    this.socket = null;
    this.sessionId = null;
    this.onNewConsumer = null; // callback(consumer, stream, appData)
    this.onConsumerClosed = null; // callback(consumerId)
    this.onProducerScore = null;
    this._consumeQueue = Promise.resolve(); // Очередь для последовательного consume
    this._creatingRecvTransport = false;
  }

  async init(socket, sessionId, rtpCapabilities) {
    this.socket = socket;
    this.sessionId = sessionId;

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });

    // Сообщаем серверу наши capabilities
    this._emit('ms-set-rtp-capabilities', { rtpCapabilities: this.device.rtpCapabilities });
  }

  async createSendTransport() {
    const data = await this._request('ms-create-transport', { direction: 'send' });

    this.sendTransport = this.device.createSendTransport({
      id: data.id,
      iceParameters: data.iceParameters,
      iceCandidates: data.iceCandidates,
      dtlsParameters: data.dtlsParameters,
    });

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this._request('ms-connect-transport', {
          transportId: this.sendTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      try {
        const { id } = await this._request('ms-produce', {
          transportId: this.sendTransport.id,
          kind,
          rtpParameters,
          appData,
        });
        callback({ id });
      } catch (err) {
        errback(err);
      }
    });

    return this.sendTransport;
  }

  async createRecvTransport() {
    if (this.recvTransport) return this.recvTransport;
    if (this._creatingRecvTransport) {
      // Ждём пока создастся
      while (this._creatingRecvTransport) {
        await new Promise(r => setTimeout(r, 50));
      }
      return this.recvTransport;
    }
    this._creatingRecvTransport = true;
    const data = await this._request('ms-create-transport', { direction: 'recv' });

    this.recvTransport = this.device.createRecvTransport({
      id: data.id,
      iceParameters: data.iceParameters,
      iceCandidates: data.iceCandidates,
      dtlsParameters: data.dtlsParameters,
    });

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this._request('ms-connect-transport', {
          transportId: this.recvTransport.id,
          dtlsParameters,
        });
        callback();
      } catch (err) {
        errback(err);
      }
    });

    this._creatingRecvTransport = false;
    return this.recvTransport;
  }

  /**
   * Отправить медиа-трек на сервер
   * @param {MediaStreamTrack} track
   * @param {string} label — уникальная метка (camera, screen, mic, playback-video, playback-audio)
   * @param {object} appData — доп. данные (role, target и т.д.)
   */
  async produce(track, label, appData = {}) {
    if (!this.sendTransport) {
      console.log('[mediasoup-client] Creating sendTransport for produce...');
      await this.createSendTransport();
    }
    console.log('[mediasoup-client] Producing', label, track.kind, 'on transport', this.sendTransport.id);

    // Не указываем codec — позволяем браузеру и mediasoup договориться
    if (track.kind === 'video') {
      const routerCodecs = this.device.rtpCapabilities.codecs;
      const videoCodecs = routerCodecs.filter(c => c.mimeType.startsWith('video') && !c.mimeType.includes('rtx'));
      console.log('[mediasoup-client] Available video codecs:', videoCodecs.map(c => `${c.mimeType}`));
    }

    try {
      const producer = await this.sendTransport.produce({
        track,
        appData: { label, ...appData },
        // Не указываем codec — пусть mediasoup-client сам выберет
        disableTrackOnPause: false,
        zeroRtpOnPause: true,
      });

      this.producers.set(label, producer);

      producer.on('transportclose', () => {
        this.producers.delete(label);
      });

      producer.on('trackended', () => {
        this.closeProducer(label);
      });

      console.log('[mediasoup-client] Produce SUCCESS, producerId:', producer.id);
      return producer;
    } catch (err) {
      console.error('[mediasoup-client] Produce FAILED:', err.message);
      // Пересоздаём transport при ошибке
      if (this.sendTransport) {
        this.sendTransport.close();
        this.sendTransport = null;
      }
      throw err;
    }
  }

  /**
   * Подписаться на producer другого участника
   */
  async consume(producerId, appData = {}) {
    // Используем очередь чтобы consume вызывались последовательно (не параллельно)
    const result = await (this._consumeQueue = this._consumeQueue.then(() => this._doConsume(producerId, appData)));
    return result;
  }

  async _doConsume(producerId, appData = {}) {
    if (!this.recvTransport) await this.createRecvTransport();

    const data = await this._request('ms-consume', {
      transportId: this.recvTransport.id,
      producerId,
    });

    const consumer = await this.recvTransport.consume({
      id: data.id,
      producerId: data.producerId,
      kind: data.kind,
      rtpParameters: data.rtpParameters,
    });

    // Resume на сервере
    await this._request('ms-resume-consumer', { consumerId: consumer.id });

    const stream = new MediaStream([consumer.track]);
    this.consumers.set(consumer.id, { consumer, stream, appData: data.appData || appData });

    consumer.on('transportclose', () => {
      this.consumers.delete(consumer.id);
      if (this.onConsumerClosed) this.onConsumerClosed(consumer.id);
    });

    consumer.on('trackended', () => {
      this.consumers.delete(consumer.id);
      if (this.onConsumerClosed) this.onConsumerClosed(consumer.id);
    });

    if (this.onNewConsumer) {
      this.onNewConsumer(consumer, stream, data.appData || appData);
    }

    return { consumer, stream };
  }

  async closeProducer(label) {
    const producer = this.producers.get(label);
    if (!producer) return;
    producer.close();
    this.producers.delete(label);
    this._emit('ms-close-producer', { producerId: producer.id });
  }

  async pauseProducer(label) {
    const producer = this.producers.get(label);
    if (!producer) return;
    await producer.pause();
    this._emit('ms-pause-producer', { producerId: producer.id });
  }

  async resumeProducer(label) {
    const producer = this.producers.get(label);
    if (!producer) return;
    await producer.resume();
    this._emit('ms-resume-producer', { producerId: producer.id });
  }

  /**
   * Получить список доступных producers в комнате
   */
  async getProducers() {
    return await this._request('ms-get-producers', {});
  }

  close() {
    // Закрываем все producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();

    // Закрываем все consumers
    for (const { consumer } of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

    // Закрываем транспорты
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    this.device = null;
  }

  // ── Вспомогательные методы ──────────────────────────────────

  _emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, { sessionId: this.sessionId, ...data });
    }
  }

  _request(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        return reject(new Error('Socket not connected'));
      }
      this.socket.emit(event, { sessionId: this.sessionId, ...data }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

export default MediasoupClient;
