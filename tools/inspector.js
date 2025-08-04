console.log('[INSPECTOR] Script loaded');

const blocks = document.querySelectorAll('.sqs-block');

(function () {
  if (window.__OU_INSPECTOR_ACTIVE__) {
    console.log('[INSPECTOR] Already active, skipping.');
    return;
  }
  window.__OU_INSPECTOR_ACTIVE__ = true;


  const tooltip = document.createElement('div');
  tooltip.style.position = 'fixed';
  tooltip.style.zIndex = '999999';
  tooltip.style.background = '#000';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '4px 8px';
  tooltip.style.fontSize = '12px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.display = 'none';
  tooltip.style.fontFamily = 'monospace';
  document.body.appendChild(tooltip);

  const highlight = document.createElement('div');
  highlight.style.position = 'absolute';
  highlight.style.zIndex = '999998';
  highlight.style.border = '2px solid #00ffff';
  highlight.style.pointerEvents = 'none';
  highlight.style.display = 'none';
  document.body.appendChild(highlight);

  const updateTooltip = (el, e) => {
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
  };

  const mouseMoveHandler = (e) => {
    const block = e.target.closest('.sqs-block');
    if (block) {
            updateTooltip(block, e);
    } else {
      tooltip.style.display = 'none';
      highlight.style.display = 'none';
    }
  };

  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      cleanup();
    }
  };

  const cleanup = () => {
    window.removeEventListener('mousemove', mouseMoveHandler);
    window.removeEventListener('keydown', keyHandler);
    tooltip.remove();
    highlight.remove();
    window.__OU_INSPECTOR_ACTIVE__ = false;
  };

  window.addEventListener('mousemove', mouseMoveHandler);
  window.addEventListener('keydown', keyHandler);
})();
