import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');
    const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
    const registerSubmitBtn = registerForm.querySelector('button[type="submit"]');

    // Validation function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    // Tab switching functionality (existing code remains the same)
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if (tabName === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
            
            loginError.textContent = '';
            registerError.textContent = '';
        });
    });

    // Login form handling
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Reset previous errors
        loginError.textContent = '';
        
        // Validate inputs
        if (!email || !validateEmail(email)) {
            loginError.textContent = 'Please enter a valid email address.';
            return;
        }
        
        if (!password) {
            loginError.textContent = 'Please enter your password.';
            return;
        }
        
        try {
            // Disable submit button and show loading state
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.textContent = 'Logging in...';
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = error.message || 'Login failed. Please try again.';
        } finally {
            // Re-enable submit button
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = 'Login';
        }
    });

    // Registration form handling
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        
        // Reset previous errors
        registerError.textContent = '';
        
        // Validate inputs
        if (!name) {
            registerError.textContent = 'Please enter your full name.';
            return;
        }
        
        if (!email || !validateEmail(email)) {
            registerError.textContent = 'Please enter a valid email address.';
            return;
        }
        
        if (password.length < 6) {
            registerError.textContent = 'Password must be at least 6 characters long.';
            return;
        }
        
        try {
            // Disable submit button and show loading state
            registerSubmitBtn.disabled = true;
            registerSubmitBtn.textContent = 'Registering...';
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        initials: name.split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                    }
                }
            });

            if (error) throw error;

            if (data.user && data.user.identities && data.user.identities.length === 0) {
                registerError.textContent = 'This email is already registered. Please try logging in instead.';
                return;
            }

            registerError.style.color = 'var(--primary-green)';
            registerError.textContent = 'Success! Please check your email to confirm your account.';
            
            registerForm.reset();
            
        } catch (error) {
            console.error('Registration error:', error);
            registerError.textContent = error.message || 'Registration failed. Please try again.';
        } finally {
            // Re-enable submit button
            registerSubmitBtn.disabled = false;
            registerSubmitBtn.textContent = 'Register';
        }
    });

    // Check if user is already logged in
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            window.location.href = 'index.html';
        }
    };

    checkUser();
});