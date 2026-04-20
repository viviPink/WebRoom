import React, { useEffect, useRef } from 'react';

const ScreenShare = ({ stream, title, backgroundColor = '#000', color = 'white', height = '400px' }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ 
      width: '100%', 
      height: height, 
      overflow: 'hidden', 
      marginBottom: '20px', 
      
    }}>
      <div style={{ 
        padding: '12px', 
        backgroundColor: backgroundColor, 
        color: color, 
        fontWeight: 'bold', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px' 
      }}>
        <span>{title}</span>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ 
          width: '100%', 
          height: `calc(100% - 40px)`, 
          objectFit: 'contain' 
        }}
      />
    </div>
  );
};

export default ScreenShare;