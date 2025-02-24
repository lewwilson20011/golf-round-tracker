import { supabase } from './supabase.js';

// User profile settings management
export async function loadUserProfile() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
        
        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }
        
        return {
            user,
            profile: profile || {
                id: user.id,
                full_name: user.user_metadata?.full_name || '',
                handicap: null,
                preferred_tees: null,
                home_course: null
            }
        };
    } catch (error) {
        console.error('Error loading profile:', error);
        throw error;
    }
}

// Update user profile
export async function updateUserProfile(profileData) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
        
        // Update Supabase auth metadata
        const { error: metadataError } = await supabase.auth.updateUser({
            data: { 
                full_name: profileData.full_name,
                initials: getInitials(profileData.full_name)
            }
        });
        
        if (metadataError) throw metadataError;
        
        // Upsert profile data
        const { data, error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: profileData.full_name,
                handicap: profileData.handicap,
                preferred_tees: profileData.preferred_tees,
                home_course: profileData.home_course
            }, { onConflict: 'id' });
            
        if (profileError) throw profileError;
        
        return { success: true };
    } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
    }
}

// App settings management
export async function loadAppSettings() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
        
        // Get app settings from settings table
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
        if (settingsError && settingsError.code !== 'PGRST116') {
            throw settingsError;
        }
        
        // Return default settings if none found
        return settings || {
            user_id: user.id,
            dark_mode: false,
            date_format: 'MM/DD/YYYY',
            distance_unit: 'yards',
            auto_calculate_handicap: true,
            notifications_enabled: true
        };
    } catch (error) {
        console.error('Error loading app settings:', error);
        throw error;
    }
}

// Update app settings
export async function updateAppSettings(settings) {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user');
        
        // Update settings
        const { data, error: settingsError } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                dark_mode: settings.dark_mode,
                date_format: settings.date_format,
                distance_unit: settings.distance_unit,
                auto_calculate_handicap: settings.auto_calculate_handicap,
                notifications_enabled: settings.notifications_enabled
            }, { onConflict: 'user_id' });
            
        if (settingsError) throw settingsError;
        
        // Apply settings immediately
        applySettings(settings);
        
        return { success: true };
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
}

// Apply settings to the UI
export function applySettings(settings) {
    // Apply dark mode if enabled
    if (settings.dark_mode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Store date format for use in rendering
    localStorage.setItem('date_format', settings.date_format);
    localStorage.setItem('distance_unit', settings.distance_unit);
}

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return '';
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}