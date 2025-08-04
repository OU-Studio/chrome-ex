// tools/styleSync.js

console.log('[STYLE SYNC] Script loaded');

window.OUStyleSync = window.OUStyleSync || (() => {
  let panel;

  function getTweaks() {
    const tweaks = {};
    const allTweakIds = window.Squarespace?.Tweak?.registered || [];
    allTweakIds.forEach((tweak) => {
      try {
        tweaks[tweak] = window.Squarespace.Tweak.getValue(tweak);
      } catch {}
    });
    return tweaks;
  }

  function applyTweaks(tweaks) {
    Object.entries(tweaks).forEach(([key, value]) => {
      try {
        window.Squarespace.Tweak.setValue(key, value);
        console.log(`[STYLE SYNC] Set ${key} = ${value}`);
      } catch (e) {
        console.warn(`[STYLE SYNC] Failed to set ${key}:`, e);
      }
    });
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadText(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function readFile(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.txt';
    input.addEventListener('change', () => {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => callback(e.target.result);
      reader.readAsText(file);
    });
    input.click();
  }

  function attach() {
    if (panel) return;

    panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      top: '60px',
      right: '20px',
      width: '300px',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 999999,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      fontFamily: 'sans-serif',
      fontSize: '13px'
    });

    panel.innerHTML = `
      <strong>🎨 Style Sync</strong><br><br>
      <button id="ou-save-tweaks">💾 Download Tweaks</button><br><br>
      <button id="ou-load-tweaks">📤 Upload Tweaks</button><br><br>
      <button id="ou-save-css">💾 Download CSS</button><br><br>
      <button id="ou-load-css">📤 Upload CSS</button>
    `;

    document.body.appendChild(panel);

    document.getElementById('ou-save-tweaks').onclick = () => {
      const tweaks = getTweaks();
      downloadJSON(tweaks, 'squarespace-tweaks.json');
    };

    document.getElementById('ou-load-tweaks').onclick = () => {
      readFile((text) => {
        try {
          const tweaks = JSON.parse(text);
          applyTweaks(tweaks);
        } catch (e) {
          alert('Invalid JSON');
        }
      });
    };

    document.getElementById('ou-save-css').onclick = () => {
      const css = document.querySelector('[data-collection-id] textarea')?.value ||
                  window.Design?.getEditorStore?.()?.customCss || '';
      downloadText(css, 'squarespace-custom-css.txt');
    };

    document.getElementById('ou-load-css').onclick = () => {
      readFile((text) => {
        try {
          const textarea = document.querySelector('[data-collection-id] textarea');
          if (textarea) {
            textarea.value = text;
            textarea.dispatchEvent(new Event('input'));
          }

          const store = window.Design?.getEditorStore?.();
          if (store) {
            store.customCss = text;
          }
        } catch (e) {
          alert('Failed to apply custom CSS');
        }
      });
    };
  }

  function detach() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  return { attach, detach };
})();