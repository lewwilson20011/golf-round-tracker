import { supabase } from './supabase.js';

let currentUser = null;

// Enhanced error handling function
function handleError(context, error) {
    console.error(`Error in ${context}:`, error);
    alert(`Error in ${context}: ${error.message || 'Unknown error'}`);
}

// Initialize the Profile Settings page
async function initializeProfileSettings() {
    try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        updateUserInterface();
        loadUserProfile();
    } catch (error) {
        handleError('initializeProfileSettings', error);
        // Redirect to login in case of any authentication issues
        window.location.href = 'login.html';
    }
}

// Update UI with user info
function updateUserInterface() {
    if (currentUser) {
        const initials = getInitials(currentUser);
        document.getElementById('userInitials').textContent = initials;
        document.getElementById('profileInitials').textContent = initials;
        
        const fullName = currentUser.user_metadata.full_name || currentUser.email;
        document.getElementById('userName').textContent = fullName;
        document.getElementById('userEmail').textContent = currentUser.email;
    }
}

// Get user initials from metadata or email
function getInitials(user) {
    if (user.user_metadata && user.user_metadata.initials) {
        return user.user_metadata.initials;
    }
    
    if (user.user_metadata && user.user_metadata.full_name) {
        return user.user_metadata.full_name
            .split(' ')
            .map(name => name[0])
            .join('')
            .toUpperCase();
    }
    
    return user.email.substring(0, 2).toUpperCase();
}

// Load user profile data from Supabase
async function loadUserProfile() {
    try {
        // Get user profile from Supabase
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            throw error;
        }

        // Populate form with user data
        document.getElementById('email').value = currentUser.email;
        
        // Parse name from user metadata
        if (currentUser.user_metadata.full_name) {
            const nameParts = currentUser.user_metadata.full_name.split(' ');
            document.getElementById('firstName').value = nameParts[0] || '';
            document.getElementById('lastName').value = nameParts.slice(1).join(' ') || '';
        }
        
        // If we have profile data, populate the rest of the form
        if (profile) {
            document.getElementById('handicap').value = profile.handicap || '';
            document.getElementById('location').value = profile.location || '';
        }
    } catch (error) {
        handleError('loadUserProfile', error);
    }
}

// Save profile data to Supabase
async function saveProfile(formData) {
    try {
        // Combine first and last name
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        
        // Update auth metadata
        const { error: metadataError } = await supabase.auth.updateUser({
            data: { 
                full_name: fullName,
                initials: formData.firstName[0] + formData.lastName[0]
            }
        });
        
        if (metadataError) throw metadataError;
        
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', currentUser.id)
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        let profileResult;
        
        // Insert or update profile data
        if (!existingProfile) {
            // Insert new profile
            profileResult = await supabase
                .from('profiles')
                .insert({
                    id: currentUser.id,
                    handicap: formData.handicap || null,
                    location: formData.location || null
                });
        } else {
            // Update existing profile
            profileResult = await supabase
                .from('profiles')
                .update({
                    handicap: formData.handicap || null,
                    location: formData.location || null
                })
                .eq('id', currentUser.id);
        }
        
        if (profileResult.error) throw profileResult.error;
        
        alert('Profile updated successfully!');
        
        // Refresh user data
        const { data: { user } } = await supabase.auth.getUser();
        currentUser = user;
        updateUserInterface();
        
    } catch (error) {
        handleError('saveProfile', error);
    }
}

// Update password
async function updatePassword(currentPassword, newPassword) {
    try {
        // First verify current password by signing in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword
        });
        
        if (signInError) {
            alert('Current password is incorrect');
            throw signInError;
        }
        
        // Update to new password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (updateError) throw updateError;
        
        alert('Password updated successfully');
        
        // Clear password form
        document.getElementById('passwordForm').reset();
        
    } catch (error) {
        handleError('updatePassword', error);
    }
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

    // Sign Out functionality
    document.getElementById('signOut').addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        }
    });

    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Show selected tab content
            const tabId = tab.dataset.tab;
            document.getElementById(`${tabId}-tab`).style.display = 'block';
        });
    });

    // Profile form submission
    const profileForm = document.getElementById('profileForm');
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            handicap: document.getElementById('handicap').value,
            location: document.getElementById('location').value
        };
        
        saveProfile(formData);
    });

    // Password form submission
    const passwordForm = document.getElementById('passwordForm');
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Check if passwords match
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }
        
        // Check password complexity
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            alert('Password must be at least 8 characters and include letters, numbers, and symbols');
            return;
        }
        
        updatePassword(currentPassword, newPassword);
    });

    // Initialize the profile page
    initializeProfileSettings();
});