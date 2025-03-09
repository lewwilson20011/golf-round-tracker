// statistics.js - Functionality for the statistics page
import { supabase } from './supabase.js';

// Global variables
let allRounds = [];
let filteredRounds = [];
let courses = [];
let currentUser = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Statistics page loaded');
    await initializeApp();
});

// Initialize the application
async function initializeApp() {
    try {
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
        
        // Load rounds data
        await loadRounds();
        
        // Set up filters
        setupFilters();
        
        // Generate charts
        generateCharts();
        
        // Set up export button
        setupExportButton();
        
        console.log("Statistics initialization complete");
    } catch (error) {
        console.error("Initialization error:", error);
        // Show a more user-friendly error
        alert("There was an error loading your statistics. Please try again later.");
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
        if (!currentUser) {
            console.warn('No current user found');
            return;
        }

        const { data: rounds, error } = await supabase
            .from('rounds')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });

        if (error) throw error;

        // Make sure we have an array even if the result is null
        allRounds = rounds || [];
        filteredRounds = [...allRounds];
        
        // Extract unique courses
        courses = [...new Set(allRounds.map(round => round.course))].filter(Boolean);
        
        // Update statistics and data displays
        populateCoursesDropdown();
        updateStatistics();
        updateRoundHistoryTable();
        
        console.log(`Loaded ${allRounds.length} rounds from database`);
    } catch (error) {
        console.error('Error loading rounds:', error);
        alert(`Error loading your rounds: ${error.message}`);
    }
}

// Populate courses dropdown
function populateCoursesDropdown() {
    const courseFilter = document.getElementById('courseFilter');
    if (!courseFilter) return;
    
    // Clear existing options (keep the "All Courses" option)
    while (courseFilter.options.length > 1) {
        courseFilter.remove(1);
    }
    
    // Add an option for each course
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        courseFilter.appendChild(option);
    });
    
    console.log(`Populated courses dropdown with ${courses.length} courses`);
}

// Set up filter listeners
function setupFilters() {
    const dateRange = document.getElementById('dateRange');
    const courseFilter = document.getElementById('courseFilter');
    const holesFilter = document.getElementById('holesFilter');
    const compareFilter = document.getElementById('compareFilter');
    
    if (dateRange) dateRange.addEventListener('change', applyFilters);
    if (courseFilter) courseFilter.addEventListener('change', applyFilters);
    if (holesFilter) holesFilter.addEventListener('change', applyFilters);
    if (compareFilter) compareFilter.addEventListener('change', applyFilters);
    
    console.log('Filter listeners set up');
}

// Apply filters to rounds
function applyFilters() {
    const dateRange = document.getElementById('dateRange').value;
    const courseFilter = document.getElementById('courseFilter').value;
    const holesFilter = document.getElementById('holesFilter').value;
    
    // Start with all rounds
    let rounds = [...allRounds];
    
    // Apply date filter
    if (dateRange !== 'all') {
        const today = new Date();
        let cutoffDate = new Date();
        
        switch (dateRange) {
            case 'year':
                cutoffDate.setFullYear(today.getFullYear() - 1);
                break;
            case '6months':
                cutoffDate.setMonth(today.getMonth() - 6);
                break;
            case '3months':
                cutoffDate.setMonth(today.getMonth() - 3);
                break;
            case 'month':
                cutoffDate.setMonth(today.getMonth() - 1);
                break;
        }
        
        rounds = rounds.filter(round => new Date(round.date) >= cutoffDate);
    }
    
    // Apply course filter
    if (courseFilter !== 'all') {
        rounds = rounds.filter(round => round.course === courseFilter);
    }
    
    // Apply holes filter
    if (holesFilter !== 'all') {
        if (holesFilter === '18') {
            rounds = rounds.filter(round => round.holes === '18 Holes');
        } else if (holesFilter === '9') {
            rounds = rounds.filter(round => round.holes === '9 Holes');
        }
    }
    
    // Update filtered rounds
    filteredRounds = rounds;
    
    // Update UI
    updateStatistics();
    updateRoundHistoryTable();
    updateCharts();
    
    console.log(`Applied filters: ${filteredRounds.length} rounds match criteria`);
}

