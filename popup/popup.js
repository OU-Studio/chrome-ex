const toggleEl = document.getElementById('toggle-inspector');

// Restore saved state on load
chrome.storage.local.get(['inspectorEnabled'], (result) => {
  toggleEl.checked = result.inspectorEnabled || false;
});

// Save + send toggle state on change
toggleEl.addEventListener('change', (e) => {
  const inspectorEnabled = e.target.checked;

  chrome.storage.local.set({ inspectorEnabled });

  const toolMessage = inspectorEnabled ? 'inspector' : 'inspector-disable';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (toolName) => {
        const iframe = document.querySelector('iframe#sqs-site-frame');
        if (!iframe) {
          alert('[Squarespace Tools] No site preview iframe found.');
          return;
        }
        iframe.contentWindow.postMessage({ ouTool: toolName }, '*');
        console.log('[EXTENSION] Posted to iframe:', toolName);
      },
      args: [toolMessage]
    });
  });
});

const altToggle = document.getElementById('toggle-altchecker');

chrome.storage.local.get(['altCheckerEnabled'], (result) => {
  altToggle.checked = result.altCheckerEnabled || false;
});

altToggle.addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  chrome.storage.local.set({ altCheckerEnabled: isEnabled });

  const message = isEnabled ? 'altChecker' : 'altChecker-disable';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (toolName) => {
        const iframe = document.querySelector('iframe#sqs-site-frame');
        if (iframe) {
          iframe.contentWindow.postMessage({ ouTool: toolName }, '*');
        }
      },
      args: [message]
    });
  });
});

