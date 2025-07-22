// Content script to capture user actions on web pages
let isRecording = false;

// Listen for recording start/stop messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        isRecording = true;
        console.log('Recording started on:', window.location.href);
    } else if (message.type === 'STOP_RECORDING') {
        isRecording = false;
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
            if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control') return;
            
            icon = '⌨️';
            actionText = `Press "${event.key}"`;
            details = `Key: ${event.key}\nTarget: ${event.target.tagName.toLowerCase()}\nURL: ${window.location.href}`;
            break;
            
        case 'navigation':
            icon = '🌐';
            actionText = `Navigate to`;
            details = `URL: ${window.location.href}`;
            break;
            
        case 'form_input':
            icon = '✏️';
            actionText = `Input text`;
            details = `Field: ${event.target.name || event.target.id || event.target.tagName}\nURL: ${window.location.href}`;
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
document.addEventListener('input', (e) => captureUserAction('form_input', e), true);

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