import React from 'react';

const Header = ({ title, subtitle, additionalInfo, onBack, backButtonText }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '20px', 
      paddingBottom: '15px', 
      borderBottom: '1px solid #ddd', 
      backgroundColor: 'white', 
      padding: '15px', 
      
    }}>
      <div>
        <h2 style={{ margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            {subtitle}
          </p>
        )}
        {additionalInfo && (
          <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '12px' }}>
            {additionalInfo}
          </p>
        )}
      </div>
      <button 
        onClick={onBack} 
        style={{ 
          padding: '10px 20px', 
          backgroundColor: '#6c757d', 
          color: 'white', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontWeight: 'bold' 
        }}
      >
        {backButtonText || 'Назад'}
      </button>
    </div>
  );
};

export default Header;