import { supabase } from './supabase.js';
import { loadAppSettings, updateAppSettings, applySettings } from './settings.js';

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
        
        // Load app settings
        const settings = await loadAppSettings();
        
        // Apply current settings
        applySettings(settings);
        
        // Fill form with settings data
        populateForm(settings);
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
        user.user_metadata.full_name ||