// Update statistics based on filtered rounds
function updateStatistics() {
    // Skip if no rounds available
    if (filteredRounds.length === 0) {
        // Update stat cards with no data
        updateEmptyStatCards();
        return;
    }
    
    // Calculate statistics for 18-hole rounds
    const rounds18 = filteredRounds.filter(round => round.holes === '18 Holes' || !round.holes);
    const rounds9 = filteredRounds.filter(round => round.holes === '9 Holes');
    
    // Calculate average scores
    let avg18Score = '-';
    let avg9Score = '-';
    
    if (rounds18.length > 0) {
        const total18Score = rounds18.reduce((sum, round) => sum + round.score, 0);
        avg18Score = (total18Score / rounds18.length).toFixed(1);
    }
    
    if (rounds9.length > 0) {
        const total9Score = rounds9.reduce((sum, round) => sum + round.score, 0);
        avg9Score = (total9Score / rounds9.length).toFixed(1);
    }
    
    // Find best scores
    let best18 = null;
    let best9 = null;
    
    if (rounds18.length > 0) {
        best18 = rounds18.reduce((best, current) => 
            (current.score < best.score) ? current : best, rounds18[0]);
    }
    
    if (rounds9.length > 0) {
        best9 = rounds9.reduce((best, current) => 
            (current.score < best.score) ? current : best, rounds9[0]);
    }
    
    // Calculate handicap (simplified)
    const handicap = calculateHandicap(rounds18);
    
    // Update stat cards
    
    // Average Score card
    const avgScoreCard = document.querySelector('.stat-card:nth-child(1)');
    if (avgScoreCard) {
        const valueEl = avgScoreCard.querySelector('.stat-card-value');
        const subtitleEl = avgScoreCard.querySelector('.stat-card-subtitle');
        
        if (valueEl) {
            // Show 18-hole avg by default, or 9-hole if no 18-hole data
            if (avg18Score !== '-') {
                valueEl.innerHTML = `${avg18Score}`;
                if (rounds18.length > 0) {
                    // Add trend indicator if multiple rounds
                    if (rounds18.length >= 3) {
                        const trend = calculateScoreTrend(rounds18);
                        const trendHTML = getTrendIndicatorHTML(trend);
                        valueEl.innerHTML += ` ${trendHTML}`;
                    }
                }
            } else if (avg9Score !== '-') {
                valueEl.innerHTML = `${avg9Score}`;
                if (rounds9.length > 0) {
                    // Add trend indicator if multiple rounds
                    if (rounds9.length >= 3) {
                        const trend = calculateScoreTrend(rounds9);
                        const trendHTML = getTrendIndicatorHTML(trend);
                        valueEl.innerHTML += ` ${trendHTML}`;
                    }
                }
            } else {
                valueEl.textContent = '-';
            }
        }
        
        if (subtitleEl) {
            if (rounds18.length > 0 && rounds9.length > 0) {
                subtitleEl.textContent = `Based on ${rounds18.length} 18-hole rounds and ${rounds9.length} 9-hole rounds`;
            } else if (rounds18.length > 0) {
                subtitleEl.textContent = `Based on ${rounds18.length} rounds (18 holes)`;
            } else if (rounds9.length > 0) {
                subtitleEl.textContent = `Based on ${rounds9.length} rounds (9 holes)`;
            } else {
                subtitleEl.textContent = 'No data available';
            }
        }
    }
    
    // Best Score card
    const bestScoreCard = document.querySelector('.stat-card:nth-child(2)');
    if (bestScoreCard) {
        const valueEl = bestScoreCard.querySelector('.stat-card-value');
        const subtitleEl = bestScoreCard.querySelector('.stat-card-subtitle');
        
        if (valueEl) {
            // Show best 18-hole score by default, or 9-hole if no 18-hole data
            if (best18) {
                valueEl.textContent = best18.score;
            } else if (best9) {
                valueEl.textContent = `${best9.score} (9 holes)`;
            } else {
                valueEl.textContent = '-';
            }
        }
        
        if (subtitleEl) {
            if (best18) {
                subtitleEl.textContent = `${best18.course} - ${formatDate(best18.date)}`;
            } else if (best9) {
                subtitleEl.textContent = `${best9.course} - ${formatDate(best9.date)}`;
            } else {
                subtitleEl.textContent = 'No data available';
            }
        }
    }
    
    // Handicap card
    const handicapCard = document.querySelector('.stat-card:nth-child(3)');
    if (handicapCard) {
        const valueEl = handicapCard.querySelector('.stat-card-value');
        const subtitleEl = handicapCard.querySelector('.stat-card-subtitle');
        
        if (valueEl) {
            valueEl.textContent = handicap !== null ? handicap.toFixed(1) : '-';
        }
        
        if (subtitleEl) {
            subtitleEl.textContent = rounds18.length > 0 ? 
                `Based on ${rounds18.length} rounds in filtered period` : 
                'Need 18-hole rounds to calculate';
        }
    }
    
    // Total Rounds card
    const totalRoundsCard = document.querySelector('.stat-card:nth-child(4)');
    if (totalRoundsCard) {
        const valueEl = totalRoundsCard.querySelector('.stat-card-value');
        const subtitleEl = totalRoundsCard.querySelector('.stat-card-subtitle');
        
        if (valueEl) {
            valueEl.textContent = filteredRounds.length;
        }
        
        if (subtitleEl) {
            const dateRange = document.getElementById('dateRange').value;
            let rangeText = 'Since you started tracking';
            
            if (dateRange === 'year') {
                rangeText = 'In the last 12 months';
            } else if (dateRange === '6months') {
                rangeText = 'In the last 6 months';
            } else if (dateRange === '3months') {
                rangeText = 'In the last 3 months';
            } else if (dateRange === 'month') {
                rangeText = 'In the last month';
            }
            
            subtitleEl.textContent = rangeText;
        }
    }
}

