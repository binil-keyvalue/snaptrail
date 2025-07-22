// Background script for handling screenshot capture and extension actions

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Inject content script and CSS
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['panel.css']
    });
    
    // Wait a moment for script to initialize, then open panel
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, {action: 'openPanel'}, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to open panel:', chrome.runtime.lastError.message);
        }
      });
    }, 100);
    
  } catch (error) {
    console.error('Failed to inject content script:', error);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, {
      format: 'png',
      quality: 90
    }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot capture failed:', chrome.runtime.lastError);
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        sendResponse({success: true, screenshot: dataUrl});
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'downloadFile') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({success: false, error: chrome.runtime.lastError.message});
      } else {
        sendResponse({success: true, downloadId: downloadId});
      }
    });
    return true;
  }
});
