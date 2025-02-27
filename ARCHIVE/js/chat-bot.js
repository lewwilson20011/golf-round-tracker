// Golf-specific chatbot functionality with added debugging
document.addEventListener('DOMContentLoaded', function() {
    console.log("Chat bot script loaded");
    
    // Elements
    const chatButton = document.querySelector('.chat-button');
    const chatBox = document.querySelector('.chat-box');
    const closeChat = document.querySelector('.close-chat');
    const chatMessages = document.querySelector('.chat-messages');
    const chatInput = document.querySelector('.chat-input');
    const sendButton = document.querySelector('.send-button');
    const typingIndicator = document.querySelector('.typing-indicator');
    
    // Debug - check if elements are found
    console.log("Chat button found:", chatButton);
    console.log("Chat box found:", chatBox);
    
    // Toggle chat box - simplified with better debugging
    if (chatButton) {
        chatButton.addEventListener('click', function() {
            console.log("Chat button clicked");
            if (chatBox) {
                chatBox.classList.add('active');
                chatInput.focus();
                console.log("Chat box activated");
            } else {
                console.error("Chat box element not found");
            }
        });
    } else {
        console.error("Chat button element not found");
    }
    
    // Close chat
    if (closeChat) {
        closeChat.addEventListener('click', function() {
            console.log("Close button clicked");
            if (chatBox) {
                chatBox.classList.remove('active');
                console.log("Chat box closed");
            }
        });
    }
    
    // Enable/disable send button based on input
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            if (sendButton) {
                sendButton.disabled = chatInput.value.trim() === '';
                
                // Auto-resize the textarea (up to 4 rows)
                chatInput.style.height = 'auto';
                let newHeight = Math.min(chatInput.scrollHeight, 4 * 20); // Assuming 20px per row
                chatInput.style.height = `${newHeight}px`;
            }
        });
    }
    
    // Send message on button click
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Send message on Enter key (but allow Shift+Enter for new line)
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    sendMessage();
                }
            }
        });
    }
    
    // Comprehensive responses for common questions
    const responses = [
        // Basic greetings
        {
            keywords: ['hello', 'hi', 'hey', 'greetings'],
            response: "Hello! I'm your golf assistant. How can I help with your round tracking today?"
        },
        
        // Round tracking basics
        {
            keywords: ['add round', 'new round', 'record', 'log round'],
            response: "To add a new round, fill out the form with your date, course, number of holes, score, and any notes. Then click 'Save Round'!"
        },
        {
            keywords: ['course', 'courses', 'golf course'],
            response: "You can enter your course name in the Course field. Start typing and we'll show you matching courses from our database. If your course isn't listed, just type the full name and we'll add it!"
        },
        {
            keywords: ['score', 'scores', 'scoring'],
            response: "Track your scores to see your progress over time! You'll see your average and best scores at the top of the page once you start tracking rounds."
        },
        
        // App features
        {
            keywords: ['feature', 'features', 'functionality', 'what can'],
            response: "Round Tracker helps you log your golf scores, track your progress, analyze performance trends, and see your improvement over time. You can record scores, notes, and view statistics across different courses and time periods."
        },
        {
            keywords: ['stat', 'stats', 'statistics', 'analytics'],
            response: "Round Tracker shows your key stats at the top of the page: average score, best score, and total rounds played. As you log more rounds, you'll be able to see trends in your performance."
        },
        {
            keywords: ['edit', 'delete', 'remove', 'update', 'change round'],
            response: "To edit or delete a round, find it in your Recent Rounds list and use the action buttons on the far right. You can modify any details including date, course, score or notes."
        },
        {
            keywords: ['save', 'saving', 'stored', 'storage', 'data'],
            response: "Your round data is securely saved to our database. You can access your information from any device by logging into your account."
        },
        
        // Help and instructions
        {
            keywords: ['help', 'how to', 'instructions', 'guide', 'tutorial'],
            response: "Round Tracker helps you record and analyze your golf scores. Add rounds using the form, view your recent rounds in the table, and see your stats at the top of the page. Is there something specific you need help with?"
        },
        {
            keywords: ['start', 'begin', 'new user', 'first time'],
            response: "Welcome to Round Tracker! To get started, simply add your first round using the form. Once you log a few rounds, you'll start seeing statistics and performance trends. Need help with anything specific?"
        },
        
        // Specific stats questions
        {
            keywords: ['best', 'best score', 'lowest', 'record score'],
            response: "Your best score will be displayed at the top of the page once you start tracking your rounds. This helps you see your record performance at a glance."
        },
        {
            keywords: ['average', 'avg', 'mean score'],
            response: "Your average score is calculated across all your tracked rounds and displayed at the top of the page. This helps you monitor your overall performance."
        },
        {
            keywords: ['rounds', 'total rounds', 'how many rounds'],
            response: "The total number of rounds you've played will be shown at the top of the page once you start tracking. This helps you see how active you've been."
        },
        {
            keywords: ['improve', 'improving', 'better', 'progress'],
            response: "Track your rounds consistently to see your improvement over time. Add notes about what worked well or what needs work to help identify patterns in your game."
        },
        {
            keywords: ['handicap', 'index', 'hcp', 'calculate handicap'],
            response: "While we don't currently calculate an official handicap index, we do track your average and best scores to help you monitor your progress. We're working on adding handicap tracking in a future update!"
        },
        
        // Account questions
        {
            keywords: ['account', 'profile', 'settings', 'preferences'],
            response: "You can access your account settings by clicking on your profile avatar in the top right corner and selecting 'Profile Settings' from the dropdown menu."
        },
        {
            keywords: ['password', 'change password', 'reset password', 'forgot password'],
            response: "To change your password, go to Profile Settings by clicking your avatar in the top right. If you've forgotten your password, use the 'Forgot Password' link on the login screen."
        },
        {
            keywords: ['login', 'log in', 'signin', 'sign in', 'logout', 'log out'],
            response: "You can log in using your email and password. To log out, click your profile avatar in the top right corner and select 'Sign Out' from the dropdown menu."
        },
        {
            keywords: ['signup', 'sign up', 'register', 'create account', 'join'],
            response: "You can create a new account by clicking the 'Sign Up' button on the login page and following the instructions. You'll need to provide an email address and create a password."
        },
        
        // Data management
        {
            keywords: ['export', 'download', 'backup', 'data export'],
            response: "We're working on adding an export feature so you can download your round data. This will be available in a future update. Your data is always securely stored in our database."
        },
        {
            keywords: ['delete account', 'remove account', 'privacy', 'my data'],
            response: "To delete your account or manage your data, please go to Profile Settings by clicking your avatar in the top right. You can find privacy and data management options there."
        },
        
        // App settings
        {
            keywords: ['dark mode', 'light mode', 'theme', 'appearance'],
            response: "You can toggle between light and dark mode in App Settings. Click your profile avatar in the top right corner and select 'App Settings' from the dropdown menu."
        },
        {
            keywords: ['notification', 'notifications', 'alerts', 'remind'],
            response: "You can manage notification preferences in App Settings. We can remind you to log your rounds or alert you about upcoming features."
        },
        
        // App information
        {
            keywords: ['app', 'about', 'version', 'release'],
            response: "Round Tracker is a golf score tracking app designed to help golfers of all levels monitor their performance. We regularly update with new features based on user feedback."
        },
        {
            keywords: ['cost', 'price', 'subscription', 'premium', 'pay', 'free'],
            response: "Round Tracker is currently free to use with all features included. We may offer premium features in the future, but core tracking functionality will always remain free."
        },
        {
            keywords: ['device', 'mobile', 'phone', 'tablet', 'desktop'],
            response: "Round Tracker works on all devices including smartphones, tablets, and desktop computers. The interface adapts to your screen size for the best experience."
        },
        {
            keywords: ['offline', 'no internet', 'connection'],
            response: "Currently, Round Tracker requires an internet connection to save your data. We're working on an offline mode for a future update that will allow you to log rounds without internet access."
        },
        
        // Technical support
        {
            keywords: ['bug', 'issue', 'problem', 'not working', 'error'],
            response: "I'm sorry you're experiencing an issue. Please try refreshing the page first. If the problem persists, contact support at help@roundtracker.com with details about the problem and what device you're using."
        },
        {
            keywords: ['contact', 'support', 'help desk', 'service', 'email support'],
            response: "For technical support or questions, you can contact our team at help@roundtracker.com. We typically respond within 24 hours on business days."
        },
        {
            keywords: ['suggestion', 'feature request', 'feedback', 'recommend', 'idea'],
            response: "We love hearing your suggestions! Please send your feature ideas to feedback@roundtracker.com or use the Feedback option in App Settings."
        },
        
        // Advanced features 
        {
            keywords: ['graph', 'chart', 'trend', 'visualization'],
            response: "We're working on adding performance graphs and trend visualizations in an upcoming update. This will help you see your progress over time with visual charts."
        },
        {
            keywords: ['social', 'friend', 'share', 'compete', 'competition'],
            response: "We plan to add social features in the future so you can connect with friends, share rounds, and even create friendly competitions. Stay tuned for updates!"
        },
        {
            keywords: ['course management', 'course details', 'course info'],
            response: "We maintain a database of golf courses with details like par information and difficulty ratings. If your local course is missing or has incorrect information, please let us know at courses@roundtracker.com."
        },
        
        // Conversation closers
        {
            keywords: ['thank', 'thanks', 'appreciate', 'helpful'],
            response: "You're welcome! Enjoy your golf and remember to track those rounds for improvement. Is there anything else I can help with?"
        },
        {
            keywords: ['bye', 'goodbye', 'see you', 'talk later', 'that\'s all'],
            response: "Thanks for chatting! Have a great round next time you play!"
        }
    ];
    
    // Default response if no keywords match
    const defaultResponse = "I'm here to help with your golf round tracking. You can ask about adding rounds, viewing stats, app features, or how to use specific functions. If you have a technical issue or can't find what you need, contact support at help@roundtracker.com.";
    
    // Function to send user message and get bot response
    function sendMessage() {
        console.log("Sending message");
        const userMessage = chatInput.value.trim();
        
        if (userMessage === '') return;
        
        // Add user message to chat
        addMessage(userMessage, 'user');
        
        // Clear input and reset height
        chatInput.value = '';
        chatInput.style.height = 'auto';
        if (sendButton) {
            sendButton.disabled = true;
        }
        
        // Show typing indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'block';
        }
        
        // Scroll to the latest message
        scrollToBottom();
        
        // Simulate bot thinking and typing
        setTimeout(() => {
            // Hide typing indicator
            if (typingIndicator) {
                typingIndicator.style.display = 'none';
            }
            
            // Generate and add bot response
            const botResponse = getBotResponse(userMessage);
            addMessage(botResponse, 'bot');
            
            // Scroll to the latest message
            scrollToBottom();
        }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
    }
    
    // Function to add a message to the chat
    function addMessage(message, sender) {
        if (!chatMessages) {
            console.error("Chat messages container not found");
            return;
        }
        
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageElement.textContent = message;
        
        chatMessages.appendChild(messageElement);
        console.log(`Added ${sender} message: ${message.substring(0, 30)}...`);
    }
    
    // Function to get bot response based on user input
    function getBotResponse(userMessage) {
        const lowerCaseMessage = userMessage.toLowerCase();
        
        // Check for keyword matches
        for (const item of responses) {
            if (item.keywords.some(keyword => lowerCaseMessage.includes(keyword))) {
                return item.response;
            }
        }
        
        // Return default response if no keywords match
        return defaultResponse;
    }
    
    // Function to scroll to the bottom of the chat
    function scrollToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Force the chat button to be immediately visible and clickable
    if (chatButton) {
        chatButton.style.display = 'flex';
        console.log("Chat button display set to flex");
    }

    // Add a manual trigger for testing
    console.log("Adding test init function");
    window.openChat = function() {
        console.log("Manual open chat triggered");
        if (chatBox) {
            chatBox.classList.add('active');
            if (chatInput) chatInput.focus();
            console.log("Chat box manually activated");
        }
    };
});