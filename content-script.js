// Content script to capture user actions on web pages
let isRecording = false;
let inputTimers = new Map(); // Track input timers for debouncing
let scrollTimer = null; // Track scroll timer for debouncing
let lastScrollPosition = { x: 0, y: 0 };

// Helper function to check if an event should be filtered (not recorded)
function shouldFilterEvent(event) {
    // Filter out all events inside the side panel or extension UI
    if (event && event.target &&
        (event.target.closest('[data-extension-side-panel]') ||
         event.target.closest('.container'))) {
        return true;
    }
    return false;
}

// Listen for recording start/stop messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_RECORDING') {
        isRecording = true;
        // Initialize scroll position
        lastScrollPosition = {
            x: window.scrollX || window.pageXOffset,
            y: window.scrollY || window.pageYOffset
        };
        console.log('Recording started on:', window.location.href);
    } else if (message.type === 'STOP_RECORDING') {
        isRecording = false;
        // Clear any pending input timers
        inputTimers.forEach(timer => clearTimeout(timer));
        inputTimers.clear();
        // Clear scroll timer
        if (scrollTimer) {
            clearTimeout(scrollTimer);
            scrollTimer = null;
        }
        console.log('Recording stopped on:', window.location.href);
    } else if (message.type === 'PING') {
        // Respond to ping to confirm content script is loaded
        sendResponse({ status: 'ok' });
    }
});

// Capture user actions
function captureUserAction(type, event) {
    if (!isRecording || shouldFilterEvent(event)) return;
    
    console.log('Capturing action:', type, 'on:', window.location.href);


    let actionText = '';
    let details = '';
    let icon = '';

    switch (type) {
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

        case 'scroll':
            icon = '📜';
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            const scrollDirection = scrollY > lastScrollPosition.y ? 'down' : 'up';
            const scrollDistance = Math.abs(scrollY - lastScrollPosition.y);

            // Find the most prominent element in the current viewport
            const targetElement = findScrollTarget();
            const targetName = targetElement ? getElementName(targetElement) : null;

            actionText = targetName ?
                `Scroll ${scrollDirection} to ${targetName}` :
                `Scroll ${scrollDirection}`;

            details = `Position: ${Math.round(scrollY)}px\nDistance: ${Math.round(scrollDistance)}px\nURL: ${window.location.href}`;

            lastScrollPosition = { x: scrollX, y: scrollY };
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
    if (!isRecording || shouldFilterEvent(e)) return;

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

// Debounced scroll handler to capture meaningful scroll actions
document.addEventListener('scroll', () => {
    if (!isRecording) return;

    // Clear existing scroll timer
    if (scrollTimer) {
        clearTimeout(scrollTimer);
    }

    // Set timer to capture scroll after 500ms of no scrolling
    scrollTimer = setTimeout(() => {
        const currentScrollY = window.scrollY || window.pageYOffset;
        const scrollDistance = Math.abs(currentScrollY - lastScrollPosition.y);

        // Only capture if scroll distance is significant (more than 100px)
        if (scrollDistance > 100) {
            captureUserAction('scroll', { target: document });
        }
        scrollTimer = null;
    }, 500);
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

// Helper function to find the scroll target element
function findScrollTarget() {
    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;

    // Get elements near the center of the viewport
    const centerElement = document.elementFromPoint(window.innerWidth / 2, viewportCenter);
    if (!centerElement) return null;

    // Look for meaningful parent elements (headings, sections, etc.)
    let currentElement = centerElement;
    while (currentElement && currentElement !== document.body) {
        const tagName = currentElement.tagName.toLowerCase();

        // Prioritize meaningful semantic elements
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'main', 'nav', 'header', 'footer'].includes(tagName)) {
            return currentElement;
        }

        // Check for elements with meaningful IDs or classes
        if (currentElement.id || currentElement.className) {
            const hasNameAttributes = currentElement.id.length > 0 ||
                (currentElement.className && currentElement.className.split(' ').some(cls => cls.length > 2));
            if (hasNameAttributes) {
                return currentElement;
            }
        }

        currentElement = currentElement.parentElement;

    }
    console.debug('currentElement: ', currentElement);
    return centerElement;
}

// Helper function to get a readable name for an element
function getElementName(element) {
    if (!element) return null;

    // Prioritize heading text content
    const tagName = element.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        const headingText = element.textContent?.trim();
        if (headingText && headingText.length > 0) {
            return `"${headingText.length > 50 ? headingText.substring(0, 50) + '...' : headingText}"`;
        }
    }

    // Try to get readable text content (for sections, buttons, links)
    const text = element.textContent?.trim();
    if (text && text.length > 0 && text.length <= 100) {
        // Filter out very long text blocks and prefer shorter, meaningful text
        const words = text.split(/\s+/);
        if (words.length <= 8) { // Prefer concise text
            return `"${text.length > 50 ? text.substring(0, 50) + '...' : text}"`;
        }
    }

    // Use data attributes for meaningful names
    const dataTitle = element.getAttribute('data-title') || element.getAttribute('data-name');
    if (dataTitle) {
        return `"${dataTitle}"`;
    }

    // Use aria-label for accessibility names
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        return `"${ariaLabel}"`;
    }

    // Use ID if available (convert to readable format)
    if (element.id) {
        const readableId = element.id.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        return readableId;
    }

    // Fallback to semantic tag names
    if (['section', 'article', 'main', 'nav', 'header', 'footer', 'aside'].includes(tagName)) {
        return tagName;
    }

    return 'section';
}

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