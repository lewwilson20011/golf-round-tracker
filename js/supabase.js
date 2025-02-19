// Initialize Supabase client
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseKey = 'YOUR_ANON_PUBLIC_KEY'

// Ensure the Supabase script is loaded before creating the client
if (window.supabase) {
    export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)
} else {
    console.error('Supabase script not loaded. Make sure to include the Supabase CDN script.')
}