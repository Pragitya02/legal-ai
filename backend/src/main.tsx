import React from 'react'
import { GoogleOAuthProvider } from "@react-oauth/google";
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId="2263136092-s5bd1pkm8pdhacgpbpdj36cstltna55l.apps.googleusercontent.com"
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
