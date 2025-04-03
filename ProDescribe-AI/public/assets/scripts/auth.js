const AUTH_KEY = 'user_auth';
const USERS_KEY = 'registered_users';

const authService = {
    login(username, password) {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find(u => u.username === username && u.password === password);
        
        if (user) {
            const userData = {
                username: username,
                isAuthenticated: true,
                token: btoa(username + ':' + password),
                timestamp: new Date().getTime()
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
            return true;
        }
        return false;
    },

    signup(username, email, password) {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        
        // Check if username already exists
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'Username already exists' };
        }

        // Check if email already exists
        if (users.some(u => u.email === email)) {
            return { success: false, message: 'Email already exists' };
        }

        // Add new user
        users.push({ username, email, password });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        return { success: true, message: 'Registration successful' };
    },

    logout() {
        localStorage.removeItem(AUTH_KEY);
        window.location.href = '/';
    },

    isAuthenticated() {
        const auth = localStorage.getItem(AUTH_KEY);
        if (!auth) return false;
        return JSON.parse(auth).isAuthenticated;
    },

    checkAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/';
        }
    }
};

// Handle login form submission
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (authService.login(username, password)) {
            window.location.href = '/dashboard';
        } else {
            alert('Invalid credentials');
        }
    });
}

// Handle signup form submission
if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const result = authService.signup(username, email, password);
        if (result.success) {
            alert('Registration successful! Please sign in.');
            window.location.href = '/';
        } else {
            alert(result.message);
        }
    });
}

// Handle logout button
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        authService.logout();
    });
}

// Check authentication on dashboard
if (window.location.pathname === '/dashboard') {
    authService.checkAuth();
}