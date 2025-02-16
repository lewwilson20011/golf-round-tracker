import { supabase } from './supabase.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');

    // Tab switching functionality
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show/hide forms
            if (tabName === 'login') {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            }
            
            // Clear errors
            loginError.textContent = '';
            registerError.textContent = '';
        });
    });

    // Login form handling
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = error.message;
        }
    });

    // Registration form handling
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Register form submitted');
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        try {
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
            
            // Clear form
            registerForm.reset();
            
        } catch (error) {
            console.error('Registration error:', error);
            registerError.textContent = error.message;
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