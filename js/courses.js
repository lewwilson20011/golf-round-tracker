// courses.js - Functionality for the course database page
import { supabase } from './supabase.js';

// Global variables
let coursesData = [];
let userRounds = [];
let userFavorites = [];
let currentUser = null;
let currentPage = 1;
let itemsPerPage = 9;
let totalPages = 1;
let searchFilters = {
    name: '',
    location: '',
    type: '',
    showPlayed: 'all'
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Courses page loaded');
    await initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    try {
        showLoading();
        
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
            console.error("Auth error:", authError);
            window.location.href = 'login.html';
            return;
        }

        if (!user) {
            console.log("No user found, redirecting to login");
            window.location.href = 'login.html';
            return;
        }

        console.log("User authenticated:", user);
        currentUser = user;
        
        // Update UI with user info
        updateUserInterface();
        
        // Load user's played courses and favorites
        await Promise.all([
            loadUserRounds(),
            loadUserFavorites(),
            loadCourses()
        ]);
        
        // Render initial courses
        renderCourses();
        updatePagination();
        
        hideLoading();
        console.log("Courses page initialization complete");
    } catch (error) {
        console.error("Initialization error:", error);
        alert("There was an error loading the course database. Please try again later.");
        hideLoading();
    }
}

// Update UI with user info
function updateUserInterface() {
    if (currentUser) {
        document.querySelector('.user-avatar').textContent =
            currentUser.user_metadata.initials || currentUser.email.substring(0, 2).toUpperCase();
        document.querySelector('.user-name').textContent =
            currentUser.user_metadata.full_name || currentUser.email;
        document.querySelector('.user-email').textContent = currentUser.email;
    }
}

// Load user's played rounds
async function loadUserRounds() {
    try {
        // Ensure we have a current user
        if (!currentUser) return;

        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('course, date, score')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });

        if (error) throw error;

        // Group by course to get last played and best scores
        const roundsByCourseName = {};
        
        (rounds || []).forEach(round => {
            if (!round.course) return;
            
            if (!roundsByCourseName[round.course]) {
                roundsByCourseName[round.course] = {
                    playCount: 0,
                    bestScore: Infinity,
                    bestScoreDate: null,
                    lastPlayed: null
                };
            }
            
            // Update play count
            roundsByCourseName[round.course].playCount++;
            
            // Update best score
            if (round.score < roundsByCourseName[round.course].bestScore) {
                roundsByCourseName[round.course].bestScore = round.score;
                roundsByCourseName[round.course].bestScoreDate = round.date;
            }
            
            // Update last played
            const roundDate = new Date(round.date);
            const lastPlayedDate = roundsByCourseName[round.course].lastPlayed ? 
                new Date(roundsByCourseName[round.course].lastPlayed) : null;
                
            if (!lastPlayedDate || roundDate > lastPlayedDate) {
                roundsByCourseName[round.course].lastPlayed = round.date;
            }
        });
        
        userRounds = roundsByCourseName;
        console.log(`Loaded play history for ${Object.keys(userRounds).length} courses`);
    } catch (error) {
        console.error('Error loading user rounds:', error);
    }
}

