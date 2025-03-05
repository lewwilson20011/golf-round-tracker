import { supabase, signOut } from './supabase.js';

let currentUser = null;

// Enhanced error handling function
function handleError(context, error) {
    console.error(`Error in ${context}:`, error);

    // Only show alerts for non-auth errors
    if (!context.includes('initialize') && !context.includes('auth')) {
        alert(`Error in ${context}: ${error.message || 'Unknown error'}`);
    }
}

// Make delete and edit functions globally available
window.deleteRound = async (id) => {
    if (confirm('Are you sure you want to delete this round?')) {
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError) throw userError;
            if (!user) throw new Error('No authenticated user');

            // Perform deletion
            const { data, error } = await supabase
                .from('rounds')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;

            // Reload rounds after successful deletion
            await loadRounds();
        } catch (error) {
            console.error('Delete round error:', error);
            alert(`Error deleting round: ${error.message}`);
        }
    }
};

// Update round function
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
        // Add detailed logging
        console.log("Getting user...");
        const authResult = await supabase.auth.getUser();
        console.log("Auth result:", authResult);
        const { data: { user }, error: authError } = authResult;

        if (authError) {
            console.error("Auth error:", authError);
            // Silently redirect to login instead of showing an error
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
        updateUserInterface();

        console.log("Loading courses...");
        await loadCourses();

        console.log("Loading rounds...");
        await loadRounds();

        console.log("App initialization complete");
    } catch (error) {
        console.error("Detailed initialization error:", error);
        // Don't show error alert, just redirect
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
        // Ensure we have a current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn('No current user found');
            return;
        }

        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Make sure we have an array even if the result is null
        const roundsArray = rounds || [];
        updateStats(roundsArray);
        renderRounds(roundsArray);
    } catch (error) {
        handleError('loadRounds', error);
    }
}

// Update statistics
function updateStats(rounds) {
    // Make sure rounds is an array and handle empty state
    const roundsArray = Array.isArray(rounds) ? rounds : [];

    // Display total count (will be 0 if empty)
    document.getElementById('totalRounds').textContent = roundsArray.length;

    if (roundsArray.length === 0) {
        // No rounds, show placeholder values
        document.getElementById('avgScore').textContent = '-';
        document.getElementById('bestScore').textContent = '-';
        return;
    }

    // Calculate stats when we have rounds
    const avgScore = Math.round(roundsArray.reduce((acc, round) => acc + round.score, 0) / roundsArray.length);
    const bestScore = Math.min(...roundsArray.map(round => round.score));

    document.getElementById('avgScore').textContent = avgScore;
    document.getElementById('bestScore').textContent = bestScore;
}

// Render rounds table
function renderRounds(rounds) {
    const roundsList = document.getElementById('roundsList');

    // Always ensure we're working with an array
    const roundsArray = Array.isArray(rounds) ? rounds : [];

    if (roundsArray.length === 0) {
        // Render the attractive empty state
        roundsList.innerHTML = `
            <div class="no-rounds">
                <i class="fa-solid fa-golf-ball-tee"></i>
                <h3>No rounds logged yet</h3>
                <p>Add your first round using the form on the left to start tracking your golf progress!</p>
            </div>
        `;
        return;
    }

    // Render the rounds when we have data
    roundsList.innerHTML = roundsArray.map((round) => `
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

// Set edit mode function
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

// Reset form function
function resetForm() {
    const form = document.querySelector('form');
    form.reset();
    form.dataset.editId = '';
    document.getElementById('roundDate').valueAsDate = new Date();
    setEditMode(false);
    document.querySelectorAll('.round-row').forEach(row => row.classList.remove('editing'));
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();

    // Get form values
    const date = document.getElementById('roundDate').value;
    const course = document.getElementById('courseSelect').value;
    const score = parseInt(document.getElementById('scoreInput').value);
    const notes = document.getElementById('notes').value;
    const holes = document.getElementById('holesSelect').value;
    const editId = document.querySelector('form').dataset.editId;

    try {
        // Ensure user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            console.error('User authentication error:', userError);
            window.location.href = 'login.html';
            return;
        }
        if (!user) {
            console.error('No authenticated user');
            window.location.href = 'login.html';
            return;
        }

        let result;

        if (editId) {
            // Update existing round
            console.log('Attempting to update round with details:', {
                id: editId,
                date,
                course,
                score,
                notes,
                holes,
                user_id: user.id
            });

            // First, verify the round exists and belongs to the user
            const { data: existingRound, error: fetchError } = await supabase
                .from('rounds')
                .select('*')
                .eq('id', editId)
                .eq('user_id', user.id)
                .single();

            if (fetchError) {
                console.error('Error finding round to update:', fetchError);
                throw fetchError;
            }

            // Perform the update
            result = await supabase
                .from('rounds')
                .update({
                    date,
                    course,
                    score,
                    notes,
                    holes
                })
                .eq('id', editId)
                .eq('user_id', user.id);
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
                    user_id: user.id
                }]);
        }

        // Check for errors
        if (result.error) {
            console.error('Form submission error:', result.error);
            throw result.error;
        }

        // Reset form and reload rounds
        resetForm();
        await loadRounds();
    } catch (error) {
        console.error('Complete form submission error:', error);
        alert(`Error: ${error.message}`);
    }
}

// Set up event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up the menu functionality with improved reliability
    const menuButton = document.querySelector('.menu-button');
    const menuDropdown = document.querySelector('.menu-dropdown');

    if (menuButton && menuDropdown) {
        // Toggle menu when the button is clicked
        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
            console.log('Menu toggled:', menuDropdown.classList.contains('show'));
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (menuDropdown.classList.contains('show')) {
                if (!menuDropdown.contains(e.target) && !menuButton.contains(e.target)) {
                    menuDropdown.classList.remove('show');
                }
            }
        });

        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuDropdown.classList.contains('show')) {
                menuDropdown.classList.remove('show');
            }
        });
    } else {
        console.error('Menu elements not found!');
    }

    // Sign Out functionality - UPDATED
    const signOutButton = document.getElementById('signOut');
    if (signOutButton) {
        signOutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Sign out button clicked');
            await signOut();
        });
    }

    // Form submission
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Set initial date
    const dateInput = document.getElementById('roundDate');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }

    // Initialize the application
    initializeApp();
});

// Logging for debugging
console.log('Script loaded and ready');
