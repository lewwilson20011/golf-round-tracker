// Add Note Feature JavaScript
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
  // Set up event listeners for the Add a Note feature
  setupAddNoteFeature();
});

function setupAddNoteFeature() {
  console.log('Setting up Add Note feature...');
  
  // Get references to the button, modal, and close button
  const addNoteFeatureBtn = document.getElementById('addNoteFeatureBtn');
  const addNoteModal = document.getElementById('addNoteModal');
  const closeModalBtn = addNoteModal?.querySelector('.close-modal');
  const noteForm = document.getElementById('noteForm');
  
  // Check if elements exist (they might not on some pages)
  if (!addNoteFeatureBtn || !addNoteModal) {
    console.log('Add Note feature elements not found on this page');
    return;
  }
  
  // Open modal when the feature button is clicked
  addNoteFeatureBtn.addEventListener('click', function() {
    addNoteModal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    
    // Focus the textarea
    setTimeout(() => {
      document.getElementById('noteContent')?.focus();
    }, 100);
  });
  
  // Close modal when the close button is clicked
  closeModalBtn?.addEventListener('click', function() {
    closeNoteModal();
  });
  
  // Close modal when clicking outside of it
  window.addEventListener('click', function(event) {
    if (event.target === addNoteModal) {
      closeNoteModal();
    }
  });
  
  // Handle form submission
  noteForm?.addEventListener('submit', async function(e) {
    e.preventDefault();
    await saveNote();
  });
  
  // Also attach the initialization to the Track Your Rounds button
  const trackRoundsBtn = document.querySelector('.cta-button');
  if (trackRoundsBtn) {
    const originalText = trackRoundsBtn.textContent;
    trackRoundsBtn.innerHTML = `${originalText} <span class="new-badge">NEW: NOTES</span>`;
  }
  
  console.log('Add Note feature setup complete');
}

// Close the note modal
function closeNoteModal() {
  const addNoteModal = document.getElementById('addNoteModal');
  if (addNoteModal) {
    addNoteModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
  }
}

// Save a new note
async function saveNote() {
  const noteContent = document.getElementById('noteContent')?.value.trim();
  const noteCategory = document.getElementById('noteCategory')?.value;
  
  if (!noteContent) {
    alert('Please enter some text for your note');
    return;
  }
  
  try {
    // Show loading state
    const saveBtn = document.querySelector('.save-btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    // Get the current user
    const { data, error: authError } = await supabase.auth.getUser();
    
    if (authError || !data.user) {
      throw new Error('You must be logged in to add notes');
    }
    
    // Insert the note into the database
    const { error } = await supabase
      .from('golf_notes')
      .insert([
        {
          user_id: data.user.id,
          content: noteContent,
          category: noteCategory || 'general'
        }
      ]);
    
    if (error) {
      throw error;
    }
    
    // Reset form and close modal
    document.getElementById('noteContent').value = '';
    document.getElementById('noteCategory').value = 'general';
    
    // Show success briefly before closing
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
    saveBtn.style.backgroundColor = '#10b981';
    
    setTimeout(() => {
      closeNoteModal();
      
      // Show success message
      showNotification('Note saved successfully!');
      
      // Reset button
      setTimeout(() => {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
        saveBtn.style.backgroundColor = '';
      }, 500);
      
      // If we're on a page with the notes list, refresh it
      if (typeof loadNotes === 'function') {
        loadNotes();
      } else {
        // If we're not on the notes page, show a link to view notes
        showViewNotesPrompt();
      }
    }, 1000);
    
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Error saving note: ' + error.message);
    
    // Reset button
    const saveBtn = document.querySelector('.save-btn');
    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Note';
    saveBtn.disabled = false;
  }
}

// Show a notification popup
function showNotification(message) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#10b981';
    notification.style.color = 'white';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.zIndex = '1000';
    notification.style.transform = 'translateY(100px)';
    notification.style.opacity = '0';
    notification.style.transition = 'all 0.3s ease-out';
    document.body.appendChild(notification);
  }
  
  // Update message and show
  notification.textContent = message;
  
  // Trigger animation
  setTimeout(() => {
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateY(100px)';
      notification.style.opacity = '0';
    }, 3000);
  }, 10);
}

// Show a prompt to view notes after adding one
function showViewNotesPrompt() {
  // Create prompt if it doesn't exist
  let prompt = document.getElementById('viewNotesPrompt');
  if (!prompt) {
    prompt = document.createElement('div');
    prompt.id = 'viewNotesPrompt';
    prompt.style.position = 'fixed';
    prompt.style.bottom = '20px';
    prompt.style.left = '50%';
    prompt.style.transform = 'translateX(-50%) translateY(100px)';
    prompt.style.backgroundColor = 'white';
    prompt.style.color = '#1e293b';
    prompt.style.padding = '15px 20px';
    prompt.style.borderRadius = '8px';
    prompt.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    prompt.style.zIndex = '1000';
    prompt.style.opacity = '0';
    prompt.style.transition = 'all 0.3s ease-out';
    prompt.style.display = 'flex';
    prompt.style.alignItems = 'center';
    prompt.style.gap = '15px';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#64748b';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.padding = '0';
    closeBtn.style.lineHeight = '1';
    
    closeBtn.addEventListener('click', function() {
      prompt.style.transform = 'translateX(-50%) translateY(100px)';
      prompt.style.opacity = '0';
    });
    
    prompt.innerHTML = `
      <div>
        <div style="font-weight: 600; margin-bottom: 5px;">Note saved successfully!</div>
        <div>View and manage all your notes on the tracker page.</div>
      </div>
      <a href="#" id="viewNotesLink" style="display: inline-block; padding: 8px 16px; background-color: var(--primary-green); color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
        View Notes
      </a>
    `;
    prompt.appendChild(closeBtn);
    
    document.body.appendChild(prompt);
    
    // Setup view notes link
    document.getElementById('viewNotesLink')?.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'index.html#notes-section';
    });
  }
  
  // Show the prompt
  setTimeout(() => {
    prompt.style.transform = 'translateX(-50%) translateY(0)';
    prompt.style.opacity = '1';
    
    // Hide after 6 seconds
    setTimeout(() => {
      prompt.style.transform = 'translateX(-50%) translateY(100px)';
      prompt.style.opacity = '0';
    }, 6000);
  }, 10);
}

// Add the init function to window (for global access)
window.initAddNoteFeature = setupAddNoteFeature;

// Call initialization
setupAddNoteFeature();
