import React, { useRef, useEffect } from 'react';

const Chat = ({ 
  messages, 
  newMessage, 
  setNewMessage, 
  sendMessage, 
  disabled, 
  placeholder = "Введите сообщение", 
  currentUserId, 
  currentUserType,
  currentUserName = ''
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Функция для проверки, упомянут ли текущий пользователь
  const isUserMentioned = (messageText) => {
    if (!currentUserName) return false;
    const escapedName = currentUserName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`@${escapedName}`, 'i').test(messageText);
  };

  // Функция для подсветки упоминаний в сообщении
  const renderMessageWithMentions = (text) => {
    const parts = text.split(/(@[\wа-яА-ЯёЁ]+)/gi);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span 
            key={index} 
            style={{ 
              color: '#2563EB', 
              fontWeight: 'bold', 
              backgroundColor: '#EFF6FF', 
              padding: '2px 4px', 
              borderRadius: '4px',
              marginLeft: '2px'
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <>
      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Чат вебинара</h4>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        marginBottom: '15px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        maxHeight: '400px',
        border: '1px solid #e9ecef'
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px', opacity: 0.3 }}>💬</div>
            <div>Начните общение в чате</div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMentioned = currentUserType === 'student' && isUserMentioned(msg.text);
            
            return (
              <div
                key={`msg-${index}-${msg.timestamp}`}
                style={{
                  marginBottom: '12px',
                  padding: '10px',
                  backgroundColor: isMentioned ? '#EFF6FF' : 'white',
                  borderLeft: isMentioned ? '3px solid #2563EB' : 'none',
                  borderRadius: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '14px', 
                    color: msg.senderType === 'teacher' ? '#2563EB' : '#111827' 
                  }}>
                    {msg.senderName}
                    {msg.senderType === 'teacher' && (
                      <span style={{ 
                        marginLeft: '8px', 
                        fontSize: '11px', 
                        backgroundColor: '#2563EB', 
                        color: 'white', 
                        padding: '2px 6px', 
                        borderRadius: '12px' 
                      }}>
                        Преподаватель
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#666',
                    marginLeft: 'auto',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                  {renderMessageWithMentions(msg.text)}
                </div>
                {isMentioned && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '11px', 
                    color: '#2563EB',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    Вас упомянули в этом сообщении
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={disabled}
          style={{
            padding: '12px 20px',
            backgroundColor: '#030303',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            minWidth: '100px',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          Отправить
        </button>
      </div>
      
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
        Чтобы отметить студента, напишите @ и имя (например: @Иван Петров)
      </div>
    </>
  );
};

export default Chat;