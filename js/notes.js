// notes.js - Fixed version with improved display and edit functionality
import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', function() {
  console.log('Notes module initializing...');
  
  // Setup the Add Note button event handler
  const addNoteBtn = document.getElementById('addNoteBtn');
  if (addNoteBtn) {
    console.log('Add note button found, setting up click handler');
    addNoteBtn.addEventListener('click', addNote);
  } else {
    console.error('Add note button not found in the DOM');
  }
  
  // Load existing notes
  loadNotes();
});

// Simple function to add a note
async function addNote() {
  console.log('Add note button clicked');
  
  // Get the note content
  const noteInput = document.getElementById('newNote');
  if (!noteInput) {
    console.error('New note input element not found');
    return;
  }
  
  const noteContent = noteInput.value.trim();
  if (!noteContent) {
    alert('Please enter some text for your note');
    return;
  }
  
  try {
    // Get the current user directly from supabase
    const { data, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      alert('Authentication error. Please try logging in again.');
      return;
    }
    
    if (!data.user) {
      alert('You must be logged in to add notes');
      console.error('No user logged in');
      return;
    }
    
    const userId = data.user.id;
    console.log('Current user ID:', userId);
    console.log('Adding note with content:', noteContent);
    
    // Insert the note into the database
    const { error } = await supabase
      .from('golf_notes')
      .insert([
        {
          user_id: userId,
          content: noteContent
        }
      ]);
    
    if (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note: ' + error.message);
      return;
    }
    
    console.log('Note added successfully!');
    // Clear the input field
    noteInput.value = '';
    
    // Reload notes to show the new one
    loadNotes();
    
  } catch (error) {
    console.error('Exception when adding note:', error);
    alert('An error occurred while adding your note.');
  }
}

// Load notes from the database
async function loadNotes() {
  console.log('Loading notes...');
  
  const notesList = document.getElementById('notesList');
  if (!notesList) {
    console.error('Notes list element not found');
    return;
  }
  
  try {
    // Get the current user directly from supabase
    const { data, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      notesList.innerHTML = `
        <div class="empty-notes-state">
          <p>Error loading notes. Please try logging in again.</p>
        </div>
      `;
      return;
    }
    
    if (!data.user) {
      console.log('No user logged in, showing empty notes state');
      notesList.innerHTML = `
        <div class="empty-notes-state">
          <p>You need to be logged in to view your notes.</p>
        </div>
      `;
      return;
    }
    
    const userId = data.user.id;
    console.log('Loading notes for user:', userId);
    
    // Get the user's notes from the database
    const { data: notes, error } = await supabase
      .from('golf_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading notes:', error);
      notesList.innerHTML = `
        <div class="empty-notes-state">
          <p>Error loading notes. Please try again later.</p>
        </div>
      `;
      return;
    }
    
    console.log('Notes loaded:', notes ? notes.length : 0);
    
    // Handle empty notes
    if (!notes || notes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-notes-state">
          <p>No notes yet. Add your first note to keep track of your golf goals and tips.</p>
        </div>
      `;
      return;
    }
    
    // Display the notes
    notesList.innerHTML = '';
    notes.forEach(note => {
      const noteElement = document.createElement('div');
      noteElement.className = 'note-item';
      noteElement.dataset.id = note.id;
      
      const date = new Date(note.created_at);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      noteElement.innerHTML = `
        <div class="note-content">${note.content.replace(/\n/g, '<br>')}</div>
        <div class="note-meta">
          <div class="note-date">${formattedDate}</div>
          <div class="note-actions">
            <button class="edit-btn" title="Edit note">
              <i class="fa-solid fa-pencil"></i>
            </button>
            <button class="delete-btn" title="Delete note">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      
      notesList.appendChild(noteElement);
    });
    
    // Set up edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', function() {
        const noteItem = this.closest('.note-item');
        const noteId = noteItem.dataset.id;
        const content = noteItem.querySelector('.note-content').innerHTML.replace(/<br>/g, '\n');
        handleEditNote(noteItem, noteId, content);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', function() {
        const noteItem = this.closest('.note-item');
        const noteId = noteItem.dataset.id;
        if (confirm('Are you sure you want to delete this note?')) {
          deleteNote(noteId);
        }
      });
    });
    
  } catch (error) {
    console.error('Exception when loading notes:', error);
    notesList.innerHTML = `
      <div class="empty-notes-state">
        <p>An error occurred while loading your notes.</p>
      </div>
    `;
  }
}

// Handle editing a note
function handleEditNote(noteItem, noteId, content) {
  // Create edit form
  const editForm = document.createElement('div');
  editForm.className = 'note-edit-form';
  editForm.innerHTML = `
    <textarea class="edit-textarea">${content}</textarea>
    <div class="edit-buttons">
      <button class="cancel-edit-btn">Cancel</button>
      <button class="save-edit-btn">Save</button>
    </div>
  `;
  
  // Replace note content with edit form
  const noteContent = noteItem.querySelector('.note-content');
  noteContent.style.display = 'none';
  noteItem.insertBefore(editForm, noteContent.nextSibling);
  
  // Focus the textarea
  const textarea = editForm.querySelector('textarea');
  textarea.focus();
  
  // Setup edit form buttons
  const cancelBtn = editForm.querySelector('.cancel-edit-btn');
  const saveBtn = editForm.querySelector('.save-edit-btn');
  
  cancelBtn.addEventListener('click', function() {
    editForm.remove();
    noteContent.style.display = '';
  });
  
  saveBtn.addEventListener('click', function() {
    saveEditedNote(noteId, textarea.value, noteItem, editForm, noteContent);
  });
}

// Save an edited note
async function saveEditedNote(noteId, newContent, noteItem, editForm, noteContent) {
  if (!newContent.trim()) {
    alert('Note cannot be empty');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('golf_notes')
      .update({ content: newContent })
      .eq('id', noteId);
    
    if (error) {
      console.error('Error updating note:', error);
      alert('Failed to update note: ' + error.message);
      return;
    }
    
    // Update the note content in the UI
    noteContent.innerHTML = newContent.replace(/\n/g, '<br>');
    noteContent.style.display = '';
    editForm.remove();
    
    console.log('Note updated successfully');
  } catch (error) {
    console.error('Exception when updating note:', error);
    alert('An error occurred while updating your note.');
  }
}

// Delete a note
async function deleteNote(noteId) {
  console.log('Deleting note:', noteId);
  
  try {
    const { error } = await supabase
      .from('golf_notes')
      .delete()
      .eq('id', noteId);
    
    if (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note: ' + error.message);
      return;
    }
    
    console.log('Note deleted successfully');
    
    // Reload notes to update the list
    loadNotes();
    
  } catch (error) {
    console.error('Exception when deleting note:', error);
    alert('An error occurred while deleting your note.');
  }
}

// Export loadNotes function for potential use in other modules
export { loadNotes };