// Update stat cards when no data is available
function updateEmptyStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        const valueEl = card.querySelector('.stat-card-value');
        const subtitleEl = card.querySelector('.stat-card-subtitle');
        
        if (valueEl) {
            valueEl.textContent = '-';
        }
        
        if (subtitleEl) {
            subtitleEl.textContent = 'No data available';
        }
    });
}

// Calculate handicap (simplified version)
function calculateHandicap(rounds) {
    if (!rounds || rounds.length < 5) {
        return null; // Need at least 5 rounds for handicap calculation
    }
    
    // Sort rounds by score (best to worst)
    const sortedRounds = [...rounds].sort((a, b) => a.score - b.score);
    
    // Take the best 8 out of 20 rounds, or 40% of available rounds
    const numberOfScores = Math.min(20, sortedRounds.length);
    const numberOfBestScores = Math.max(1, Math.floor(numberOfScores * 0.4));
    
    // Calculate average of the best scores
    const bestScores = sortedRounds.slice(0, numberOfBestScores);
    const totalScore = bestScores.reduce((sum, round) => sum + round.score, 0);
    const averageScore = totalScore / bestScores.length;
    
    // A very simplified handicap formula: (average score - 72) * 0.96
    // 72 is assumed as par for standard 18-hole course
    const handicap = (averageScore - 72) * 0.96;
    
    return Math.max(0, handicap); // Ensure handicap is not negative
}

// Calculate score trend (improving, worsening, or neutral)
function calculateScoreTrend(rounds) {
    // Need at least 3 rounds for a trend
    if (!rounds || rounds.length < 3) {
        return 'neutral';
    }
    
    // Sort by date (most recent first)
    const sortedRounds = [...rounds].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Get average of the 3 most recent rounds
    const recentRounds = sortedRounds.slice(0, 3);
    const recentAvg = recentRounds.reduce((sum, r) => sum + r.score, 0) / recentRounds.length;
    
    // Get average of the previous 3 rounds (if available)
    if (sortedRounds.length < 6) {
        return 'neutral'; // Not enough data for comparison
    }
    
    const previousRounds = sortedRounds.slice(3, 6);
    const previousAvg = previousRounds.reduce((sum, r) => sum + r.score, 0) / previousRounds.length;
    
    // Calculate difference (in golf, lower is better)
    const difference = previousAvg - recentAvg;
    
    if (Math.abs(difference) < 2) {
        return 'neutral'; // Less than 2 stroke difference is considered neutral
    } else if (difference > 0) {
        return 'improving'; // Recent scores are lower (better)
    } else {
        return 'worsening'; // Recent scores are higher (worse)
    }
}