// Load user's favorite courses
async function loadUserFavorites() {
    try {
        // Ensure we have a current user
        if (!currentUser) return;

        const { data: favorites, error } = await supabase
            .from('favorites')
            .select('course_id')
            .eq('user_id', currentUser.id);

        if (error) throw error;

        userFavorites = (favorites || []).map(fav => fav.course_id);
        console.log(`Loaded ${userFavorites.length} favorite courses`);
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Load courses data
async function loadCourses() {
    try {
        // In a real app, we would load from Supabase
        // For this demo, we'll use mock data
        
        // Simulating API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for courses
        coursesData = [
            {
                id: 1,
                name: "Augusta National Golf Club",
                location: "Augusta, GA, USA",
                image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
                holes: 18,
                length: "7,475 yards",
                par: 72,
                type: "private",
                rating: "76.2 / 137",
                established: 1933,
                description: "Augusta National Golf Club is a famous golf club located in Augusta, Georgia, USA. Founded by Bobby Jones and Clifford Roberts, it's one of the most prestigious golf courses in the world and home to the Masters Tournament, one of golf's four major championships. The course is known for its beautiful landscaping, including azaleas and dogwoods, and challenging play. Due to its private nature, it's one of the most exclusive clubs in the world with a limited membership.",
                website: "https://www.masters.com/",
                latitude: 33.5030,
                longitude: -82.0232
            },
            {
                id: 2,
                name: "Pebble Beach Golf Links",
                location: "Pebble Beach, CA, USA",
                image: "https://images.unsplash.com/photo-1600861195091-690f0e132e98?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
                holes: 18,
                length: "7,075 yards",
                par: 72,
                type: "public",
                rating: "74.6 / 143",
                established: 1919,
                description: "Pebble Beach Golf Links is a public golf course located on the west coast of the United States, in Pebble Beach, California. It's one of the most beautiful courses in the world, offering scenic views of Carmel Bay and the Pacific Ocean. The course has hosted the U.S. Open multiple times and is part of the AT&T Pebble Beach Pro-Am tournament. Known for its spectacular coastal setting, it's considered one of the greatest public courses in America.",
                website: "https://www.pebblebeach.com/",
                latitude: 36.5684,
                longitude: -121.9477
            },
            {
                id: 3,
                name: "St Andrews Links - Old Course",
                location: "St Andrews, Scotland, UK",
                image: "https://images.unsplash.com/photo-1634224143538-8fce8757cceb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
                holes: 18,
                length: "7,305 yards",
                par: 72,
                type: "public",
                rating: "73.1 / 132",
                established: 1552,
                description: "The Old Course at St Andrews is one of the oldest golf courses in the world, dating back to the early 16th century. Located in St Andrews, Scotland, it's widely considered the 'Home of Golf'. The Open Championship has been played here more times than any other course. Notable for its unique features like the Swilcan Bridge and Hell Bunker, the course has wide fairways and large greens. It's a public course, allowing golfers from around the world to experience its historic significance.",
                website: "https://www.standrews.com/",
                latitude: 56.3405,
                longitude: -2.8037
            },
            // Add more mock courses here
            {
                id: 4,
                name: "Pine Valley Golf Club",
                location: "Pine Valley, NJ, USA",
                image: "https://images.unsplash.com/photo-1611367540722-9825e219be45?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80",
                holes: 18,
                length: "7,181 yards",
                par: 70,
                type: "private",
                rating: "76.0 / 155",
                established: 1913,
                description: "Pine Valley Golf Club is a highly exclusive private club located in Pine Valley, New Jersey. Founded in 1913, it's consistently ranked as one of the top golf courses in the world. The course is known for its challenging design, featuring deep bunkers, elevated greens, and dense vegetation. Each hole is isolated from the others by dense woods or scrubland, creating a unique and challenging playing experience.",
                website: null,
                latitude: 39.7874,
                longitude: -74.9700
            },
            {
                id: 5,
                name: "Oakmont Country Club",
                location: "Oakmont, PA, USA",
                image: "https://images.unsplash.com/photo-1535131749006-b7527c55f8bc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
                holes: 18,
                length: "7,255 yards",
                par: 71,
                type: "private",
                rating: "77.5 / 147",
                established: 1903,
                description: "Oakmont Country Club is a historic private country club in Oakmont, Pennsylvania, near Pittsburgh. It's one of the oldest top-ranked golf courses in the United States and has hosted more combined USGA and PGA championships than any other course in the U.S. Known for its challenging design featuring fast greens, deep bunkers, and over 200 strategically placed bunkers, Oakmont presents a significant challenge to golfers of all skill levels.",
                website: "https://www.oakmont-countryclub.org/",
                latitude: 40.5260,
                longitude: -79.8310
            }
        ];

        // In a real app, this could be:
        // const { data: courses, error } = await supabase
        //    .from('courses')
        //    .select('*')
        //    .order('name');
        
        console.log(`Loaded ${coursesData.length} courses from database`);
        return coursesData;
    } catch (error) {
        console.error('Error loading courses:', error);
        return [];
    }
}

// Set up event listeners
function setupEventListeners() {
    // Search form submit
    const searchForm = document.getElementById('courseSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    // Reset button
    const resetBtn = document.querySelector('.reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSearch);
    }
    
    // Course favorites
    document.body.addEventListener('click', function(e) {