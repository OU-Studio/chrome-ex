// tools/inspector.js

if (!window.OUInspector) {
  window.OUInspector = (() => {
    let tooltip, highlight;

    function attach() {
      if (window.__OU_INSPECTOR_ACTIVE__) return;
      window.__OU_INSPECTOR_ACTIVE__ = true;

      console.log('[INSPECTOR] Attaching...');

      tooltip = document.createElement('div');
      tooltip.className = 'ou-inspector-tooltip';
      Object.assign(tooltip.style, {
        position: 'fixed',
        zIndex: '999999',
        background: '#000',
        color: '#fff',
        padding: '4px 8px',
        fontSize: '12px',
        borderRadius: '4px',
        pointerEvents: 'none',
        fontFamily: 'monospace'
      });
      document.body.appendChild(tooltip);

      highlight = document.createElement('div');
      highlight.className = 'ou-inspector-highlight';
      Object.assign(highlight.style, {
        position: 'absolute',
        zIndex: '999998',
        border: '2px solid #00ffff',
        pointerEvents: 'none'
      });
      document.body.appendChild(highlight);

      window.addEventListener('mousemove', mouseMoveHandler);
      window.addEventListener('keydown', keyHandler);
    }

    function detach() {
      if (!window.__OU_INSPECTOR_ACTIVE__) return;
      console.log('[INSPECTOR] Detaching...');

      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('keydown', keyHandler);
      tooltip?.remove();
      highlight?.remove();
      tooltip = null;
      highlight = null;
      window.__OU_INSPECTOR_ACTIVE__ = false;
    }

    function updateTooltip(el, e) {
      const blockId = el.getAttribute('id') || 'No ID';
      const blockType = el.dataset.blockType || 'Unknown Type';
      const section = el.closest('[data-section-id]');
      const sectionId = section ? section.getAttribute('data-section-id') : 'No Section ID';

      tooltip.innerHTML = `<strong>${blockType}</strong><br>ID: ${blockId}<br>Section: ${sectionId}`;
      tooltip.style.top = `${e.clientY + 10}px`;
      tooltip.style.left = `${e.clientX + 10}px`;
      tooltip.style.display = 'block';

      const rect = el.getBoundingClientRect();
      highlight.style.top = `${window.scrollY + rect.top}px`;
      highlight.style.left = `${window.scrollX + rect.left}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
      highlight.style.display = 'block';
    }

    function mouseMoveHandler(e) {
      const block = e.target.closest('.sqs-block');
      if (block) {
        updateTooltip(block, e);
      } else {
        tooltip.style.display = 'none';
        highlight.style.display = 'none';
      }
    }

    function keyHandler(e) {
      if (e.key === 'Escape') {
        detach();
      }
    }

    return { attach, detach };
  })();
}
