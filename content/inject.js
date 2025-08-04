window.addEventListener('message', (e) => {
  const tool = e.data.ouTool;

  if (tool === 'inspector') {
    console.log('[INSPECTOR] Message received: ENABLE');
    import(chrome.runtime.getURL('tools/inspector.js'))
      .then(() => console.log('[INSPECTOR] Script loaded'))
      .catch(err => console.error('[INSPECTOR] Load failed:', err));
  }

  if (tool === 'inspector-disable') {
    console.log('[INSPECTOR] Message received: DISABLE');
    if (window.__OU_INSPECTOR_ACTIVE__) {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
    }
  }
});
