import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeAmplify } from './lib/amplifyConfig';
import './index.css';

async function bootstrap() {
  const amplifyState = await initializeAmplify();

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App amplifyState={amplifyState} />
    </React.StrictMode>
  );
}

bootstrap();
