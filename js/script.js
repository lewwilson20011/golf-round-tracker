import { supabase } from './supabase.js';

let currentUser = null;

// Enhanced error handling function
function handleError(context, error) {
    console.error(`Error in ${context}:`, error);
    alert(`Error in ${context}: ${error.message || 'Unknown error'}`);
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
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        updateUserInterface();
        
        // Check user settings for dark mode
        await loadUserSettings();
        
        await loadCourses();
        await loadRounds();
    } catch (error) {
        handleError('initializeApp', error);
        // Redirect to login in case of any authentication issues
        window.location.href = 'login.html';
    }
}

// Load user settings
async function loadUserSettings() {
    try {
        // Get user settings from Supabase
        const { data: settings, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            throw error;
        }

        // If user has dark mode enabled, apply it
        if (settings && settings.dark_mode) {
            document.body.classList.add('dark-mode');
        }
        
        // If animations are disabled, apply that setting
        if (settings && settings.animations === false) {
            const style = document.createElement('style');
            style.id = 'disable-animations';
            style.textContent = `
                * {
                    animation: none !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    } catch (error) {
        console.error('Load settings error:', error);
        // Non-critical error, don't alert the user
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
            throw userError;
        }
        if (!user) {
            console.error('No authenticated user');
            throw new Error('No authenticated user');
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

            console.log('Full update result:', result);

            // Check for specific error details
            if (result.error) {
                console.error('Update error details:', {
                    message: result.error.message,
                    details: result.error.details,
                    hint: result.error.hint
                });
                throw result.error;
            }
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

            console.log('Insert result:', result);
        }

        // Check for errors
        if (result.error) {
            console.error('Form submission error:', result.error);
            throw result.error;
        }

        // Reset form and reload rounds
        resetForm();
        await loadRounds();
        
        // Auto-update handicap if the setting is enabled
        await updateHandicapIfEnabled(user.id);
    } catch (error) {
        console.error('Complete form submission error:', error);
        alert(`Error: ${error.message}`);
    }
}

// Update handicap if auto-handicap setting is enabled
async function updateHandicapIfEnabled(userId) {
    try {
        // Check if auto-handicap is enabled
        const { data: settings, error: settingsError } = await supabase
            .from('user_settings')
            .select('auto_handicap')
            .eq('user_id', userId)
            .single();
            
        if (settingsError && settingsError.code !== 'PGRST116') {
            throw settingsError;
        }
        
        // If no settings or auto_handicap is disabled, do nothing
        if (!settings || settings.auto_handicap === false) {
            return;
        }
        
        // Get all rounds for handicap calculation
        const { data: rounds, error: roundsError } = await supabase
            .from('rounds')
            .select('score, holes')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(20); // Last 20 rounds
            
        if (roundsError) throw roundsError;
        
        if (!rounds || rounds.length === 0) {
            return; // No rounds to calculate handicap
        }
        
        // Simple handicap calculation (this is a simplified example)
        // In reality, handicap calculation is more complex and involves course ratings
        const eighteenHoleRounds = rounds.filter(r => r.holes === '18 Holes' || r.holes === null);
        if (eighteenHoleRounds.length < 5) {
            return; // Not enough rounds for handicap calculation
        }
        
        // Calculate handicap based on best 8 of last 20 rounds
        const scores = eighteenHoleRounds.map(r => r.score).sort((a, b) => a - b);
        const bestScores = scores.slice(0, Math.min(8, scores.length));
        const avgBestScore = bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length;
        
        // Simplified formula: (avg of best scores - 72) * 0.96
        // 72 is representing a standard course par
        const handicap = Math.max(0, ((avgBestScore - 72) * 0.96).toFixed(1));
        
        // Update user profile with new handicap
        const { error: updateError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                handicap: handicap,
                updated_at: new Date()
            });
            
        if (updateError) throw updateError;
        
    } catch (error) {
        console.error('Auto-handicap update error:', error);
        // Non-critical error, don't alert the user
    }
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

    // Sign Out functionality
    document.getElementById('signOut').addEventListener('click', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        }
    });

    // Form submission
    const form = document.querySelector('form');
    form.addEventListener('submit', handleFormSubmit);

    // Set initial date
    document.getElementById('roundDate').valueAsDate = new Date();

    // Initialize the application
    initializeApp();
});

// Logging for debugging
console.log('Script loaded');