// Get HTML for trend indicator
function getTrendIndicatorHTML(trend) {
    if (trend === 'improving') {
        return '<span class="trend-indicator trend-down"><i class="fa-solid fa-arrow-down"></i> 2.1</span>';
    } else if (trend === 'worsening') {
        return '<span class="trend-indicator trend-up"><i class="fa-solid fa-arrow-up"></i> 2.3</span>';
    } else {
        return '<span class="trend-indicator trend-neutral"><i class="fa-solid fa-minus"></i></span>';
    }
}

// Update rounds history table
function updateRoundHistoryTable() {
    const tableBody = document.getElementById('roundHistoryTableBody');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // If no rounds, show empty message
    if (filteredRounds.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 6;
        emptyCell.textContent = 'No rounds match the selected filters';
        emptyCell.style.textAlign = 'center';
        emptyCell.style.fontStyle = 'italic';
        emptyCell.style.padding = '30px';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Sort rounds by date (newest first)
    const sortedRounds = [...filteredRounds].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Create rows for each round
    sortedRounds.forEach(round => {
        const row = document.createElement('tr');
        
        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(round.date);
        row.appendChild(dateCell);
        
        // Course cell
        const courseCell = document.createElement('td');
        courseCell.textContent = round.course;
        courseCell.className = 'course-name';
        row.appendChild(courseCell);
        
        // Holes cell
        const holesCell = document.createElement('td');
        holesCell.textContent = round.holes || '18 Holes';
        row.appendChild(holesCell);
        
        // Score cell
        const scoreCell = document.createElement('td');
        scoreCell.textContent = round.score;
        scoreCell.className = 'score-cell';
        row.appendChild(scoreCell);
        
        // +/- cell (based on assumed par of 72 for 18 holes or 36 for 9 holes)
        const parCell = document.createElement('td');
        const par = round.holes === '9 Holes' ? 36 : 72;
        const overUnder = round.score - par;
        parCell.textContent = overUnder === 0 ? 'E' : (overUnder > 0 ? `+${overUnder}` : overUnder);
        row.appendChild(parCell);
        
        // Notes cell
        const notesCell = document.createElement('td');
        notesCell.textContent = round.notes || '';
        row.appendChild(notesCell);
        
        tableBody.appendChild(row);
    });
}

// Generate charts
function generateCharts() {
    // If we're using a charting library like Chart.js, this is where we'd set up the charts
    console.log('Chart generation would happen here');
    
    // For now, we'll just display placeholder messages
    const scoreTrendChart = document.getElementById('scoreTrendChart');
    if (scoreTrendChart) {
        scoreTrendChart.innerHTML = '<p class="placeholder-text">Chart will be populated when data is available</p>';
    }
    
    const coursePerformanceChart = document.getElementById('coursePerformanceChart');
    if (coursePerformanceChart) {
        coursePerformanceChart.innerHTML = '<p class="placeholder-text">Chart will be populated when data is available</p>';
    }
}

// Update charts based on filtered data
function updateCharts() {
    // This would update the charts with new data based on applied filters
    console.log('Chart update would happen here');
}

// Set up export button
function setupExportButton() {
    const exportBtn = document.querySelector('.data-export-btn');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
}

// Export data to CSV
function exportData() {
    if (filteredRounds.length === 0) {
        alert('No data to export based on current filters');
        return;
    }
    
    // Create CSV content
    let csvContent = 'Date,Course,Holes,Score,Notes\n';
    
    filteredRounds.forEach(round => {
        // Format each field and handle commas in text fields
        const date = formatDate(round.date);
        const course = `"${(round.course || '').replace(/"/g, '""')}"`;
        const holes = round.holes || '18 Holes';
        const score = round.score;
        const notes = `"${(round.notes || '').replace(/"/g, '""')}"`;
        
        csvContent += `${date},${course},${holes},${score},${notes}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'round_tracker_data.csv');
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    
    // Handle potential timezone issues
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Export functions for testing
export {
    initializeApp,
    loadRounds,
    updateStatistics,
    calculateHandicap
};