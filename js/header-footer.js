// Import the supabase client
import { supabase } from './supabase.js';

// Initialize header and footer
async function initializeHeaderFooter() {
    try {
        // Check if this is the login page by checking for login-header class
        const isLoginPage = document.querySelector('.login-header');
        if (isLoginPage) {
            // Don't initialize user section on login page
            console.log('Login page detected, skipping user section initialization');
            return;
        }

        // Check if user is authenticated
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth error:', error);
            renderUnauthenticatedHeader();
            return;
        }
        
        if (user) {
            renderAuthenticatedHeader(user);
        } else {
            renderUnauthenticatedHeader();
        }
        
        // Setup menu functionality
        setupHeaderMenu();
        
    } catch (error) {
        console.error('Header initialization error:', error);
        renderUnauthenticatedHeader();
    }
}

// Render header for authenticated users
function renderAuthenticatedHeader(user) {
    const userSection = document.getElementById('userSection');
    if (!userSection) return;
    
    const initials = user.user_metadata?.initials || user.email?.substring(0, 2).toUpperCase();
    const fullName = user.user_metadata?.full_name || user.email;
    
    userSection.innerHTML = `
        <div class="user-avatar" id="userInitials">${initials}</div>
        <div class="user-info">
            <div class="user-name" id="userName">${fullName}</div>
            <div class="user-email" id="userEmail">${user.email}</div>
        </div>
        <button class="menu-button">
            <i class="fa-solid fa-bars"></i>
        </button>
        <div class="menu-dropdown">
            <a href="profile-settings.html" class="menu-item">
                <i class="fa-solid fa-user"></i> Profile Settings
            </a>
            <a href="app-settings.html" class="menu-item">
                <i class="fa-solid fa-gear"></i> App Settings
            </a>
            <div class="menu-divider"></div>
            <a href="#" class="menu-item" id="signOut">
                <i class="fa-solid fa-right-from-bracket"></i> Sign Out
            </a>
        </div>
    `;
    
    // Add sign out functionality
    const signOutButton = document.getElementById('signOut');
    if (signOutButton) {
        signOutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Sign out error:', error);
                alert(`Error signing out: ${error.message}`);
            }
        });
    }
}

// Render header for unauthenticated users
function renderUnauthenticatedHeader() {
    const userSection = document.getElementById('userSection');
    if (!userSection) return;
    
    userSection.innerHTML = `
        <div class="auth-links">
            <a href="login.html" class="auth-link">Login</a>
            <a href="login.html#register" class="auth-link register-link">Register</a>
        </div>
    `;
}

// Setup header menu functionality
function setupHeaderMenu() {
    const menuButton = document.querySelector('.menu-button');
    const menuDropdown = document.querySelector('.menu-dropdown');
    
    if (menuButton && menuDropdown) {
        console.log('Menu button and dropdown found, setting up event listeners');
        
        // Toggle menu when button is clicked
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Menu button clicked');
            
            menuDropdown.classList.toggle('show');
            
            // Force display with inline style for extra reliability
            if (menuDropdown.classList.contains('show')) {
                menuDropdown.style.display = 'block';
                console.log('Menu is now visible');
            } else {
                menuDropdown.style.display = '';
                console.log('Menu is now hidden');
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menuDropdown.classList.contains('show')) {
                if (!menuDropdown.contains(e.target) && !menuButton.contains(e.target)) {
                    menuDropdown.classList.remove('show');
                    menuDropdown.style.display = '';
                    console.log('Clicked outside menu, hiding dropdown');
                }
            }
        });
        
        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuDropdown.classList.contains('show')) {
                menuDropdown.classList.remove('show');
                menuDropdown.style.display = '';
                console.log('Escape key pressed, hiding dropdown');
            }
        });
    } else {
        console.error('Menu dropdown elements not found:', { 
            menuButton: menuButton ? 'Found' : 'Not found', 
            menuDropdown: menuDropdown ? 'Found' : 'Not found' 
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing header-footer');
    initializeHeaderFooter();
    
    // Additional direct dropdown fix
    setTimeout(() => {
        const menuBtn = document.querySelector('.menu-button');
        const menuDropdown = document.querySelector('.menu-dropdown');
        
        if (menuBtn && menuDropdown) {
            console.log('Adding additional direct dropdown handler');
            
            menuBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle directly with style property
                if (menuDropdown.style.display === 'block') {
                    menuDropdown.style.display = 'none';
                    menuDropdown.classList.remove('show');
                } else {
                    menuDropdown.style.display = 'block';
                    menuDropdown.classList.add('show');
                }
                
                console.log('Direct dropdown toggle, current display:', menuDropdown.style.display);
            });
        }
    }, 500); // Small delay to ensure it runs after the initial setup
});

// Export for direct inclusion in HTML
export { initializeHeaderFooter };