import { loadNotes } from './notes.js';
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
        document.getElementById('notes').value = round.notes || '';
        
        // Set incomplete round checkbox if available
        const incompleteCheckbox = document.getElementById('incompleteRound');
        if (incompleteCheckbox) {
            incompleteCheckbox.checked = round.is_incomplete || false;
            
            // Trigger change event to update form visibility
            const event = new Event('change');
            incompleteCheckbox.dispatchEvent(event);
        }
        
        // Only set score if it's not an incomplete round
        if (!round.is_incomplete) {
            document.getElementById('scoreInput').value = round.score;
        }

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

// Modify the form to handle incomplete rounds
function setupIncompleteRoundsUI() {
    // Add checkbox for incomplete round
    const scoreFormGroup = document.getElementById('scoreInput').closest('.form-group');
    const incompleteCheckboxHTML = `
      <div class="form-group incomplete-round-toggle">
        <label class="checkbox-container">
          <input type="checkbox" id="incompleteRound">
          <span class="checkmark"></span>
          Track as incomplete round (no score)
        </label>
      </div>
    `;
    
    // Insert the checkbox before the score input
    scoreFormGroup.insertAdjacentHTML('beforebegin', incompleteCheckboxHTML);
    
    // Add event listener to toggle score input visibility
    const incompleteCheckbox = document.getElementById('incompleteRound');
    incompleteCheckbox.addEventListener('change', function() {
      const scoreInput = document.getElementById('scoreInput');
      const scoreLabel = scoreInput.closest('.form-group').querySelector('label');
      
      if (this.checked) {
        // Hide score input when incomplete is checked
        scoreInput.closest('.form-group').style.display = 'none';
        scoreInput.removeAttribute('required');
      } else {
        // Show score input when incomplete is unchecked
        scoreInput.closest('.form-group').style.display = 'block';
        scoreInput.setAttribute('required', 'required');
      }
    });
    
    // Add CSS for the checkbox
    const style = document.createElement('style');
    style.textContent = `
      .incomplete-round-toggle {
        margin-bottom: 10px;
      }
      
      .checkbox-container {
        display: block;
        position: relative;
        padding-left: 35px;
        cursor: pointer;
        user-select: none;
      }
      
      .checkbox-container input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
      }
      
      .checkmark {
        position: absolute;
        top: 0;
        left: 0;
        height: 22px;
        width: 22px;
        background-color: #1e293b;
        border: 1px solid #475569;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .checkbox-container:hover input ~ .checkmark {
        background-color: #2c3e50;
      }
      
      .checkbox-container input:checked ~ .checkmark {
        background-color: var(--primary-green);
        border-color: var(--primary-green);
      }
      
      .checkmark:after {
        content: "";
        position: absolute;
        display: none;
      }
      
      .checkbox-container input:checked ~ .checkmark:after {
        display: block;
      }
      
      .checkbox-container .checkmark:after {
        left: 8px;
        top: 4px;
        width: 5px;
        height: 10px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    `;
    document.head.appendChild(style);
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
    
    // Filter out incomplete rounds for statistics calculation
    const completedRounds = roundsArray.filter(round => !round.is_incomplete);
    
    // Display total count (including incomplete rounds)
    document.getElementById('totalRounds').textContent = roundsArray.length;
    
    if (completedRounds.length === 0) {
        // No completed rounds, show placeholder values
        document.getElementById('avgScore').textContent = '-';
        document.getElementById('bestScore').textContent = '-';
        return;
    }

    // Separate rounds by hole count
    const nineHoleRounds = completedRounds.filter(round => round.holes === '9 Holes');
    const eighteenHoleRounds = completedRounds.filter(round => round.holes !== '9 Holes');
    
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
    const trend18 = calculateTrend(completedRounds, false);
    const trend9 = calculateTrend(completedRounds, true);
    
    // Update the average score display with separate 9-hole and 18-hole averages and round counts
    if (document.getElementById('avgScore')) {
        let avgScoreHTML = '';
        
        // Get counts for each category
        const nineHoleCount = nineHoleRounds.length;
        const eighteenHoleCount = eighteenHoleRounds.length;
        
        // 18-hole average with count
        avgScoreHTML += `18 Holes: ${avgEighteenHoleScore}`;
        if (eighteenHoleCount > 0) {
            avgScoreHTML += ` <small>(${eighteenHoleCount} rounds)</small>`;
        }
        
        // Use divider like in best score
        avgScoreHTML += '<span class="score-divider"></span>';
        
        // 9-hole average with count
        avgScoreHTML += `9 Holes: ${avgNineHoleScore}`;
        if (nineHoleCount > 0) {
            avgScoreHTML += ` <small>(${nineHoleCount} rounds)</small>`;
        }
        
        document.getElementById('avgScore').innerHTML = avgScoreHTML;
    }
    
    // Update best score display to show both categories with course and date
    if (document.getElementById('bestScore')) {
        let bestScoreHTML = '';
        
        if (bestEighteenHoleScore !== '-') {
            bestScoreHTML += `18 Holes: ${bestEighteenHoleScore}<br><small>${bestEighteenHoleCourse} (${bestEighteenHoleDate})</small>`;
        } else {
            bestScoreHTML += `18 Holes: -<br><small>No rounds played</small>`;
        }
        
        // Use a smaller gap between the two sections
        bestScoreHTML += '<span class="score-divider"></span>';
        
        if (bestNineHoleScore !== '-') {
            bestScoreHTML += `9 Holes: ${bestNineHoleScore}<br><small>${bestNineHoleCourse} (${bestNineHoleDate})</small>`;
        } else {
            bestScoreHTML += `9 Holes: -<br><small>No rounds played</small>`;
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
                font-size: 18px;
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

// Modified renderRounds function with consistent card spacing
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
        <div class="round-row ${round.is_incomplete ? 'incomplete-round' : ''}" data-round-id="${round.id}">
            <div class="date">${formatDateCorrectly(round.date)}</div>
            <div class="course">${round.course}</div>
            <div class="score">
                ${round.is_incomplete 
                ? '<span class="incomplete-badge">Incomplete</span>' 
                : round.score}
            </div>
            <div class="notes collapsed" onclick="toggleNotesExpansion(this)" style="cursor:pointer;">
                <div class="notes-content" title="${round.notes || ''}">${round.notes || ''}</div>
                ${round.notes && round.notes.length > 50 ? '<div class="expand-indicator">+ Show More</div>' : ''}
            </div>
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

    // Add necessary CSS for consistent card styling
    if (!document.getElementById('fixed-ui-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'fixed-ui-styles';
        styleEl.textContent = `
            /* ===== FIXED UI STYLES ===== */
            
            /* Override card styles to match both cards */
            .card {
                background-color: #2A3541;
                border-radius: 12px;
                overflow: hidden;
                margin-bottom: 24px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                border: none !important;
                transform: none !important;
            }
            
            /* Remove all card header background and special card styles */
            .card:first-of-type {
                border: none !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
                transform: none !important;
            }
            
            .card-title, .card-header {
                background-color: transparent !important;
                color: white !important;
                padding: 8px 24px 24px !important;
                font-size: 32px !important;
                font-weight: 600 !important;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                margin-bottom: 0 !important;
            }
            
            .card .icon {
                margin-right: 10px;
            }
            
            /* Consistent form padding */
            .card form {
                padding: 24px;
            }
            
            /* Form styles */
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 12px;
                font-weight: 500;
                color: #E0E0E0;
            }
            
            /* Rounds table consistent styling */
            .rounds-table {
                
            }
            
            /* Header row styling */
            .rounds-header {
                display: grid;
                grid-template-columns: 0.8fr 1.2fr 0.6fr 2fr 0.6fr;
                padding: 0 0 12px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .rounds-header > div {
                color: #94A3B8;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                padding: 8px;
            }
            
            /* Data row styling */
            .round-row {
                display: grid;
                grid-template-columns: 0.8fr 1.2fr 0.6fr 2fr 0.6fr;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                align-items: left;
            }
            
            .round-row > div {
                padding: 8px;
                color: #E0E0E0;
            }
            
            /* Score styling */
            .round-row .score {
                color: #4CAF50;
                font-weight: 600;
            }
            
            /* Notes styling */
            .notes.collapsed .notes-content {
                max-height: 2.8em;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                line-height: 1.4;
            }
            
            .notes.expanded .notes-content {
                max-height: none;
                display: block;
            }
            
            .expand-indicator {
                font-size: 12px;
                color: #4CAF50;
                margin-top: 4px;
                font-weight: 500;
            }
            
            /* Save button styling */
            .save-btn {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 20px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 8px;
                width: auto;
                max-width: 200px;
            }
            
            /* Action buttons styling */
            .action-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-start;
            }
            
            .action-buttons button {
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
            }
            
            .edit-btn {
                background: rgba(59, 130, 246, 0.1);
                color: #3b82f6;
                border: none;
                cursor: pointer;
            }
            
            .delete-btn {
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444; 
                border: none;
                cursor: pointer;
            }
            
            /* Incomplete round styling */
            .incomplete-round {
                background-color: rgba(255, 255, 255, 0.03);
            }
            
            .incomplete-badge {
                display: inline-block;
                background-color: #334155;
                color: #94a3b8;
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 12px;
                font-weight: 500;
            }
        `;
        document.head.appendChild(styleEl);
    }
}

window.toggleNotesExpansion = function(noteElement) {
    const wasCollapsed = noteElement.classList.contains('collapsed');
    
    // Toggle the class
    noteElement.classList.toggle('collapsed');
    noteElement.classList.toggle('expanded');
    
    // Update the indicator text
    const indicator = noteElement.querySelector('.expand-indicator');
    if (indicator) {
        indicator.textContent = wasCollapsed ? '- Show Less' : '+ Show More';
    }
    
    // Stop event propagation to prevent triggering edit on click
    event.stopPropagation();
};

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
    
    // Reset incomplete round checkbox
    const incompleteCheckbox = document.getElementById('incompleteRound');
    if (incompleteCheckbox) {
        incompleteCheckbox.checked = false;
        
        // Show score input
        const scoreInput = document.getElementById('scoreInput');
        if (scoreInput) {
            scoreInput.closest('.form-group').style.display = 'block';
            scoreInput.setAttribute('required', 'required');
        }
    }
}

// Form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();

    // Get form values
    const date = document.getElementById('roundDate').value;
    const course = document.getElementById('courseSelect').value;
    const notes = document.getElementById('notes').value;
    const holes = document.getElementById('holesSelect').value;
    const editId = document.querySelector('form').dataset.editId;
    
    // Check if this is an incomplete round
    const isIncomplete = document.getElementById('incompleteRound')?.checked || false;
    
    // Only get score if it's not an incomplete round
    const score = isIncomplete ? null : parseInt(document.getElementById('scoreInput').value);

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
        
        // Prepare round data object
        const roundData = {
            date,
            course,
            notes,
            holes,
            is_incomplete: isIncomplete
        };
        
        // Only include score if it's not an incomplete round
        if (!isIncomplete) {
            roundData.score = score;
        }

        if (editId) {
            // Update existing round
            console.log('Attempting to update round with details:', {
                id: editId,
                ...roundData,
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
               .update(roundData)
               .eq('id', editId)
               .eq('user_id', user.id);
       } else {
           // Insert new round with user_id
           roundData.user_id = user.id;
           result = await supabase
               .from('rounds')
               .insert([roundData]);
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

   // Set up the incomplete rounds UI
   setupIncompleteRoundsUI();

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