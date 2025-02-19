// Initialize Supabase client
const supabaseUrl = 'https://omauxrkxbnzcyvkiwphe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tYXV4cmt4Ym56Y3l2a2l3cGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk3NDcxNjUsImV4cCI6MjA1NTMyMzE2NX0.Qgjg_JbnBN5GYBdkfiGpMG0-AjH8y2YgdutJH0Udy8A'

// Create Supabase client using the global Supabase object from CDN
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);