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