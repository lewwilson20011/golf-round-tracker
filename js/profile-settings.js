import { supabase } from './supabase.js';
import { loadUserProfile, updateUserProfile } from './settings.js';

// Initialize the page
async function initializePage() {
    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Update UI with user info
        updateUserInterface(user);
        
        // Load profile data
        const { user: currentUser, profile } = await loadUserProfile();
        
        // Fill form with profile data
        populateForm(currentUser, profile);
        
        // Load courses for the datalist
        await loadCourses();
    } catch (error) {
        handleError('initializePage', error);
        // Redirect to login in case of any authentication issues
        window.location.href = 'login.html';
    }
}

// Update UI with user info
function updateUserInterface(user) {
    document.querySelector('.user-avatar').textContent = 
        user.user_metadata.initials || user.email.substring(0, 2).toUpperCase();
    document.querySelector('.user-name').textContent = 
        user.user_metadata.full_name || user.email;
    document.querySelector('.user-email').textContent = user.email;
}

// Populate form with user profile data
function populateForm(user, profile) {
    document.getElementById('fullName').value = profile.full_name || '';
    document.getElementById('email').value = user.email;
    document.getElementById('handicap').value = profile.handicap || '';
    document.getElementById('homeCourse').value = profile.home_course || '';
    document.getElementById('preferredTees').value = profile.preferred_tees || '';
}

// Load courses from Supabase
async function loadCourses() {
    try {
        const { data: courses, error } = await supabase
            .from('courses')
            .select('name')
            .order('name');

        if (error) throw error;

        const courseList = document.getElementById('courseList');
        courseList.innerHTML = courses.map(course => 
            `<option value="${course.name}"></option>`
        ).join('');
    } catch (error) {
        handleError('loadCourses', error);
    }
}

// Handle profile form submission
async function handleProfileFormSubmit(e) {
    e.preventDefault();
    
    try {
        // Show loading state
        const saveBtn = document.querySelector('.save-profile-btn');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        // Get form data
        const profileData = {
            full_name: document.getElementById('fullName').value,
            handicap: parseFloat(document.getElementById('handicap').value) || null,
            home_course: document.getElementById('homeCourse').value,
            preferred_tees: document.getElementById('preferredTees').value
        };
        
        // Update profile
        await updateUserProfile(profileData);
        
        // Show success message
        alert('Profile updated successfully!');
        
        // Redirect back to dashboard
        window.location.href = 'index.html';
    } catch (error) {
        handleError('updateProfile', error);
        
        // Reset button state
        const saveBtn = document.querySelector('.save-profile-btn');
        saveBtn.textContent = 'Save Changes';
        saveBtn.disabled = false;
    }
}

// Enhanced error handling function
function handleError(context, error) {
    console.error(`Error in ${context}:`, error);
    alert(`Error in ${context}: ${error.message || 'Unknown error'}`);
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Menu functionality
    const menuButton = document.querySelector('.menu-button');
    const menuDropdown = document.querySelector('.menu-dropdown');

    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!menuDropdown.contains(e.target) && !menuButton.contains(e.target)) {
            menuDropdown.classList.remove('show');
        }
    });

    // Menu items
    document.getElementById('profileSettings').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'profile-settings.html';
    });

    document.getElementById('appSettings').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'app-settings.html';
    });

    document.getElementById('signOut').addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        }
    });

    // Form submission
    const profileForm = document.getElementById('profileForm');
    profileForm.addEventListener('submit', handleProfileFormSubmit);

    // Initialize the page
    initializePage();
});

// Logging for debugging
console.log('Profile settings script loaded');