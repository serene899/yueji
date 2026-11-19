import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 请求持久化存储，降低 Safari 清理本地数据的可能
if (navigator.storage?.persist) navigator.storage.persist().catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
