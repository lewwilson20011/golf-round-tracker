import { supabase } from './supabase.js';

let currentUser = null;
let currentSettings = {
    animations: true,
    scoringSystem: 'Stroke Play',
    autoHandicap: true,
    emailNotifications: false,
    pushNotifications: false
};

// These variables track if settings have been changed
let settingsChanged = false;

// Enhanced error handling function
function handleError(context, error) {
    console.error(`Error in ${context}:`, error);
    alert(`Error in ${context}: ${error.message || 'Unknown error'}`);
}

// Initialize the App Settings page
async function initializeAppSettings() {
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
        await loadUserSettings();
    } catch (error) {
        handleError('initializeAppSettings', error);
        // Redirect to login in case of any authentication issues
        window.location.href = 'login.html';
    }
}

// Update UI with user info
function updateUserInterface() {
    if (currentUser) {
        // Update user initials and name in header
        document.getElementById('userInitials').textContent = 
            currentUser.user_metadata.initials || currentUser.email.substring(0, 2).toUpperCase();
        document.getElementById('userName').textContent = 
            currentUser.user_metadata.full_name || currentUser.email;
        document.getElementById('userEmail').textContent = currentUser.email;
    }
}

// Load user settings from Supabase
async function loadUserSettings() {
    try {
        // Get user settings from Supabase
        const { data: settings, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            throw error;
        }

        // If we have settings, update our local state
        if (settings) {
            currentSettings = {
                animations: settings.animations !== false, // Default to true if not set
                scoringSystem: settings.scoring_system || 'Stroke Play',
                autoHandicap: settings.auto_handicap !== false, // Default to true if not set
                emailNotifications: settings.email_notifications || false,
                pushNotifications: settings.push_notifications || false
            };
        }

        // Update UI with settings
        updateSettingsUI();
    } catch (error) {
        handleError('loadUserSettings', error);
    }
}

