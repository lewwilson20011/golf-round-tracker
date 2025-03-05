// Initialize Supabase client with secure configuration
const supabaseUrl = 'https://omauxrkxbnzcyvkiwphe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYXV4cmt4Ym56Y3l2a2l3cGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NDcxNjUsImV4cCI6MjA1NTMyMzE2NX0.Qgjg_JbnBN5GYBdkfiGpMG0-AjH8y2YgdutJH0Udy8A'

// Create Supabase client using the global Supabase object from CDN
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Enhanced sign out function that works more reliably
export async function signOut() {
    try {
        // First manually clear any tokens in localStorage
        localStorage.removeItem('supabase.auth.token');

        // Try the official signOut method
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Sign out error:', error);
        }

        // Clear any additional storage items that might be keeping the session alive
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('supabase')) {
                localStorage.removeItem(key);
            }
        }

        // Force redirect to login page regardless of errors
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Sign out error:', error);
        // Force redirect even if there's an error
        window.location.href = 'login.html';
    }
}

// Helper function to check authentication status
export async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.error('Authentication check error:', error);
            // Don't throw or display errors, just return false silently
            return false;
        }

        return !!user;
    } catch (error) {
        console.error('Authentication error:', error);
        return false;
    }
}

// Export additional utility functions if needed
export default {
    supabase,
    signOut,
    checkAuthentication
};
