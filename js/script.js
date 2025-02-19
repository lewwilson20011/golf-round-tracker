import {
  supabase
} from './supabase.js';

let currentUser = null;

// Load courses from Supabase
async function loadCourses() {
  try {
    const {
      data: courses,
      error
    } = await supabase
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

// Add this to your initializeApp function:
async function initializeApp() {
  // Check if user is authenticated
  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = user;
  updateUserInterface();
  await loadCourses(); // Add this line
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
    const {
      data: rounds,
      error
    } = await supabase
      .from('rounds')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', {
        ascending: false
      });

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

// Handle save round form submission
async function handleSaveRound(e) {
  e.preventDefault();

  const date = document.getElementById('roundDate').value;
  const course = document.getElementById('courseSelect').value;
  const score = parseInt(document.getElementById('scoreInput').value);
  const notes = document.getElementById('notes').value;
  const holes = document.getElementById('holesSelect').value;

  if (!date || !course || !score) {
    alert('Please fill in all required fields');
    return;
  }

  try {
    const roundData = {
      date,
      course,
      score,
      notes,
      holes,
      user_id: currentUser.id
    };
    console.log('Current user:', currentUser);
    console.log('Round data to save:', JSON.stringify(roundData, null, 2));

    const {
      data,
      error
    } = await supabase
      .from('rounds')
      .insert(roundData);

    if (error) {
      console.log('Full error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('Save successful:', data);

    // Reset form
    document.getElementById('roundDate').valueAsDate = new Date();
    document.getElementById('courseSelect').value = '';
    document.getElementById('scoreInput').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('holesSelect').value = '18 Holes';

    // Reload rounds immediately
    await loadRounds();
  } catch (error) {
    console.log('Caught error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    alert('Error saving round. Check browser console for details.');
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
            <div>
                <button class="delete-btn" onclick="deleteRound('${round.id}')">
    <i class="fa-solid fa-trash"></i>
    Delete
</button>
            </div>
        </div>
    `).join('');
}

// Make deleteRound available globally right at the top after currentUser
let currentUser = null;

// Add this right after
window.deleteRound = async (id) => {
    try {
        const { error } = await supabase
            .from('rounds')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting round:', error);
            alert('Error deleting round');
            return;
        }

        loadRounds(); // Reload the rounds after deletion
    } catch (error) {
        console.error('Error:', error);
        alert('Error deleting round');
    }
};

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
    const {
      error
    } = await supabase.auth.signOut();
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

    try {
      const {
        data,
        error
      } = await supabase
        .from('rounds')
        .insert([{
          date,
          course,
          score,
          notes,
          holes,
          user_id: currentUser.id
        }]);

      if (error) throw error;

      // Reset form
      form.reset();
      document.getElementById('roundDate').valueAsDate = new Date();

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

// Make deleteRound available globally
window.deleteRound = deleteRound;

// Initialize the application
initializeApp();

// Export for global use
window.handleSaveRound = handleSaveRound;
