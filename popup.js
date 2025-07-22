document.addEventListener('DOMContentLoaded', async function() {
  const toggleBtn = document.getElementById('togglePanel');
  const status = document.getElementById('status');

  toggleBtn.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      // First, ensure content script is injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['panel.css']
        });
      } catch (injectionError) {
        // Content script might already be injected, continue
        console.log('Content script already injected or injection failed:', injectionError);
      }
      
      // Wait a moment for script to initialize
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {action: 'togglePanel'}, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Communication error:', chrome.runtime.lastError.message);
            status.textContent = 'Error: ' + chrome.runtime.lastError.message;
            return;
          }
          
          if (response) {
            toggleBtn.textContent = response.isOpen ? 'Close Recorder' : 'Open Recorder';
            status.textContent = response.isOpen ? 'Panel Opened' : 'Panel Closed';
          } else {
            status.textContent = 'Panel should be open now';
            toggleBtn.textContent = 'Close Recorder';
          }
        });
      }, 100);
      
    } catch (error) {
      console.error('Error:', error);
      status.textContent = 'Error: ' + error.message;
    }
  });
});
