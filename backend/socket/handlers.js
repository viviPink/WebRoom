const { v4: uuidv4 } = require('uuid');

let io = null;
let pool = null;

const activeConnections = new Map();
const sessionRooms = new Map();
const sessionParticipants = new Map();

const socketHandlers = {
  init(socketIo, databasePool) {
    io = socketIo;
    pool = databasePool;
    
    io.on('connection', (socket) => {
      console.log('WebSocket: Новое подключение:', socket.id);
      
      activeConnections.set(socket.id, {
        socketId: socket.id,
        connectedAt: new Date(),
        room: null,
        userType: null,
        userId: null,
        userName: null
      });

      socket.on('join_webinar', (data) => this.handleJoinWebinar(socket, data));
      socket.on('leave_webinar', (data) => this.handleLeaveWebinar(socket, data));
      socket.on('get_participants_list', (data) => this.handleGetParticipants(socket, data));
      socket.on('send_message', (data) => this.handleSendMessage(socket, data));
      socket.on('start_recording', (data) => this.handleStartRecording(socket, data));
      socket.on('stop_recording', (data) => this.handleStopRecording(socket, data));
      socket.on('student_activity', (data) => this.handleStudentActivity(socket, data));

      socket.on('teacher_start_screen_share', (data) => this.handleTeacherStartScreenShare(socket, data));
      socket.on('teacher_send_offer_to_students', (data) => this.handleTeacherSendOffer(socket, data));
      socket.on('teacher_request_student_screen', (data) => this.handleTeacherRequestStudentScreen(socket, data));
      socket.on('webrtc_offer', (data) => this.handleWebRTCOffer(socket, data));
      socket.on('webrtc_answer', (data) => this.handleWebRTCAnswer(socket, data));
      socket.on('webrtc_ice_candidate', (data) => this.handleWebRTCICECandidate(socket, data));
      socket.on('stop_screen_share', (data) => this.handleStopScreenShare(socket, data));

      socket.on('disconnect', (reason) => this.handleDisconnect(socket, reason));
      
      socket.on('error', (error) => {
        console.error('WebSocket ошибка у сокета', socket.id + ':', error);
      });
    });
    
    console.log('WebSocket обработчики инициализированы');
  },

  handleJoinWebinar(socket, data) {
    try {
      const { sessionId, userType, userId, userName } = data;
      
      if (!sessionId || !userType || !userId || !userName) {
        socket.emit('error', { message: 'Неполные данные для подключения' });
        return;
      }
      
      const roomName = `session_${sessionId}`;
      
      console.log('WebSocket: Пользователь', userName, '(' + userType + ', ID:' + userId + ') подключается к сессии', sessionId, 'комната:', roomName);
      
      if (!sessionParticipants.has(roomName)) {
        sessionParticipants.set(roomName, new Map());
        console.log('WebSocket: Создана новая комната:', roomName);
      }
      
      const participantsMap = sessionParticipants.get(roomName);
      
      let existingSocketId = null;
      for (const [sockId, participant] of participantsMap.entries()) {
        if (participant.userId == userId && participant.userType === userType) {
          existingSocketId = sockId;
          console.log('WebSocket: Найдено существующее подключение для', userName + ':', sockId);
          break;
        }
      }
      
      if (existingSocketId) {
        console.log('WebSocket: Отключаем предыдущее подключение:', existingSocketId);
        participantsMap.delete(existingSocketId);
        const oldSocket = io.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.leave(roomName);
          oldSocket.disconnect(true);
        }
        if (sessionRooms.has(roomName)) {
          sessionRooms.get(roomName).delete(existingSocketId);
        }
        activeConnections.delete(existingSocketId);
      }
      
      const participantData = {
        userType: userType,
        userId: userId,
        userName: userName,
        socketId: socket.id,
        joinedAt: new Date(),
        isReconnect: !!existingSocketId,
        sessionId: sessionId
      };
      
      participantsMap.set(socket.id, participantData);
      
      activeConnections.set(socket.id, {
        ...activeConnections.get(socket.id),
        ...participantData,
        room: roomName
      });
      
      socket.join(roomName);
      
      if (!sessionRooms.has(roomName)) {
        sessionRooms.set(roomName, new Set());
      }
      sessionRooms.get(roomName).add(socket.id);
      
      const roomParticipants = Array.from(participantsMap.values());
      console.log('WebSocket: Участники в комнате', roomName + ':', roomParticipants.map(p => p.userName + '(' + p.userType + ')'));
      
      io.to(roomName).emit('participants_list', {
        sessionId: sessionId,
        participants: roomParticipants,
        timestamp: new Date()
      });
      
      if (!existingSocketId) {
        socket.to(roomName).emit('user_joined', {
          userType: userType,
          userName: userName,
          userId: userId,
          socketId: socket.id,
          sessionId: sessionId,
          timestamp: new Date()
        });
        console.log('WebSocket: Уведомление о новом участнике', userName, 'отправлено в комнату', roomName);
      } else {
        console.log('WebSocket: Переподключение участника', userName, 'в комнату', roomName);
      }
      
      if (userType === 'teacher') {
        const students = roomParticipants.filter(p => p.userType === 'student');
        socket.emit('students_for_monitoring', {
          sessionId: sessionId,
          students: students,
          timestamp: new Date()
        });
        console.log('WebSocket: Преподавателю', userName, 'отправлен список студентов:', students.map(s => s.userName));
      }
      
      if (userType === 'student') {
        const teacher = roomParticipants.find(p => p.userType === 'teacher');
        if (teacher) {
          socket.emit('teacher_present', {
            teacherName: teacher.userName,
            teacherSocketId: teacher.socketId,
            sessionId: sessionId,
            timestamp: new Date()
          });
          console.log('WebSocket: Студенту', userName, 'отправлена информация о преподавателе', teacher.userName);
        } else {
          console.log('WebSocket: В комнате', roomName, 'нет преподавателя для студента', userName);
        }
      }
      
      socket.emit('join_confirmation', {
        success: true,
        sessionId: sessionId,
        room: roomName,
        participantsCount: roomParticipants.length,
        participants: roomParticipants,
        timestamp: new Date()
      });
      
      console.log('WebSocket: Подтверждение подключения отправлено пользователю', userName);
      
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке join_webinar:', err);
      socket.emit('error', { 
        message: 'Ошибка подключения к вебинару'
      });
    }
  },

  handleLeaveWebinar(socket, data) {
    try {
      const { sessionId } = data;
      const connectionInfo = activeConnections.get(socket.id);
      
      if (!connectionInfo) {
        console.log('WebSocket: Нет информации о подключении для сокета', socket.id);
        return;
      }
      
      const { userType, userName, room } = connectionInfo;
      const actualRoom = room || `session_${sessionId}`;
      
      console.log('WebSocket: Пользователь', userName, 'покидает вебинар, комната:', actualRoom);
      
      if (actualRoom && sessionRooms.has(actualRoom)) {
        sessionRooms.get(actualRoom).delete(socket.id);
        
        if (sessionParticipants.has(actualRoom)) {
          sessionParticipants.get(actualRoom).delete(socket.id);
          const participantsMap = sessionParticipants.get(actualRoom);
          const roomParticipants = Array.from(participantsMap.values());
          
          io.to(actualRoom).emit('participants_list', {
            sessionId: sessionId || actualRoom.replace('session_', ''),
            participants: roomParticipants,
            timestamp: new Date()
          });
          
          io.to(actualRoom).emit('user_left', {
            userType: userType,
            userName: userName,
            socketId: socket.id,
            sessionId: sessionId || actualRoom.replace('session_', ''),
            timestamp: new Date()
          });
          
          if (roomParticipants.length === 0) {
            sessionParticipants.delete(actualRoom);
            console.log('WebSocket: Комната', actualRoom, 'удалена, так как в ней не осталось участников');
          }
        }
      }
      
      activeConnections.delete(socket.id);
      console.log('WebSocket: Пользователь', userName, 'успешно удален из активных соединений');
      
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке leave_webinar:', err);
    }
  },

  handleDisconnect(socket, reason) {
    try {
      const connectionInfo = activeConnections.get(socket.id);
      
      if (connectionInfo) {
        const { userType, userName, room, sessionId } = connectionInfo;
        
        console.log('WebSocket: Отключение:', socket.id, 'пользователь:', userName, 'причина:', reason);
        
        if (room && sessionRooms.has(room)) {
          sessionRooms.get(room).delete(socket.id);
          
          if (sessionParticipants.has(room)) {
            sessionParticipants.get(room).delete(socket.id);
            const participantsMap = sessionParticipants.get(room);
            const roomParticipants = Array.from(participantsMap.values());
            
            io.to(room).emit('participants_list', {
              sessionId: sessionId || room.replace('session_', ''),
              participants: roomParticipants,
              timestamp: new Date()
            });
            
            io.to(room).emit('user_left', {
              userType: userType,
              userName: userName,
              socketId: socket.id,
              sessionId: sessionId || room.replace('session_', ''),
              timestamp: new Date(),
              reason: reason
            });
            
            if (roomParticipants.length === 0) {
              sessionParticipants.delete(room);
              console.log('WebSocket: Комната', room, 'удалена после отключения последнего участника');
            }
          }
        }
        
        activeConnections.delete(socket.id);
        
        if (userType === 'teacher' && room) {
          io.to(room).emit('teacher_disconnected', {
            teacherName: userName,
            sessionId: sessionId || room.replace('session_', ''),
            timestamp: new Date()
          });
          console.log('WebSocket: Уведомление об отключении преподавателя', userName, 'отправлено в комнату', room);
        }
        
        console.log('WebSocket: Пользователь', userName, 'полностью отключен');
      } else {
        console.log('WebSocket: Отключение неизвестного сокета:', socket.id);
      }
      
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке disconnect:', err);
    }
  },

  handleGetParticipants(socket, data) {
    try {
      const { sessionId } = data;
      
      if (!sessionId) {
        socket.emit('error', { message: 'ID сессии обязателен' });
        return;
      }
      
      const roomName = `session_${sessionId}`;
      
      if (sessionParticipants.has(roomName)) {
        const participantsMap = sessionParticipants.get(roomName);
        const roomParticipants = Array.from(participantsMap.values());
        
        socket.emit('participants_list', {
          sessionId: sessionId,
          participants: roomParticipants,
          timestamp: new Date()
        });
        
        console.log('WebSocket: Список участников сессии', sessionId, 'отправлен сокету', socket.id);
      } else {
        socket.emit('participants_list', {
          sessionId: sessionId,
          participants: [],
          timestamp: new Date()
        });
        console.log('WebSocket: Комната', roomName, 'не существует или пуста');
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке get_participants_list:', err);
      socket.emit('error', { message: 'Ошибка получения списка участников' });
    }
  },

  async handleSendMessage(socket, data) {
    try {
      const { sessionId, message, senderType, senderId, senderName } = data;
      
      if (!sessionId || !message || !senderType || !senderId || !senderName) {
        socket.emit('message_error', { error: 'Неполные данные сообщения' });
        return;
      }
      
      const timestamp = new Date();
      const roomName = `session_${sessionId}`;

      try {
        await pool.query(
          'INSERT INTO "Message" ("sessionId", "senderType", "senderId", text, "timestamp") VALUES ($1, $2, $3, $4, $5)',
          [sessionId, senderType, senderId, message, timestamp]
        );
        
        console.log('WebSocket: Сообщение от', senderName, 'сохранено в БД для сессии', sessionId);

        io.to(roomName).emit('new_message', {
          text: message,
          senderType: senderType,
          senderName: senderName,
          senderId: senderId,
          sessionId: sessionId,
          timestamp: timestamp
        });
        
        console.log('WebSocket: Сообщение от', senderName, 'отправлено в комнату', roomName);
        
      } catch (dbErr) {
        console.error('WebSocket: Ошибка сохранения сообщения в БД:', dbErr);
        socket.emit('message_error', { error: 'Не удалось сохранить сообщение в базе данных' });
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке send_message:', err);
      socket.emit('message_error', { error: 'Ошибка отправки сообщения' });
    }
  },

  handleStartRecording(socket, data) {
    try {
      const { sessionId, teacherId, teacherName } = data;
      
      if (!sessionId || !teacherId || !teacherName) {
        socket.emit('error', { message: 'Неполные данные для начала записи' });
        return;
      }
      
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('recording_started', {
        teacherId: teacherId,
        teacherName: teacherName,
        sessionId: sessionId,
        timestamp: new Date()
      });
      
      console.log('WebSocket: Начало записи сессии', sessionId, 'инициировано преподавателем', teacherName);
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке start_recording:', err);
      socket.emit('error', { message: 'Ошибка начала записи' });
    }
  },

  handleStopRecording(socket, data) {
    try {
      const { sessionId, teacherId, teacherName } = data;
      
      if (!sessionId || !teacherId || !teacherName) {
        socket.emit('error', { message: 'Неполные данные для окончания записи' });
        return;
      }
      
      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('recording_stopped', {
        teacherId: teacherId,
        teacherName: teacherName,
        sessionId: sessionId,
        timestamp: new Date()
      });
      
      console.log('WebSocket: Окончание записи сессии', sessionId, 'инициировано преподавателем', teacherName);
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке stop_recording:', err);
      socket.emit('error', { message: 'Ошибка окончания записи' });
    }
  },

  handleStudentActivity(socket, data) {
    try {
      const { sessionId, activity } = data;
      const studentInfo = activeConnections.get(socket.id);
      
      if (studentInfo && studentInfo.userType === 'student') {
        const roomName = `session_${sessionId}`;
        socket.to(roomName).emit('student_activity_update', {
          studentId: studentInfo.userId,
          studentName: studentInfo.userName,
          activity: activity,
          sessionId: sessionId,
          timestamp: new Date()
        });
        
        console.log('WebSocket: Активность студента', studentInfo.userName, 'отправлена в комнату', roomName + ':', activity);
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке student_activity:', err);
    }
  },

  handleTeacherStartScreenShare(socket, data) {
    try {
      const { sessionId, streamType = 'teacher_to_all' } = data;
      const teacherInfo = activeConnections.get(socket.id);
      
      if (!teacherInfo || teacherInfo.userType !== 'teacher') {
        socket.emit('error', { message: 'Только преподаватель может начать трансляцию' });
        return;
      }

      const roomName = `session_${sessionId}`;
      io.to(roomName).emit('teacher_screen_share_started', {
        teacherSocketId: socket.id,
        teacherName: teacherInfo.userName,
        sessionId: sessionId,
        timestamp: new Date(),
        streamType: streamType
      });
      
      console.log('WebSocket: Преподаватель', teacherInfo.userName, 'начал демонстрацию экрана в сессии', sessionId);
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке teacher_start_screen_share:', err);
      socket.emit('error', { message: 'Ошибка начала демонстрации экрана' });
    }
  },

  handleTeacherSendOffer(socket, data) {
    try {
      const { sessionId, studentSocketIds, sdp } = data;
      const teacherInfo = activeConnections.get(socket.id);
      
      if (!teacherInfo || teacherInfo.userType !== 'teacher') {
        socket.emit('error', { message: 'Только преподаватель может отправлять WebRTC офферы' });
        return;
      }

      studentSocketIds.forEach(studentSocketId => {
        const studentSocket = io.sockets.sockets.get(studentSocketId);
        if (studentSocket) {
          studentSocket.emit('teacher_webrtc_offer', {
            from: socket.id,
            sdp: sdp,
            streamType: 'teacher_to_all',
            sessionId: sessionId,
            teacherName: teacherInfo.userName,
            timestamp: new Date()
          });
          console.log('WebSocket: WebRTC оффер отправлен студенту', studentSocketId, 'от преподавателя', teacherInfo.userName);
        } else {
          console.log('WebSocket: Студент с socketId', studentSocketId, 'не найден');
        }
      });
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке teacher_send_offer_to_students:', err);
      socket.emit('error', { message: 'Ошибка отправки WebRTC оффера' });
    }
  },

  handleTeacherRequestStudentScreen(socket, data) {
    try {
      const { sessionId, studentSocketId } = data;
      const teacherInfo = activeConnections.get(socket.id);
      
      if (!teacherInfo || teacherInfo.userType !== 'teacher') {
        socket.emit('error', { message: 'Только преподаватель может запросить экран студента' });
        return;
      }

      const roomName = `session_${sessionId}`;
      const participantsMap = sessionParticipants.get(roomName);
      const studentInfo = participantsMap?.get(studentSocketId);
      
      if (!studentInfo || studentInfo.userType !== 'student') {
        socket.emit('error', { message: 'Студент не найден или не подключен' });
        return;
      }

      const studentSocket = io.sockets.sockets.get(studentSocketId);
      if (studentSocket) {
        const requestId = uuidv4().slice(0, 8);
        studentSocket.emit('teacher_requested_student_screen', {
          teacherSocketId: socket.id,
          teacherName: teacherInfo.userName,
          sessionId: sessionId,
          requestId: requestId,
          timestamp: new Date()
        });
        
        socket.emit('screen_request_sent', {
          studentSocketId: studentSocketId,
          studentName: studentInfo.userName,
          sessionId: sessionId,
          requestId: requestId,
          timestamp: new Date()
        });
        
        console.log('WebSocket: Запрос на демонстрацию экрана студента', studentInfo.userName, 'отправлен преподавателем', teacherInfo.userName);
      } else {
        socket.emit('error', { message: 'Студент не в сети' });
        console.log('WebSocket: Студент', studentSocketId, 'не в сети для запроса экрана');
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке teacher_request_student_screen:', err);
      socket.emit('error', { message: 'Ошибка запроса экрана студента' });
    }
  },

  handleWebRTCOffer(socket, data) {
    try {
      const { to, sdp, streamType, sessionId } = data;
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit('webrtc_offer', { 
          from: socket.id, 
          sdp: sdp, 
          streamType: streamType, 
          sessionId: sessionId,
          timestamp: new Date()
        });
        console.log('WebSocket: WebRTC оффер отправлен от', socket.id, 'к', to);
      } else {
        console.log('WebSocket: Целевой сокет', to, 'не найден для отправки WebRTC оффера');
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке webrtc_offer:', err);
    }
  },

  handleWebRTCAnswer(socket, data) {
    try {
      const { to, sdp } = data;
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit('webrtc_answer', { 
          from: socket.id, 
          sdp: sdp,
          timestamp: new Date()
        });
        console.log('WebSocket: WebRTC ответ отправлен от', socket.id, 'к', to);
      } else {
        console.log('WebSocket: Целевой сокет', to, 'не найден для отправки WebRTC ответа');
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке webrtc_answer:', err);
    }
  },

  handleWebRTCICECandidate(socket, data) {
    try {
      const { to, candidate } = data;
      const targetSocket = io.sockets.sockets.get(to);
      if (targetSocket) {
        targetSocket.emit('webrtc_ice_candidate', { 
          from: socket.id, 
          candidate: candidate,
          timestamp: new Date()
        });
        console.log('WebSocket: WebRTC ICE candidate отправлен от', socket.id, 'к', to);
      } else {
        console.log('WebSocket: Целевой сокет', to, 'не найден для отправки WebRTC ICE candidate');
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке webrtc_ice_candidate:', err);
    }
  },

  handleStopScreenShare(socket, data) {
    try {
      const { sessionId, streamType, targetSocketId, requestId } = data;
      const roomName = `session_${sessionId}`;
      
      if (streamType === 'teacher_to_all') {
        io.to(roomName).emit('teacher_screen_share_stopped', {
          teacherSocketId: socket.id,
          sessionId: sessionId,
          timestamp: new Date()
        });
        console.log('WebSocket: Преподаватель', socket.id, 'остановил демонстрацию экрана для всех в сессии', sessionId);
      } else if (streamType === 'student_to_teacher' && targetSocketId) {
        const teacherSocket = io.sockets.sockets.get(targetSocketId);
        if (teacherSocket) {
          teacherSocket.emit('student_screen_share_stopped', {
            studentSocketId: socket.id,
            sessionId: sessionId,
            requestId: requestId,
            timestamp: new Date()
          });
          console.log('WebSocket: Студент', socket.id, 'остановил демонстрацию экрана для преподавателя', targetSocketId);
        }
      } else if (streamType === 'student_screen_share') {
        const studentSocket = io.sockets.sockets.get(targetSocketId);
        if (studentSocket) {
          studentSocket.emit('teacher_stopped_watching', {
            teacherSocketId: socket.id,
            sessionId: sessionId,
            timestamp: new Date()
          });
          console.log('WebSocket: Преподаватель', socket.id, 'прекратил просмотр экрана студента', targetSocketId);
        }
      }
    } catch (err) {
      console.error('WebSocket: Ошибка при обработке stop_screen_share:', err);
      socket.emit('error', { message: 'Ошибка остановки демонстрации экрана' });
    }
  },

  getStats() {
    return {
      activeConnections: activeConnections.size,
      activeSessions: sessionParticipants.size,
      sessionParticipants: Object.fromEntries(
        Array.from(sessionParticipants.entries()).map(([room, participantsMap]) => {
          const roomParticipants = Array.from(participantsMap.values());
          const sessionId = room.replace('session_', '');
          return [sessionId, {
            sessionId: sessionId,
            total: roomParticipants.length,
            teachers: roomParticipants.filter(p => p.userType === 'teacher').length,
            students: roomParticipants.filter(p => p.userType === 'student').length,
            participants: roomParticipants.map(p => ({
              name: p.userName,
              type: p.userType,
              userId: p.userId,
              socketId: p.socketId,
              joinedAt: p.joinedAt,
              isReconnect: p.isReconnect
            }))
          }];
        })
      )
    };
  },

  getSessionInfo(sessionId) {
    try {
      const roomName = `session_${sessionId}`;
      
      if (sessionParticipants.has(roomName)) {
        const participantsMap = sessionParticipants.get(roomName);
        const roomParticipants = Array.from(participantsMap.values());
        
        return {
          sessionId: sessionId,
          isActive: true,
          roomName: roomName,
          participants: roomParticipants.length,
          teacherOnline: roomParticipants.some(p => p.userType === 'teacher'),
          teacherCount: roomParticipants.filter(p => p.userType === 'teacher').length,
          studentCount: roomParticipants.filter(p => p.userType === 'student').length,
          participantsList: roomParticipants.map(p => ({
            userName: p.userName,
            userType: p.userType,
            userId: p.userId,
            socketId: p.socketId,
            joinedAt: p.joinedAt,
            isReconnect: p.isReconnect
          }))
        };
      }
      
      return {
        sessionId: sessionId,
        isActive: false,
        roomName: roomName,
        participants: 0,
        teacherOnline: false,
        teacherCount: 0,
        studentCount: 0,
        participantsList: []
      };
    } catch (err) {
      console.error('WebSocket: Ошибка при получении информации о сессии:', err);
      return {
        sessionId: sessionId,
        isActive: false,
        error: 'Ошибка получения информации о сессии',
        participants: 0,
        teacherOnline: false
      };
    }
  },

  sendToSession(sessionId, event, data) {
    try {
      const roomName = `session_${sessionId}`;
      if (io) {
        io.to(roomName).emit(event, {
          ...data,
          sessionId: sessionId,
          timestamp: new Date()
        });
        console.log('WebSocket: Событие', event, 'отправлено в сессию', sessionId);
        return true;
      }
      return false;
    } catch (err) {
      console.error('WebSocket: Ошибка при отправке сообщения в сессию:', err);
      return false;
    }
  }
};

module.exports = socketHandlers;