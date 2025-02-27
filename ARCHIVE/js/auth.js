// Simulated user database (in a real app, this would be on a server)
const users = [
    {
        email: 'lew.wilson@email.com',
        password: 'password123', // In reality, this would be hashed
        name: 'Lew Wilson',
        initials: 'LW'
    }
];

class Auth {
    constructor() {
        this.authenticated = false;
        this.currentUser = null;
        
        // Check if user is already logged in
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.authenticated = true;
        }
    }

    login(email, password) {
        return new Promise((resolve, reject) => {
            // Simulate API call delay
            setTimeout(() => {
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    this.authenticated = true;
                    this.currentUser = {
                        email: user.email,
                        name: user.name,
                        initials: user.initials
                    };
                    localStorage.setItem('user', JSON.stringify(this.currentUser));
                    resolve(this.currentUser);
                } else {
                    reject(new Error('Invalid email or password'));
                }
            }, 500);
        });
    }

    logout() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.authenticated = false;
                this.currentUser = null;
                localStorage.removeItem('user');
                resolve();
            }, 500);
        });
    }

    isAuthenticated() {
        return this.authenticated;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    register(email, password, name) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Check if user already exists
                if (users.some(u => u.email === email)) {
                    reject(new Error('Email already registered'));
                    return;
                }

                // Create new user
                const initials = name.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase();

                const newUser = {
                    email,
                    password, // In reality, this would be hashed
                    name,
                    initials
                };

                users.push(newUser);
                
                // Auto login after registration
                this.authenticated = true;
                this.currentUser = {
                    email: newUser.email,
                    name: newUser.name,
                    initials: newUser.initials
                };
                localStorage.setItem('user', JSON.stringify(this.currentUser));
                
                resolve(this.currentUser);
            }, 500);
        });
    }
}

// Create a single instance of Auth
const auth = new Auth();
export default auth;// JavaScript Document