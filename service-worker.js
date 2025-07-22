// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
    // Open the side panel for the current tab
    await chrome.sidePanel.open({ tabId: tab.id });
});