import React, { createContext, useContext, useState } from 'react';

export const LOCAL_URL = 'http://10.78.167.190:3001';
export const INTERNET_URL = 'https://4d46289f-50f4-4151-9e9f-4860ddd78a36.tunnel4.com';

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