// Global state to track recording status
let isRecording = false;
let recordingStartTime = null;

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
    // Open the side panel for the current tab
    await chrome.sidePanel.open({ tabId: tab.id });
});

// Inject content script into new tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        // Check if content script is already injected
        chrome.tabs.sendMessage(tabId, { type: 'PING' })
            .catch(() => {
                // Content script not loaded, inject it
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content-script.js']
                }).catch(err => console.log('Script injection failed:', err));
            });
    }
});

// Inject content script into existing tabs when extension loads
chrome.runtime.onStartup.addListener(async () => {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.url && tab.url.startsWith('http')) {
            // Check if content script is already injected
            chrome.tabs.sendMessage(tab.id, { type: 'PING' })
                .catch(() => {
                    // Content script not loaded, inject it
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content-script.js']
                    }).catch(err => console.log('Script injection failed:', err));
                });
        }
    }
});

// Also inject on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.url && tab.url.startsWith('http')) {
            chrome.tabs.sendMessage(tab.id, { type: 'PING' })
                .catch(() => {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content-script.js']
                    }).catch(err => console.log('Script injection failed:', err));
                });
        }
    }
});

// Handle messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_RECORDING':
            isRecording = true;
            recordingStartTime = Date.now();
            // Broadcast to all content scripts
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    // Only send to tabs that are web pages and inject content script if needed
                    if (tab.url && tab.url.startsWith('http')) {
                        chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' })
                            .catch(err => {
                                // If content script isn't loaded, inject it first
                                if (err.message.includes('Receiving end does not exist')) {
                                    chrome.scripting.executeScript({
                                        target: { tabId: tab.id },
                                        files: ['content-script.js']
                                    }).then(() => {
                                        // Try sending message again after injection
                                        setTimeout(() => {
                                            chrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' })
                                                .catch(err2 => console.log('Still failed to send to tab:', err2));
                                        }, 100);
                                    }).catch(injectErr => console.log('Failed to inject script:', injectErr));
                                } else {
                                    console.log('Failed to send to tab:', err);
                                }
                            });
                    }
                });
            });
            break;
            
        case 'STOP_RECORDING':
            isRecording = false;
            // Broadcast to all content scripts
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    // Only send to tabs that are web pages
                    if (tab.url && tab.url.startsWith('http')) {
                        chrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' })
                            .catch(err => {
                                // Ignore errors for stop recording since content script might not be loaded
                                if (!err.message.includes('Receiving end does not exist')) {
                                    console.log('Failed to send stop to tab:', err);
                                }
                            });
                    }
                });
            });
            break;
            
        case 'USER_ACTION':
            // Store user action in chrome.storage for the side panel to retrieve
            chrome.storage.local.get(['workflowActions'], (result) => {
                const actions = result.workflowActions || [];
                actions.push({
                    ...message.action,
                    tabId: sender.tab.id,
                    url: sender.tab.url,
                    timestamp: Date.now()
                });
                
                // Keep only the last 100 actions to prevent storage overflow
                if (actions.length > 100) {
                    actions.splice(0, actions.length - 100);
                }
                
                chrome.storage.local.set({ workflowActions: actions }, () => {
                    console.log('Action stored:', message.action.text);
                });
            });
            break;
            
        case 'GET_RECORDING_STATUS':
            sendResponse({ isRecording, recordingStartTime });
            break;
    }
});