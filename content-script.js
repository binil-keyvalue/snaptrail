// Content script to capture user actions on web pages
let isRecording = false;
let inputTimers = new Map(); // Track input timers for debouncing

// Listen for recording start/stop messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        isRecording = true;
        console.log('Recording started on:', window.location.href);
    } else if (message.type === 'STOP_RECORDING') {
        isRecording = false;
        // Clear any pending input timers
        inputTimers.forEach(timer => clearTimeout(timer));
        inputTimers.clear();
        console.log('Recording stopped on:', window.location.href);
    } else if (message.type === 'PING') {
        // Respond to ping to confirm content script is loaded
        sendResponse({ status: 'ok' });
    }
});

// Capture user actions
function captureUserAction(type, event) {
    if (!isRecording) return;
    
    console.log('Capturing action:', type, 'on:', window.location.href);
    
    let actionText = '';
    let details = '';
    let icon = '';

    switch(type) {
        case 'click':
            icon = '👆';
            const element = event.target;
            const tagName = element.tagName.toLowerCase();
            const className = element.className ? `.${element.className.split(' ')[0]}` : '';
            const id = element.id ? `#${element.id}` : '';
            const text = element.textContent ? element.textContent.trim().substring(0, 30) : '';
            
            if (text) {
                actionText = `Click "${text}"`;
            } else if (id) {
                actionText = `Click element ${id}`;
            } else if (className) {
                actionText = `Click element ${className}`;
            } else {
                actionText = `Click ${tagName}`;
            }
            
            details = `Element: ${tagName}${id}${className}\nURL: ${window.location.href}`;
            
            // Capture screenshot for clicks
            captureScreenshot(type, actionText, details, icon, element);
            return; // Exit early since we'll send the message from captureScreenshot
            break;
            
        case 'keydown':
            // Skip standalone modifier keys
            if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') return;
            
            // Skip regular typing in input fields - we'll capture it via the debounced input handler
            const isInputField = event.target.tagName.toLowerCase() === 'input' || 
                                event.target.tagName.toLowerCase() === 'textarea' || 
                                event.target.contentEditable === 'true';
            
            if (isInputField && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                return; // Skip regular character typing
            }
            
            icon = '⌨️';
            
            // Build key combination string
            let keyCombo = '';
            if (event.ctrlKey) keyCombo += 'Ctrl+';
            if (event.altKey) keyCombo += 'Alt+';
            if (event.shiftKey && event.key.length > 1) keyCombo += 'Shift+'; // Only show Shift for special keys
            if (event.metaKey) keyCombo += 'Cmd+';
            keyCombo += event.key;
            
            // Special handling for common shortcuts
            const shortcutNames = {
                'Ctrl+c': 'Copy',
                'Ctrl+v': 'Paste',
                'Ctrl+x': 'Cut',
                'Ctrl+z': 'Undo',
                'Ctrl+y': 'Redo',
                'Ctrl+s': 'Save',
                'Ctrl+a': 'Select All',
                'Ctrl+f': 'Find',
                'Ctrl+r': 'Refresh',
                'Ctrl+t': 'New Tab',
                'Ctrl+w': 'Close Tab',
                'Ctrl+n': 'New Window'
            };
            
            const shortcutName = shortcutNames[keyCombo.toLowerCase()];
            actionText = shortcutName ? `${shortcutName} (${keyCombo})` : `Press "${keyCombo}"`;
            
            details = `Key combination: ${keyCombo}\nTarget: ${event.target.tagName.toLowerCase()}\nURL: ${window.location.href}`;
            break;
            
        case 'navigation':
            icon = '🌐';
            actionText = `Navigate to`;
            details = `URL: ${window.location.href}`;
            break;
            
        case 'form_input':
            icon = '✏️';
            const fieldName = event.target.name || event.target.id || event.target.placeholder || event.target.tagName;
            const inputValue = event.target.value.trim();
            
            if (inputValue) {
                actionText = `Type "${inputValue.substring(0, 50)}${inputValue.length > 50 ? '...' : ''}"`;
                details = `Field: ${fieldName}\nValue: ${inputValue}\nURL: ${window.location.href}`;
            } else {
                actionText = `Clear field`;
                details = `Field: ${fieldName}\nURL: ${window.location.href}`;
            }
            break;
    }

    // Send action to service worker
    chrome.runtime.sendMessage({
        type: 'USER_ACTION',
        action: {
            type: type,
            text: actionText,
            details: details,
            icon: icon,
            timestamp: new Date().toLocaleTimeString(),
            url: window.location.href,
            title: document.title
        }
    }).then(() => {
        console.log('Action sent successfully:', actionText);
    }).catch(err => {
        console.log('Failed to send action:', err);
    });
}

// Event listeners for user actions
document.addEventListener('click', (e) => captureUserAction('click', e), true);
document.addEventListener('keydown', (e) => captureUserAction('keydown', e), true);

// Debounced input handler to capture complete text after user stops typing
document.addEventListener('input', (e) => {
    if (!isRecording) return;
    
    const element = e.target;
    const elementKey = element.name || element.id || element.tagName + Math.random();
    
    // Clear existing timer for this element
    if (inputTimers.has(elementKey)) {
        clearTimeout(inputTimers.get(elementKey));
    }
    
    // Set new timer to capture input after 1 second of no typing
    const timer = setTimeout(() => {
        captureUserAction('form_input', e);
        inputTimers.delete(elementKey);
    }, 1000);
    
    inputTimers.set(elementKey, timer);
}, true);

// Capture navigation events
let currentUrl = window.location.href;
const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => captureUserAction('navigation', { target: document }), 100);
    }
});

observer.observe(document, { subtree: true, childList: true });

// Also capture navigation via popstate
window.addEventListener('popstate', () => {
    setTimeout(() => captureUserAction('navigation', { target: document }), 100);
});

// Function to capture screenshot with click overlay
function captureScreenshot(type, actionText, details, icon, clickedElement) {
    // Highlight the clicked element temporarily
    const originalStyle = clickedElement.style.cssText;
    clickedElement.style.cssText += '; outline: 3px solid #ff4444; outline-offset: 2px; box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);';
    
    // Request screenshot from service worker
    chrome.runtime.sendMessage({ 
        type: 'CAPTURE_SCREENSHOT',
        action: {
            type: type,
            text: actionText,
            details: details,
            icon: icon,
            timestamp: new Date().toLocaleTimeString(),
            url: window.location.href,
            title: document.title
        }
    }).then(() => {
        console.log('Screenshot request sent for:', actionText);
        // Restore original element style
        setTimeout(() => {
            clickedElement.style.cssText = originalStyle;
        }, 200);
    }).catch(err => {
        console.log('Failed to request screenshot:', err);
        // Restore original element style
        clickedElement.style.cssText = originalStyle;
    });
}

console.log('Content script loaded on:', window.location.href); 