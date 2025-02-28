// Initialize Supabase client with secure configuration
const supabaseUrl = 'https://omauxrkxbnzcyvkiwphe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYXV4cmt4Ym56Y3l2a2l3cGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NDcxNjUsImV4cCI6MjA1NTMyMzE2NX0.Qgjg_JbnBN5GYBdkfiGpMG0-AjH8y2YgdutJH0Udy8A'

// Create Supabase client using the global Supabase object from CDN
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Helper function to handle sign-out across the application
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Sign out error:', error);
        alert(`Error signing out: ${error.message}`);
    }
}

// Helper function to check authentication status
export async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Authentication check error:', error);
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