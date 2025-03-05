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

// Format date correctly (fixing the one day off issue)
function formatDateCorrectly(dateString) {
    // Create a date object using the input string
    const date = new Date(dateString);
    // Add one day to account for timezone issues
    date.setDate(date.getDate() + 1);
    // Format it as a localized string
    return date.toLocaleDateString();
}

// Calculate trend direction (up is good, down is bad, flat is neutral)
function calculateTrend(rounds, isNineHole = false) {
    // Filter rounds by hole count
    const filteredRounds = rounds.filter(round => {
        return isNineHole ? round.holes === '9 Holes' : round.holes !== '9 Holes';
    });
    
    // Need at least 2 rounds to establish a trend
    if (filteredRounds.length < 2) {
        return 'neutral';
    }
    
    // Sort by date, most recent first
    const sortedRounds = [...filteredRounds].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Get the average of the 3 most recent rounds (or fewer if we don't have 3)
    const recentRoundsCount = Math.min(3, sortedRounds.length);
    const recentRounds = sortedRounds.slice(0, recentRoundsCount);
    const recentAvg = recentRounds.reduce((sum, r) => sum + r.score, 0) / recentRounds.length;
    
    // Get the average of the rounds before that (up to 3)
    const olderRoundsCount = Math.min(3, Math.max(0, sortedRounds.length - recentRoundsCount));
    if (olderRoundsCount === 0) return 'neutral'; // Not enough data for comparison
    
    const olderRounds = sortedRounds.slice(recentRoundsCount, recentRoundsCount + olderRoundsCount);
    const olderAvg = olderRounds.reduce((sum, r) => sum + r.score, 0) / olderRounds.length;
    
    // Calculate the difference - for golf, lower is better
    const difference = olderAvg - recentAvg;
    
    if (Math.abs(difference) < 1) {
        return 'neutral'; // Less than 1 stroke difference is considered neutral
    } else if (difference > 0) {
        return 'improving'; // Recent scores are lower (better)
    } else {
        return 'worsening'; // Recent scores are higher (worse)
    }
}

// Get HTML for trend arrow
function getTrendArrowHTML(trend) {
    if (trend === 'improving') {
        return '<span class="trend-arrow improving"><i class="fa-solid fa-arrow-down"></i></span>';
    } else if (trend === 'worsening') {
        return '<span class="trend-arrow worsening"><i class="fa-solid fa-arrow-up"></i></span>';
    } else {
        return '<span class="trend-arrow neutral"><i class="fa-solid fa-minus"></i></span>';
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

    // Separate rounds by hole count
    const nineHoleRounds = roundsArray.filter(round => round.holes === '9 Holes');
    const eighteenHoleRounds = roundsArray.filter(round => round.holes !== '9 Holes');
    
    // Calculate average scores for both categories separately
    let avgNineHoleScore = '-';
    let avgEighteenHoleScore = '-';
    
    if (nineHoleRounds.length > 0) {
        const totalNineHoleScore = nineHoleRounds.reduce((sum, round) => sum + round.score, 0);
        avgNineHoleScore = Math.round(totalNineHoleScore / nineHoleRounds.length);
    }
    
    if (eighteenHoleRounds.length > 0) {
        const totalEighteenHoleScore = eighteenHoleRounds.reduce((sum, round) => sum + round.score, 0);
        avgEighteenHoleScore = Math.round(totalEighteenHoleScore / eighteenHoleRounds.length);
    }
    
    // Find best scores for each category and their corresponding details
    let bestNineHoleScore = '-';
    let bestNineHoleCourse = '';
    let bestNineHoleDate = '';
    
    let bestEighteenHoleScore = '-';
    let bestEighteenHoleCourse = '';
    let bestEighteenHoleDate = '';
    
    if (nineHoleRounds.length > 0) {
        // Find the round with the lowest score
        const bestNineHoleRound = nineHoleRounds.reduce((best, current) => 
            (current.score < best.score) ? current : best, nineHoleRounds[0]);
        
        bestNineHoleScore = bestNineHoleRound.score;
        bestNineHoleCourse = bestNineHoleRound.course;
        bestNineHoleDate = formatDateCorrectly(bestNineHoleRound.date);
    }
    
    if (eighteenHoleRounds.length > 0) {
        // Find the round with the lowest score
        const bestEighteenHoleRound = eighteenHoleRounds.reduce((best, current) => 
            (current.score < best.score) ? current : best, eighteenHoleRounds[0]);
        
        bestEighteenHoleScore = bestEighteenHoleRound.score;
        bestEighteenHoleCourse = bestEighteenHoleRound.course;
        bestEighteenHoleDate = formatDateCorrectly(bestEighteenHoleRound.date);
    }
    
    // Calculate trends for both 9 and 18 holes
    const trend18 = calculateTrend(roundsArray, false);
    const trend9 = calculateTrend(roundsArray, true);
    
    // Update the average score display with separate 9-hole and 18-hole averages
    if (document.getElementById('avgScore')) {
        let avgScoreHTML = '';
        
        // 18-hole average with trend arrow
        avgScoreHTML += `18: ${avgEighteenHoleScore} ${getTrendArrowHTML(trend18)}`;
        
        // Divider between averages
        avgScoreHTML += `<span class="score-divider"></span>`;
        
        // 9-hole average with trend arrow
        avgScoreHTML += `9: ${avgNineHoleScore} ${getTrendArrowHTML(trend9)}`;
        
        document.getElementById('avgScore').innerHTML = avgScoreHTML;
    }
    
    // Update best score display to show both categories with course and date
    if (document.getElementById('bestScore')) {
        let bestScoreHTML = '';
        
        if (bestEighteenHoleScore !== '-') {
            bestScoreHTML += `18: ${bestEighteenHoleScore}<br><small>${bestEighteenHoleCourse} (${bestEighteenHoleDate})</small>`;
        } else {
            bestScoreHTML += `18: -<br><small>No rounds played</small>`;
        }
        
        // Use a smaller gap between the two sections
        bestScoreHTML += '<span class="score-divider"></span>';
        
        if (bestNineHoleScore !== '-') {
            bestScoreHTML += `9: ${bestNineHoleScore}<br><small>${bestNineHoleCourse} (${bestNineHoleDate})</small>`;
        } else {
            bestScoreHTML += `9: -<br><small>No rounds played</small>`;
        }
        
        document.getElementById('bestScore').innerHTML = bestScoreHTML;
        
        // Add styling for stats cards and trend arrows
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .stat-value small {
                font-size: 11px;
                color: #94a3b8;
                font-weight: normal;
                display: block;
                line-height: 1.1;
                margin-top: 0;
                margin-bottom: 4px;
            }
            #bestScore, #avgScore {
                font-size: 20px;
                line-height: 1.2;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .score-divider {
                height: 1px;
                background-color: rgba(255, 255, 255, 0.1);
                margin: 2px 0;
                width: 100%;
            }
            .trend-arrow {
                display: inline-block;
                margin-left: 6px;
                font-size: 14px;
            }
            .trend-arrow.improving {
                color: #22c55e; /* Green for improvement */
            }
            .trend-arrow.worsening {
                color: #ef4444; /* Red for getting worse */
            }
            .trend-arrow.neutral {
                color: #94a3b8; /* Gray for neutral */
            }
        `;
        document.head.appendChild(styleElement);
    }
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
            <div class="date">${formatDateCorrectly(round.date)}</div>
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