const API_BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3001' : '';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const messageDiv = document.getElementById('message');

    // Mostrar formulario de registro
    showRegister.addEventListener('click', function() {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        showRegister.style.display = 'none';
        clearMessage();
    });

    // Mostrar formulario de login
    showLogin.addEventListener('click', function() {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        showRegister.style.display = 'block';
        clearMessage();
    });

    // Login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE}/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                showMessage(data.message, 'error');
                return;
            }

            localStorage.setItem('currentUser', JSON.stringify(data.data));
            console.log(data.data);
            showMessage('Login exitoso! Redirigiendo...', 'success');
            setTimeout(() => window.location.href = 'world.html', 1000);

        } catch (error) {
            showMessage('Error al conectar con el servidor', 'error');
        }
    });

    // Registro
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        try {
            // Verificar si el usuario ya existe
            const response = await fetch(`${API_BASE}/user`);
            const users = await response.json();
            
            const userExists = users.find(u => u.username === username);
            if (userExists) {
                showMessage('El usuario ya existe', 'error');
                return;
            }

            // Crear nuevo usuario
            const newUser = { username, password };
            const createResponse = await fetch(`${API_BASE}/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser)
            });

            if (createResponse.ok) {
                showMessage('Usuario creado exitosamente! Ahora puedes iniciar sesión.', 'success');
                registerForm.reset();
                showLogin.click();
            } else {
                showMessage('Error al crear el usuario', 'error');
            }
        } catch (error) {
            showMessage('Error al conectar con el servidor', 'error');
        }
    });

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
    }

    function clearMessage() {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
    }

    // Verificar si ya hay un usuario logueado
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        window.location.href = 'world.html';
    }
});