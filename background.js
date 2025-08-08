chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'activateTool') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: () => {
        alert(`Activated: ${message.tool}`);
      }
    });
  }
});

// Reset all tool toggles whenever a tab starts loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.includes('.squarespace.com')) {
    chrome.storage.local.set({
      inspectorEnabled: false,
      altCheckerEnabled: false,
      styleSyncEnabled: false,
      snippetEnabled: false, // if you add a toggle for this later
    });
    // Optionally tell the page to detach tools (usually not needed on reload)
    chrome.tabs.sendMessage(tabId, { type: 'OU_RESET_TOOLS' }).catch(() => {});
  }
});
