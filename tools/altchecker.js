console.log('[ALT CHECKER] Script loaded');

window.OUAltChecker = window.OUAltChecker || (() => {
  let panel;

  function attach() {
    if (panel) return;
    const images = Array.from(document.querySelectorAll('img'));
    console.log(`[ALT CHECKER] Found ${images.length} images`);

    panel = document.createElement('div');
    panel.className = 'ou-alt-checker';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '60px',
      right: '20px',
      width: '350px',
      maxHeight: '80vh',
      overflowY: 'auto',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 999999,
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      fontFamily: 'sans-serif',
      fontSize: '13px'
    });

    const header = document.createElement('div');
    header.innerHTML = `<strong>🖼 Alt Tag Checker</strong> (${images.length})`;
    header.style.marginBottom = '8px';
    panel.appendChild(header);

    images.forEach((img) => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.marginBottom = '8px';

      const actualSrc = img.src || img.getAttribute('data-src') || img.getAttribute('data-image') || '';
const filename = actualSrc.split('/').pop().split('?')[0];

const thumb = document.createElement('img');
thumb.src = actualSrc;
thumb.style.width = '40px';
thumb.style.height = '40px';
thumb.style.objectFit = 'cover';
thumb.style.marginRight = '8px';
thumb.style.border = '1px solid #ccc';


      const info = document.createElement('div');
      const alt = img.alt || '';

      info.innerHTML = `
        <div><strong>${alt ? '✅' : '⚠️'} Alt:</strong> ${alt || '<em>Missing</em>'}</div>
        <div><strong>File:</strong> ${filename}</div>
      `;

      container.appendChild(thumb);
      container.appendChild(info);
      panel.appendChild(container);
    });

    document.body.appendChild(panel);
  }

  function detach() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  return { attach, detach };
})();
