import { supabase } from './supabase.js';

let currentUser = null;

// Debugging function to log errors consistently
function handleError(context, error) {
    console.error(`Error in ${context}:`, error);
    alert(`Error in ${context}: ${error.message || 'Unknown error'}`);
}

// Make delete and edit functions globally available
window.deleteRound = async (id) => {
    if (confirm('Are you sure you want to delete this round?')) {
        try {
            const { error } = await supabase
                .from('rounds')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Reload rounds after successful deletion
            await loadRounds();
        } catch (error) {
            handleError('deleteRound', error);
        }
    }
};

function setEditMode(isEditing) {
    const saveBtn = document.querySelector('.save-btn');
    if (isEditing) {
        saveBtn.textContent = 'Update Round';
        saveBtn.classList.add('updating');
        // Add cancel button if it doesn't exist
        if (!document.querySelector('.cancel-edit')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-edit';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.onclick = resetForm;
            saveBtn.parentNode.insertBefore(cancelBtn, saveBtn);
        }
    } else {
        saveBtn.textContent = 'Save Round';
        saveBtn.classList.remove('updating');
        // Remove cancel button
        const cancelBtn = document.querySelector('.cancel-edit');
        if (cancelBtn) cancelBtn.remove();
    }
}

function resetForm() {
    const form = document.querySelector('form');
    form.reset();
    form.dataset.editId = '';
    document.getElementById('roundDate').valueAsDate = new Date();
    setEditMode(false);
    document.querySelectorAll('.round-row').forEach(row => row.classList.remove('editing'));
}

window.editRound = async (id) => {
    try {
        // Remove previous editing highlights
        document.querySelectorAll('.round-row').forEach(row => row.classList.remove('editing'));
        
        // Get the round data
        const { data: round, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Fill the form with the round data
        const dateInput = document.getElementById('roundDate');
        dateInput.value = round.date;
        document.getElementById('courseSelect').value = round.course;
        document.getElementById('holesSelect').value = round.holes || '18 Holes';
        document.getElementById('scoreInput').value = round.score;
        document.getElementById('notes').value = round.notes || '';

        // Add the round ID to the form for updating
        const form = document.querySelector('form');
        form.dataset.editId = id;
        
        // Update UI for edit mode
        setEditMode(true);
        
        // Highlight the round being edited
        const roundRow = document.querySelector(`[data-round-id="${id}"]`);
        if (roundRow) {
            roundRow.classList.add('editing');
        }
        
        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        handleError('editRound', error);
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
        handleError('loadCourses', error);
    }
}

// Initialize the application
async function initializeApp() {
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
        await loadCourses();
        await loadRounds();
    } catch (error) {
        handleError('initializeApp', error);
        // Redirect to login in case of any authentication issues
        window.location.href = 'login.html';
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

// Load rounds from Supabase
async function loadRounds() {
    try {
        // Ensure we have a current user before loading rounds
        if (!currentUser) {
            console.warn('No current user found');
            return;
        }

        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        updateStats(rounds);
        renderRounds(rounds);
    } catch (error) {
        handleError('loadRounds', error);
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
        <div class="round-row" data-round-id="${round.id}">
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

// Prevent multiple event listener attachments
let isEventListenersAttached = false;

// Set up event listeners when DOM is loaded
function setupEventListeners() {
    if (isEventListenersAttached) return;
    isEventListenersAttached = true;

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
            let result;
            
            if (editId) {
                // Update existing round
                result = await supabase
                    .from('rounds')
                    .update({
                        date,
                        course,
                        score,
                        notes,
                        holes
                    })
                    .eq('id', editId);
            } else {
                // Insert new round
                result = await supabase
                    .from('rounds')
                    .insert([{
                        date,
                        course,
                        score,
                        notes,
                        holes,
                        user_id: currentUser.id
                    }]);
            }

            // Check for errors
            if (result.error) throw result.error;

            // Reset form and UI
            resetForm();

            // Reload rounds
            await loadRounds();
        } catch (error) {
            handleError('Form Submission', error);
        }
    });

    // Set initial date
    document.getElementById('roundDate').valueAsDate = new Date();
}

// Ensure event listeners are only set up once
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeApp();
});

// Additional logging for debugging
console.log('Script loaded');