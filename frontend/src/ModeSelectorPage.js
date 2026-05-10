import React, { useState, useEffect } from 'react';

const DEFAULT_PORT = '3002';

const ModeSelectorPage = ({ onContinue }) => {
  const [localIPs, setLocalIPs] = useState([]);
  const [ipAddress, setIpAddress] = useState('');
  const [isLoadingIPs, setIsLoadingIPs] = useState(true);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Получение всех IP-адресов компьютера
  useEffect(() => {
    const getLocalIPs = async () => {
      try {
        const ips = await getIPsViaWebRTC();
        
        if (ips.length > 0) {
          setLocalIPs(ips);
          // Восстанавливаем сохранённый IP, если он есть в списке
          const savedIP = sessionStorage.getItem('selectedLocalIP');
          if (savedIP && ips.includes(savedIP)) {
            setIpAddress(savedIP);
          } else if (ips[0]) {
            setIpAddress(ips[0]);
          }
        } else {
          setError('Не удалось автоматически определить IP-адреса. Введите IP вручную.');
        }
      } catch (err) {
        console.error('Error getting IPs:', err);
        setError('Ошибка получения IP-адресов. Введите IP вручную.');
      } finally {
        setIsLoadingIPs(false);
      }
    };

    getLocalIPs();
  }, []);

  // Функция получения IP через WebRTC
  const getIPsViaWebRTC = () => {
    return new Promise((resolve) => {
      const uniqueIPs = new Set();
      
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      pc.createDataChannel('');
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(() => {});
      
      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) {
          resolve(Array.from(uniqueIPs));
          pc.close();
          return;
        }
        
        const candidate = event.candidate.candidate;
        const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
        const match = candidate.match(ipRegex);
        
        if (match) {
          const ip = match[0];
          // Фильтруем: только локальные IP, исключаем служебные
          if (!uniqueIPs.has(ip) && 
              !ip.startsWith('0.') && 
              !ip.startsWith('127.') && 
              !ip.startsWith('169.254.') &&
              !ip.startsWith('255.') &&
              ip !== '0.0.0.0' &&
              (ip.startsWith('10.') || 
               ip.startsWith('172.16.') || 
               ip.startsWith('172.17.') || 
               ip.startsWith('172.18.') || 
               ip.startsWith('172.19.') || 
               ip.startsWith('172.20.') || 
               ip.startsWith('172.21.') || 
               ip.startsWith('172.22.') || 
               ip.startsWith('172.23.') || 
               ip.startsWith('172.24.') || 
               ip.startsWith('172.25.') || 
               ip.startsWith('172.26.') || 
               ip.startsWith('172.27.') || 
               ip.startsWith('172.28.') || 
               ip.startsWith('172.29.') || 
               ip.startsWith('172.30.') || 
               ip.startsWith('172.31.') || 
               ip.startsWith('192.168.'))) {
            uniqueIPs.add(ip);
          }
        }
      };
      
      setTimeout(() => {
        if (uniqueIPs.size === 0) {
          resolve([]);
        } else {
          resolve(Array.from(uniqueIPs));
        }
        pc.close();
      }, 3000);
    });
  };

  const handleLocal = () => {
    const ipToUse = ipAddress.trim();
    
    if (!ipToUse) {
      setError('Пожалуйста, введите IP-адрес');
      return;
    }
    
    // Простая валидация IP
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    if (!ipRegex.test(ipToUse)) {
      setError('Введите корректный IP-адрес (например, 192.168.1.100)');
      return;
    }
    
    const localUrl = `https://${ipToUse}:${DEFAULT_PORT}`;
    sessionStorage.setItem('selectedLocalIP', ipToUse);
    window.location.href = localUrl;
  };

  const handleInternet = () => {
    if (onContinue) onContinue();
  };

  const handleIpChange = (e) => {
    setIpAddress(e.target.value);
    setError('');
    setShowDropdown(false);
  };

  const selectIpFromList = (ip) => {
    setIpAddress(ip);
    setShowDropdown(false);
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f5ff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          ВебРум
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', margin: '0 0 32px 0' }}>
          Выберите режим подключения
        </p>

        <div
          style={{
            width: '100',
            padding: '20px 24px',
            marginBottom: '24px',
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            textAlign: 'left',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: '#dbeafe', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '24px', flexShrink: 0
            }}>
              
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                Локальная сеть (аудитория)
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.4' }}>
                Вы подключены к локальной сети университета (Wi-Fi или провод)
              </div>
            </div>
          </div>
          
          {/* Поле ввода IP с выпадающим списком */}
          <div style={{ position: 'relative' }}>
            <label style={{ 
              fontSize: '12px', 
              color: '#4B5563', 
              display: 'block', 
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              IP-адрес сервера:
            </label>
            
            {isLoadingIPs ? (
              <div style={{ 
                padding: '10px', 
                background: '#F9FAFB', 
                borderRadius: '10px',
                fontSize: '13px',
                color: '#6B7280',
                textAlign: 'center'
              }}>
                Определение IP-адресов...
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Введите IP-адрес сервера"
                    value={ipAddress}
                    onChange={handleIpChange}
                    onFocus={() => localIPs.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '10px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                    onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
                  />
                  
                  {/* Выпадающий список с найденными IP */}
                  {showDropdown && localIPs.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginTop: '4px',
                      zIndex: 10,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {localIPs.map((ip, idx) => (
                        <div
                          key={idx}
                          onClick={() => selectIpFromList(ip)}
                          style={{
                            padding: '10px 12px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            borderBottom: idx < localIPs.length - 1 ? '1px solid #F3F4F6' : 'none',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                        >
                          {ip}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {localIPs.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                    Нажмите на поле для выбора из найденных IP
                  </div>
                )}
              </>
            )}
            
            {error && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#EF4444',
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}
            
            <button
              onClick={handleLocal}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px 20px',
                background: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1D4ED8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563EB'}
            >
              Подключиться к локальному серверу
            </button>
            
            <div style={{ 
              marginTop: '12px', 
              fontSize: '11px', 
              color: '#9CA3AF',
              textAlign: 'left',
              borderTop: '1px solid #F3F4F6',
              paddingTop: '10px'
            }}>
               Будет открыто: <strong>https://{ipAddress || 'IP'}:{DEFAULT_PORT}</strong>
            </div>
          </div>
        </div>

        <button
          onClick={handleInternet}
          style={{
            width: '100%',
            padding: '20px 24px',
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: '16px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#7B61FF';
            e.currentTarget.style.background = '#f5f3ff';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.background = '#fff';
          }}
        >
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: '#ede9fe', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '24px', flexShrink: 0
          }}>
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
              Интернет (из дома)
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.4' }}>
              Вы подключаетесь удалённо через интернет
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ModeSelectorPage;