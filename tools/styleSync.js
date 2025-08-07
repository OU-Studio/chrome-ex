console.log('[STYLE SYNC] Script loaded');

window.OUStyleSync = window.OUStyleSync || (() => {
  let panel;

  async function getColorsViaAPI() {
    const res = await fetch('/api/website-colors', {
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('Failed to fetch colors JSON');
    }

    return await res.json();
  }

  function getCookie(name) {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1];
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

    // Event handlers go here (inside attach!)
    document.getElementById('ou-save-tweaks').onclick = () => {
      getColorsViaAPI()
        .then(colors => {
          downloadJSON(colors, 'squarespace-colors.json');
        })
        .catch(err => {
          alert('Failed to fetch colors: ' + err.message);
        });
    };

    document.getElementById('ou-load-tweaks').onclick = () => {
      readFile(async (text) => {
        try {
          const tweaks = JSON.parse(text);
          const crumb = getCookie('crumb');

fetch("/api/page-sections/6890d1507bb2b434d6b354ea/collection/6890d1507bb2b434d6b354e9", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "x-csrf-token": crumb, // ✅ Use csrf, not xsrf
    "Referer": "https://onwards-upwards.squarespace.com/config/pages" // optional but useful
  },
  credentials: "include", // ✅ required
  body: JSON.stringify(tweaks)
});



          alert('✅ Color styles uploaded successfully!');
        } catch (e) {
          alert('❌ Failed to upload styles: ' + e.message);
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
