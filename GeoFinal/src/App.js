import React, { useState, useEffect } from 'react';
import './styles.css';

const API_BASE = (process.env.REACT_APP_API_BASE ?? '').trim() || (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Login form state (use email as the identifier)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const showMsg = (text, type) => {
    setMessage(text);
    setMessageType(type);
  };

  const clearMsg = () => {
    setMessage('');
    setMessageType('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMsg();

    // Basic email validation
    if (!email || !email.includes('@')) {
      showMsg('Introduce un correo válido (debe contener @)', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Backend expects username field — send email as username
        body: JSON.stringify({ username: email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showMsg(data.message || 'Error al ingresar', 'error');
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(data.data));
      showMsg('Proceso de autenticación finalizado. Redireccionamiento en curso...', 'success');
      setTimeout(() => window.location.href = 'world.html', 1000);
    } catch (error) {
      showMsg('No conecto al servidor', 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    clearMsg();


    // Basic email validation for registration
    if (!newEmail || !newEmail.includes('@')) {
      showMsg('Introduce un correo válido para registrarte (debe contener @)', 'error');
      return;
    }

    try {
      // Verificar si el usuario ya existe
      const response = await fetch(`${API_BASE}/user`);
      const users = await response.json();

      const userExists = users.find(u => u.username === newEmail);
      if (userExists) {
        showMsg('Credenciales ya existentes', 'error');
        return;
      }

      // Crear nuevo usuario
      const newUser = { username: newEmail, password: newPassword };
      const createResponse = await fetch(`${API_BASE}/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      });

      if (createResponse.ok) {
        showMsg('La cuenta ha sido creada correctamente, redirigiendo...', 'success');
        setNewEmail('');
        setNewPassword('');
        setTimeout(() => setShowLogin(true), 1500);
      } else {
        showMsg('Creación de usuario fallida', 'error');
      }
    } catch (error) {
      showMsg('Error al conectar con el servidor', 'error');
    }
  };

  // Verificar si ya hay un usuario logueado
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      window.location.href = 'world.html';
    }
  }, []);

  return (
    <div className="login-container">
      <h1>  ExploraGeo</h1>
      
      <div className="form-section">
        {showLogin ? (
          <>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Correo:</label>
                <input
                  type="email"
                  id="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Contraseña:</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="button-row">
                <button type="submit" className="btn btn-primary">Iniciar Sesión</button>
                <button type="button" onClick={() => { setShowLogin(false); clearMsg(); }} className="btn btn-secondary">
                  Crear Nueva Cuenta
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="newEmail">Correo:</label>
                <input
                  type="email"
                  id="newEmail"
                  placeholder="correo@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">Nueva Contraseña:</label>
                <input
                  type="password"
                  id="newPassword"
                  placeholder="Elige una contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="button-row">
                <button type="submit" className="btn btn-primary">Registrar</button>
                <button type="button" onClick={() => { setShowLogin(true); clearMsg(); }} className="btn btn-secondary btn-inline">
                  Volver al Login
                </button>
              </div>
            </form>
          </>
        )}

        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
