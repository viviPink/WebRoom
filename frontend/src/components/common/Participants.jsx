import React from 'react';

const Participants = ({ participants }) => {
  return (
    <div style={{ 
      padding: '20px', 
      borderBottom: '1px solid #eee', 
      maxHeight: '200px', 
      overflowY: 'auto', 
      backgroundColor: '#fafafa' 
    }}>
      <h4 style={{ 
        margin: '0 0 15px 0', 
        color: '#333', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px' 
      }}>
        Участники
        <span style={{ 
          backgroundColor: '#6c757d', 
          color: 'white', 
          padding: '2px 8px', 
          fontSize: '12px' 
        }}>
          {participants.length}
        </span>
      </h4>
      <div style={{ marginTop: '10px' }}>
        {participants.map((participant) => (
          <div 
            key={`${participant.userType}-${participant.userId}-${participant.socketId}`} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '10px', 
              marginBottom: '6px', 
              backgroundColor:'#f8f9fa', 
              
            }}
          >
            <div style={{ 
              width: '8px', 
              height: '8px', 
              backgroundColor: '#080808', 
              borderRadius: '50%', 
              marginRight: '12px' 
            }}></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                {participant.userName}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {participant.userType === 'teacher' ? 'Преподаватель' : 'Студент'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Participants;