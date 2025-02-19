import { supabase } from './supabase.js';

let currentUser = null;

// Make delete and edit functions globally available
window.deleteRound = async (id) => {
    if (confirm('Are you sure you want to delete this round?')) {
        try {
            const { error } = await supabase
                .from('rounds')
                .delete()
                .match({ id });

            if (error) throw error;
            await loadRounds();
        } catch (error) {
            console.error('Error deleting round:', error);
            alert('Error deleting round');
        }
    }
};

window.editRound = async (id) => {
    try {
        // Get the round data
        const { data: round, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fill the form with the round data
        document.getElementById('roundDate').value = round.date;
        document.getElementById('courseSelect').value = round.course;
        document.getElementById('holesSelect').value = round.holes;
        document.getElementById('scoreInput').value = round.score;
        document.getElementById('notes').value = round.notes || '';

        // Add the round ID to the form for updating
        const form = document.querySelector('form');
        form.dataset.editId = id;
        
        // Change save button text
        const saveBtn = form.querySelector('.save-btn');
        saveBtn.textContent = 'Update Round';
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading round for edit:', error);
        alert('Error loading round for edit');
    }
};

// Load courses from Supabase
async function loadCourses() {
    try {
        const { data: courses, error } = await supabase
            .from('courses')
            .select('name')
            .order('name');

        if (error) throw error;

        const courseList = document.getElementById('courseList');
        courseList.innerHTML = courses.map(course => 
            `<option value="${course.name}"></option>`
        ).join('');
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

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
    await loadCourses();
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
    try {
        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.log('Load rounds error:', error);
            throw error;
        }

        console.log('Loaded rounds:', rounds);
        updateStats(rounds);
        renderRounds(rounds);
    } catch (error) {
        console.error('Error loading rounds:', error);
    }
}

// Update statistics
function updateStats(rounds) {
    if (!rounds || !rounds.length) {
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
    
    if (!rounds || !rounds.length) {
        roundsList.innerHTML = `
            <div class="no-rounds">
                <p>No rounds logged yet. Add your first round to start tracking!</p>
            </div>
        `;
        return;
    }

    roundsList.innerHTML = rounds.map((round) => `
        <div class="round-row">
            <div class="date">${new Date(round.date).toLocaleDateString()}</div>
            <div class="course">${round.course}</div>
            <div class="score">${round.score}</div>
            <div class="notes">${round.notes || ''}</div>
            <div class="action-buttons">
                <button class="edit-btn" onclick="editRound('${round.id}')">
                    <i class="fa-solid fa-pencil"></i>
                </button>
                <button class="delete-btn" onclick="deleteRound('${round.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
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

    // Menu items
    document.getElementById('profileSettings').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Profile settings coming soon!');
    });

    document.getElementById('appSettings').addEventListener('click', (e) => {
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

    // Form submission
    const form = document.querySelector('form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('roundDate').value;
        const course = document.getElementById('courseSelect').value;
        const score = parseInt(document.getElementById('scoreInput').value);
        const notes = document.getElementById('notes').value;
        const holes = document.getElementById('holesSelect').value;
        const editId = form.dataset.editId;
        
        try {
            let error;
            
            if (editId) {
                // Update existing round
                const { error: updateError } = await supabase
                    .from('rounds')
                    .update({
                        date,
                        course,
                        score,
                        notes,
                        holes
                    })
                    .match({ id: editId });
                error = updateError;
            } else {
                // Insert new round
                const { error: insertError } = await supabase
                    .from('rounds')
                    .insert([{
                        date,
                        course,
                        score,
                        notes,
                        holes,
                        user_id: currentUser.id
                    }]);
                error = insertError;
            }

            if (error) throw error;

            // Reset form
            form.reset();
            form.dataset.editId = '';
            document.getElementById('roundDate').valueAsDate = new Date();
            const saveBtn = form.querySelector('.save-btn');
            saveBtn.textContent = 'Save Round';

            // Reload rounds
            await loadRounds();
        } catch (error) {
            console.error('Error saving round:', error);
            alert('Error saving round: ' + error.message);
        }
    });

    // Set initial date
    document.getElementById('roundDate').valueAsDate = new Date();
});

// Initialize the application
initializeApp();