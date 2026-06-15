/**
 * mediasoupManager.js — SFU-менеджер для вебинаров
 * Управляет Worker, Router, Transport, Producer, Consumer
 */
const mediasoup = require('mediasoup');

// Конфигурация mediasoup
const config = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {},
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 0,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
        },
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      { ip: '0.0.0.0', announcedIp: null }, // будет заменено на реальный IP
    ],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000,
  },
};

class MediasoupManager {
  constructor() {
    this.workers = [];
    this.nextWorkerIdx = 0;
    this.rooms = new Map(); // sessionId -> Room
  }

  async init(announcedIp) {
    if (announcedIp) {
      config.webRtcTransport.listenIps[0].announcedIp = announcedIp;
    }

    const numWorkers = Math.min(require('os').cpus().length, 2);
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker(config.worker);
      worker.on('died', () => {
        console.error('mediasoup Worker died, exiting...');
        setTimeout(() => process.exit(1), 2000);
      });
      this.workers.push(worker);
      console.log(`mediasoup Worker ${i} created [pid:${worker.pid}]`);
    }
  }

  getNextWorker() {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  async getOrCreateRoom(sessionId) {
    // Нормализуем sessionId в строку
    const key = String(sessionId);
    if (this.rooms.has(key)) return this.rooms.get(key);

    const worker = this.getNextWorker();
    const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });

    const room = {
      router,
      peers: new Map(), // socketId -> Peer
    };
    this.rooms.set(key, room);
    console.log(`Room created for session ${key}`);
    return room;
  }

  async createWebRtcTransport(sessionId, socketId, direction) {
    const room = await this.getOrCreateRoom(sessionId);
    const transport = await room.router.createWebRtcTransport(config.webRtcTransport);

    // Сохраняем транспорт в peer
    if (!room.peers.has(socketId)) {
      room.peers.set(socketId, { transports: new Map(), producers: new Map(), consumers: new Map(), role: null });
    }
    const peer = room.peers.get(socketId);
    peer.transports.set(transport.id, transport);

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(sessionId, socketId, transportId, dtlsParameters) {
    const room = this.rooms.get(String(sessionId));
    if (!room) throw new Error('Room not found');
    const peer = room.peers.get(socketId);
    if (!peer) throw new Error('Peer not found');
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');
    await transport.connect({ dtlsParameters });
  }

  async produce(sessionId, socketId, transportId, kind, rtpParameters, appData = {}) {
    const room = this.rooms.get(String(sessionId));
    if (!room) throw new Error('Room not found');
    const peer = room.peers.get(socketId);
    if (!peer) throw new Error('Peer not found');
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    const producer = await transport.produce({ kind, rtpParameters, appData });
    peer.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      producer.close();
      peer.producers.delete(producer.id);
    });

    return { id: producer.id };
  }

  async consume(sessionId, socketId, transportId, producerId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) throw new Error('Room not found');
    const peer = room.peers.get(socketId);
    if (!peer) throw new Error('Peer not found');
    const transport = peer.transports.get(transportId);
    if (!transport) throw new Error('Transport not found');

    if (!room.router.canConsume({ producerId, rtpCapabilities: peer.rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    // Находим producer чтобы получить его appData
    let producerAppData = {};
    for (const [, otherPeer] of room.peers) {
      const producer = otherPeer.producers.get(producerId);
      if (producer) {
        producerAppData = producer.appData || {};
        break;
      }
    }

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: peer.rtpCapabilities,
      paused: true,
      appData: producerAppData, // передаём appData producer'а
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      consumer.close();
      peer.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: producerAppData, // возвращаем appData producer'а
    };
  }

  async resumeConsumer(sessionId, socketId, consumerId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    const peer = room.peers.get(socketId);
    if (!peer) return;
    const consumer = peer.consumers.get(consumerId);
    if (consumer) await consumer.resume();
  }

  async pauseProducer(sessionId, socketId, producerId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    const peer = room.peers.get(socketId);
    if (!peer) return;
    const producer = peer.producers.get(producerId);
    if (producer) await producer.pause();
  }

  async resumeProducer(sessionId, socketId, producerId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    const peer = room.peers.get(socketId);
    if (!peer) return;
    const producer = peer.producers.get(producerId);
    if (producer) await producer.resume();
  }

  async closeProducer(sessionId, socketId, producerId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    const peer = room.peers.get(socketId);
    if (!peer) return;
    const producer = peer.producers.get(producerId);
    if (producer) {
      producer.close();
      peer.producers.delete(producerId);
    }
  }

  getRouterRtpCapabilities(sessionId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return null;
    return room.router.rtpCapabilities;
  }

  setRtpCapabilities(sessionId, socketId, rtpCapabilities) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    if (!room.peers.has(socketId)) {
      room.peers.set(socketId, { transports: new Map(), producers: new Map(), consumers: new Map(), role: null });
    }
    room.peers.get(socketId).rtpCapabilities = rtpCapabilities;
  }

  getProducers(sessionId, excludeSocketId = null) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return [];
    const producers = [];
    for (const [socketId, peer] of room.peers) {
      if (socketId === excludeSocketId) continue;
      for (const [producerId, producer] of peer.producers) {
        producers.push({
          producerId,
          socketId,
          kind: producer.kind,
          appData: producer.appData,
        });
      }
    }
    return producers;
  }

  removePeer(sessionId, socketId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    const peer = room.peers.get(socketId);
    if (!peer) return;

    // Закрываем все транспорты (это закроет producers и consumers)
    for (const transport of peer.transports.values()) {
      transport.close();
    }
    room.peers.delete(socketId);

    // НЕ закрываем комнату при пустоте — она будет переиспользована при переподключении
    // Комната закрывается только при завершении сессии через closeRoom()
    if (room.peers.size === 0) {
      console.log(`Room ${sessionId} is empty but kept alive for reconnections`);
    }
  }

  closeRoom(sessionId) {
    const room = this.rooms.get(String(sessionId));
    if (!room) return;
    room.router.close();
    this.rooms.delete(sessionId);
    console.log(`Room ${sessionId} force-closed`);
  }
}

module.exports = new MediasoupManager();
