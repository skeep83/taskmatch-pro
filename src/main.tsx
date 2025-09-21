import * as React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { advancedErrorLogger } from './utils/advancedErrorLogger'

// Initialize advanced error logging
advancedErrorLogger;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
