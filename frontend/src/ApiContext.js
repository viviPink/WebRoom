import React, { createContext, useContext, useState } from 'react';

export const LOCAL_URL = 'http://192.168.0.20:3001';
export const INTERNET_URL = 'https://dcaed71a-ca28-4e9a-a1a7-59444c3cf311.tunnel4.com';

const ApiContext = createContext(null);

export const ApiProvider = ({ children }) => {
  const [mode, setModeState] = useState(() => sessionStorage.getItem('connectionMode') || null);

  const setMode = (m) => {
    if (m) sessionStorage.setItem('connectionMode', m);
    else sessionStorage.removeItem('connectionMode');
    setModeState(m);
  };

  const apiUrl = mode === 'local' ? LOCAL_URL : INTERNET_URL;

  return (
    <ApiContext.Provider value={{ mode, setMode, apiUrl }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => useContext(ApiContext);