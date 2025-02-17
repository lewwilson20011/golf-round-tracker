import { supabase } from './supabase.js';

let currentUser = null;

// Menu functionality
document.addEventListener('DOMContentLoaded', () => {
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

    // Handle menu items
    document.getElementById('profileSettings').addEventListener('click', async (e) => {
        e.preventDefault();
        alert('Profile settings coming soon!');
    });

    document.getElementById('appSettings').addEventListener('click', async (e) => {
        e.preventDefault();
        alert('App settings coming soon!');
    });

    document.getElementById('signOut').addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        }
    });
});

// Initialize the application
async function initializeApp() {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    currentUser = user;
    updateUserInterface();
    await loadRounds();
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

// Load rounds from Supabase
async function loadRounds() {
    const { data: rounds, error } = await supabase
        .from('rounds')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error('Error loading rounds:', error);
        return;
    }

    updateStats(rounds);
    renderRounds(rounds);
}

// Save a new round
async function saveRound() {
    const date = document.getElementById('roundDate').value;
    const course = document.getElementById('courseSelect').value;
    const score = parseInt(document.getElementById('scoreInput').value);
    const notes = document.getElementById('notes').value;
    
    if (!date || !course || !score) {
        alert('Please fill in all required fields');
        return;
    }

    const { error } = await supabase
        .from('rounds')
        .insert([{
            date,
            course,
            score,
            notes,
            user_id: currentUser.id
        }]);

    if (error) {
        console.error('Error saving round:', error);
        alert('Error saving round');
        return;
    }

    // Reset form
    document.getElementById('roundDate').value = '';
    document.getElementById('courseSelect').value = '';
    document.getElementById('scoreInput').value = '';
    document.getElementById('notes').value = '';

    // Reload rounds
    await loadRounds();
}

// Delete a round
async function deleteRound(id) {
    const { error } = await supabase
        .from('rounds')
        .delete()
        .match({ id });

    if (error) {
        console.error('Error deleting round:', error);
        alert('Error deleting round');
        return;
    }

    await loadRounds();
}

// Update statistics
function updateStats(rounds) {
    if (!rounds.length) {
        document.getElementById('avgScore').textContent = '-';
        document.getElementById('bestScore').textContent = '-';
        document.getElementById('totalRounds').textContent = '0';
        return;
    }

    const avgScore = Math.round(rounds.reduce((acc, round) => acc + round.score, 0) / rounds.length);
    const bestScore = Math.min(...rounds.map(round => round.score));
    
    document.getElementById('avgScore').textContent = avgScore;
    document.getElementById('bestScore').textContent = bestScore;
    document.getElementById('totalRounds').textContent = rounds.length;
}

// Render rounds table
function renderRounds(rounds) {
    const roundsList = document.getElementById('roundsList');
    roundsList.innerHTML = rounds.map((round) => `
        <div class="round-row">
            <div class="date">${new Date(round.date).toLocaleDateString()}</div>
            <div class="course">${round.course}</div>
            <div class="score">${round.score}</div>
            <div class="notes">${round.notes || ''}</div>
            <div>
                <button class="delete-btn" onclick="deleteRound('${round.id}')">
                    <i class="fa-solid fa-trash"></i>
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Handle logout
document.getElementById('logoutButton').addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = 'login.html';
    }
});

// Set up form submission
document.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveRound();
});

// Set default date to today
document.getElementById('roundDate').valueAsDate = new Date();

// Initialize the application
initializeApp();