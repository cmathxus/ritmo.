import {startPwa} from './pwa-runtime';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import './interactions.css';
import './controls.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);

startPwa();