// Update UI elements with current settings
function updateSettingsUI() {
    // Toggle switches
    document.getElementById('animationsToggle').checked = currentSettings.animations;
    document.getElementById('autoHandicapToggle').checked = currentSettings.autoHandicap;
    document.getElementById('emailNotificationsToggle').checked = currentSettings.emailNotifications;
    document.getElementById('pushNotificationsToggle').checked = currentSettings.pushNotifications;
    
    // Select inputs
    document.getElementById('scoringSystem').value = currentSettings.scoringSystem;
    
    // Disable animations if disabled
    if (!currentSettings.animations) {
        const style = document.createElement('style');
        style.id = 'disable-animations';
        style.textContent = `
            * {
                animation: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
    } else {
        const disableStyle = document.getElementById('disable-animations');
        if (disableStyle) {
            disableStyle.remove();
        }
    }
}

// Save settings to Supabase
async function saveSettings() {
    try {
        // If settings haven't changed, don't save
        if (!settingsChanged) {
            alert('No changes to save');
            return;
        }
        
        // Check if settings exist for this user
        const { data: existingSettings, error: checkError } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('user_id', currentUser.id)
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        let result;
        
        // Map our settings to database fields
        const settingsData = {
            animations: currentSettings.animations,
            scoring_system: currentSettings.scoringSystem,
            auto_handicap: currentSettings.autoHandicap,
            email_notifications: currentSettings.emailNotifications, 
            push_notifications: currentSettings.pushNotifications
        };
        
        // Insert or update settings
        if (!existingSettings) {
            // Insert new settings
            result = await supabase
                .from('user_settings')
                .insert({
                    user_id: currentUser.id,
                    ...settingsData
                });
        } else {
            // Update existing settings
            result = await supabase
                .from('user_settings')
                .update(settingsData)
                .eq('user_id', currentUser.id);
        }
        
        if (result.error) throw result.error;
        
        alert('Settings saved successfully!');
        settingsChanged = false;
    } catch (error) {
        handleError('saveSettings', error);
    }
}

// Export user data to CSV
async function exportUserData() {
    try {
        // Get user rounds data
        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });

        if (error) throw error;

        if (!rounds || rounds.length === 0) {
            alert('No data to export');
            return;
        }

        // Convert data to CSV format
        const headers = Object.keys(rounds[0]).filter(key => key !== 'user_id');
        const csvHeader = headers.join(',') + '\n';
        
        const csvRows = rounds.map(round => {
            return headers.map(header => {
                // Handle cases where the value might contain commas or quotes
                const value = round[header] === null ? '' : round[header];
                const valueStr = String(value);
                
                if (valueStr.includes(',') || valueStr.includes('"') || valueStr.includes('\n')) {
                    return `"${valueStr.replace(/"/g, '""')}"`;
                }
                return valueStr;
            }).join(',');
        }).join('\n');
        
        const csvContent = csvHeader + csvRows;
        
        // Create a download link and trigger it
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `round-tracker-data-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        handleError('exportUserData', error);
    }
}

// Delete user account and all data
async function deleteUserAccount() {
    try {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }
        
        // Request password confirmation for security
        const password = prompt('Please enter your password to confirm account deletion:');
        
        if (!password) {
            return; // User cancelled the prompt
        }
        
        // Verify password by attempting to sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: password
        });
        
        if (signInError) {
            alert('Incorrect password. Account deletion cancelled.');
            throw signInError;
        }
        
        // If password is verified, proceed with deletion
        if (confirm('This will permanently delete your account and all your data. Are you absolutely sure?')) {
            // Delete user data from Supabase
            const { error: deleteRoundsError } = await supabase
                .from('rounds')
                .delete()
                .eq('user_id', currentUser.id);
                
            if (deleteRoundsError) throw deleteRoundsError;
            
            const { error: deleteSettingsError } = await supabase
                .from('user_settings')
                .delete()
                .eq('user_id', currentUser.id);
                
            if (deleteSettingsError) throw deleteSettingsError;
            
            const { error: deleteProfileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', currentUser.id);
                
            if (deleteProfileError) throw deleteProfileError;
            
            // Finally, delete the user from auth
            const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
                currentUser.id
            );
            
            if (deleteUserError) {
                // If we can't delete the user account, show a message but still log them out
                alert('Unable to delete your account directly. Please contact support. You will be signed out now.');
            } else {
                alert('Your account has been successfully deleted.');
            }
            
            // Sign the user out
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        }
    } catch (error) {
        handleError('deleteUserAccount', error);
    }
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Menu functionality
    const menuButton = document.querySelector('.menu-button');
    const menuDropdown = document.querySelector('.menu-dropdown');

    if (menuButton && menuDropdown) {
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menuDropdown.classList.contains('show')) {
                if (!menuDropdown.contains(e.target) && !menuButton.contains(e.target)) {
                    menuDropdown.classList.remove('show');
                }
            }
        });

        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuDropdown.classList.contains('show')) {
                menuDropdown.classList.remove('show');
            }
        });
    }

    // Sign Out functionality
    const signOutButton = document.getElementById('signOut');
    if (signOutButton) {
        signOutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const { error } = await supabase.auth.signOut();
                if (!error) {
                    window.location.href = 'login.html';
                }
            } catch (error) {
                console.error('Sign out error:', error);
                alert(`Error signing out: ${error.message}`);
            }
        });
    }

    // Settings change listeners for toggle switches
    document.getElementById('animationsToggle').addEventListener('change', (e) => {
        currentSettings.animations = e.target.checked;
        settingsChanged = true;
        
        // Apply animations setting immediately
        if (e.target.checked) {
            const disableStyle = document.getElementById('disable-animations');
            if (disableStyle) {
                disableStyle.remove();
            }
        } else {
            const style = document.createElement('style');
            style.id = 'disable-animations';
            style.textContent = `
                * {
                    animation: none !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    });

    document.getElementById('autoHandicapToggle').addEventListener('change', (e) => {
        currentSettings.autoHandicap = e.target.checked;
        settingsChanged = true;
    });

    document.getElementById('emailNotificationsToggle').addEventListener('change', (e) => {
        currentSettings.emailNotifications = e.target.checked;
        settingsChanged = true;
    });

    document.getElementById('pushNotificationsToggle').addEventListener('change', (e) => {
        currentSettings.pushNotifications = e.target.checked;
        settingsChanged = true;
    });

    // Settings change listener for select input
    document.getElementById('scoringSystem').addEventListener('change', (e) => {
        currentSettings.scoringSystem = e.target.value;
        settingsChanged = true;
    });

    // Save settings button
    document.getElementById('saveSettings').addEventListener('click', saveSettings);

    // Export data button
    document.getElementById('exportData').addEventListener('click', exportUserData);

    // Delete account button
    document.getElementById('deleteAccount').addEventListener('click', deleteUserAccount);

    // Initialize the app settings
    initializeAppSettings();
});