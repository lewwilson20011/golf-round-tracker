// Modified header-footer.js

// We'll use a dynamic import to avoid parsing errors
let supabase, signOut;

// Function to dynamically import the supabase module
async function importSupabase() {
    try {
        const module = await import('./supabase.js');
        supabase = module.supabase;
        signOut = module.signOut;
        return true;
    } catch (error) {
        console.error('Failed to import supabase module:', error);
        return false;
    }
}

// Load HTML components into elements with data-include attribute
async function loadIncludes() {
    const includeElements = document.querySelectorAll('[data-include]');
    
    for (const element of includeElements) {
        const filePath = element.getAttribute('data-include');
        
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
            }
            
            const html = await response.text();
            element.innerHTML = html;
            
            // Execute any scripts in the included content
            const scripts = element.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Copy all attributes
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                
                // Copy the content
                newScript.textContent = oldScript.textContent;
                
                // Replace the old script with the new one
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            
            console.log(`Successfully loaded ${filePath}`);
        } catch (error) {
            console.error(`Error loading include: ${error.message}`);
            element.innerHTML = `<div class="error-message">Error loading component</div>`;
        }
    }
}

// Initialize header and footer
async function initializeHeaderFooter() {
    try {
        // First load any includes
        await loadIncludes();
        
        // Check if this is the login page by checking for login-header class
        const isLoginPage = document.querySelector('.login-header');
        if (isLoginPage) {
            // Handle login page specific behavior
            handleLoginPageInit();
            return;
        }
        
        // Then try to import supabase for other pages
        const supabaseLoaded = await importSupabase();
        
        if (!supabaseLoaded) {
            console.warn('Could not load supabase module, auth functionality unavailable');
            setupHeaderMenu(); // Still set up the menu even without auth
            return;
        }
        
        // Check if user is authenticated
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                console.error('Auth error:', error);
                renderUnauthenticatedHeader();
            } else if (user) {
                renderAuthenticatedHeader(user);
            } else {
                renderUnauthenticatedHeader();
            }
        } catch (authError) {
            console.error('Authentication check failed:', authError);
            renderUnauthenticatedHeader();
        }

        // Setup menu functionality - moved outside the auth check to ensure it runs
        setupHeaderMenu();
        
        // Set active nav link
        setActiveNavLink();

    } catch (error) {
        console.error('Header initialization error:', error);
        // Still try to set up the menu even if there was an error
        setupHeaderMenu();
    }
}

// Handle login page specific behavior
function handleLoginPageInit() {
    console.log('Setting up login page specific behavior');
    
    // Check URL hash to determine which tab to show
    const hash = window.location.hash;
    if (hash === '#register') {
        // Show register tab
        const registerTab = document.querySelector('.login-tab[data-tab="register"]');
        if (registerTab) {
            registerTab.click();
        }
    } else {
        // Ensure login tab is active by default
        const loginTab = document.querySelector('.login-tab[data-tab="login"]');
        if (loginTab) {
            loginTab.click();
        }
    }
    
    // Handle tab navigation in login/register dropdown
    const loginTabTriggers = document.querySelectorAll('.login-tab-trigger');
    if (loginTabTriggers.length > 0) {
        loginTabTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = trigger.getAttribute('data-tab');
                
                // Find and click the corresponding tab
                const tab = document.querySelector(`.login-tab[data-tab="${tabName}"]`);
                if (tab) {
                    tab.click();
                }
                
                // Hide the dropdown
                const dropdown = document.getElementById('menuDropdown');
                if (dropdown) {
                    dropdown.style.display = 'none';
                }
            });
        });
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
        <div class="menu-dropdown" id="menuDropdown">
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
            console.log('Sign out button clicked from header');
            if (typeof signOut === 'function') {
                await signOut();
            } else {
                console.error('signOut function not available');
                // Fallback to redirect to login page
                window.location.href = 'login.html';
            }
        });
    }
    
    // Set up the menu again after rendering the authenticated header
    setupHeaderMenu();
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
    console.log('Setting up header menu functionality');
    
    // Select by classes and IDs for better reliability
    const menuButton = document.querySelector('.menu-button');
    const menuDropdown = document.querySelector('.menu-dropdown') || document.getElementById('menuDropdown');

    if (menuButton && menuDropdown) {
        console.log('Menu button and dropdown found, setting up event listeners');

        // Remove any existing click handlers to prevent duplicates
        const newMenuButton = menuButton.cloneNode(true);
        menuButton.parentNode.replaceChild(newMenuButton, menuButton);
        
        // Toggle menu when button is clicked
        newMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Menu button clicked');

            // Toggle dropdown visibility with both className and style
            if (menuDropdown.style.display === 'block') {
                menuDropdown.style.display = 'none';
                menuDropdown.classList.remove('show');
                console.log('Menu is now hidden');
            } else {
                menuDropdown.style.display = 'block';
                menuDropdown.classList.add('show');
                console.log('Menu is now visible');
                
                // Position the dropdown
                positionDropdownMenu();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menuDropdown.style.display === 'block') {
                if (!menuDropdown.contains(e.target) && !newMenuButton.contains(e.target)) {
                    menuDropdown.style.display = 'none';
                    menuDropdown.classList.remove('show');
                    console.log('Clicked outside menu, hiding dropdown');
                }
            }
        });

        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuDropdown.style.display === 'block') {
                menuDropdown.style.display = 'none';
                menuDropdown.classList.remove('show');
                console.log('Escape key pressed, hiding dropdown');
            }
        });
        
        // Ensure the dropdown is initially hidden
        menuDropdown.style.display = 'none';
        menuDropdown.classList.remove('show');
    } else {
        console.warn('Menu dropdown elements not found:', {
            menuButton: menuButton ? 'Found' : 'Not found',
            menuDropdown: menuDropdown ? 'Found' : 'Not found'
        });
    }
}

// Improved dropdown positioning
function positionDropdownMenu() {
    const menuDropdown = document.querySelector('.menu-dropdown') || document.getElementById('menuDropdown');
    
    if (!menuDropdown) {
        console.warn('Menu dropdown not found for positioning');
        return;
    }
    
    // Set basic positioning
    menuDropdown.style.position = 'absolute';
    menuDropdown.style.top = '100%'; // Position below the parent element
    menuDropdown.style.right = '0';  // Align to the right
    menuDropdown.style.zIndex = '9999';
    
    // Make sure parent has relative positioning
    const userSection = document.querySelector('.user-section');
    if (userSection) {
        userSection.style.position = 'relative';
    }
    
    console.log('Dropdown positioned');
}

// Function to set active nav link based on current page
function setActiveNavLink() {
    // Get current page path
    const currentPath = window.location.pathname;
    console.log('Current path:', currentPath);
    
    // Get all navigation links
    const navLinks = document.querySelectorAll('.header-links a');
    
    // Loop through links to find matching href
    navLinks.forEach(link => {
        // Get the link's href attribute
        const linkPath = link.getAttribute('href');
        console.log('Checking link:', linkPath);
        
        // Remove any existing active classes
        link.classList.remove('active');
        
        // Check if current path ends with the link path
        if (currentPath.endsWith(linkPath) || 
            (currentPath.endsWith('/') && linkPath === 'index.html') ||
            (currentPath === '' && linkPath === 'index.html')) {
            // Add active class to matching link
            link.classList.add('active');
            console.log('Active link set:', linkPath);
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing header-footer');
    initializeHeaderFooter();
});

// Export for direct inclusion in HTML
export { initializeHeaderFooter, loadIncludes, setActiveNavLink };