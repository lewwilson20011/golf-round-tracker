// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

// Create Supabase client using the global Supabase object from CDN
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);