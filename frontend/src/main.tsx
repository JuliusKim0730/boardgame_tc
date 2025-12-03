import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Storage 접근 에러 무시 (Vercel 등 일부 환경에서 발생)
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('storage is not allowed')) {
    event.preventDefault();
    console.warn('Storage access blocked - this is expected in some environments');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
