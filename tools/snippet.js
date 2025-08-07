if(!window.OUSnippet){
    window.OUSnippet = window.OUSnippet || (() => {
  let panel;

  const snippets = {
    "Lazy Summary Loader": {
      title: "📦 Lazy Summary Loader",
      code: `// Load all items from a Squarespace Summary Block
(function() {
  const blocks = document.querySelectorAll('.summary-item-list[data-page-size="30"]');
  blocks.forEach(block => {
    const url = block.dataset.collectionId;
    fetch(\`/api/content/\${url}?page=1&pageSize=1000\`)
      .then(res => res.json())
      .then(data => console.log(data));
  });
})();`
    },
    "Alt Tag Checker": {
      title: "🖼 Alt Tag Checker",
      code: `const imgs = document.querySelectorAll('img');
imgs.forEach(img => {
  const alt = img.alt || 'Missing';
  console.log(img.src, '→', alt);
});`
    },
    "Inject Custom CSS": {
      title: "🎨 Inject Custom CSS",
      code: `const style = document.createElement('style');
style.textContent = \`
  body { background: #f0f0f0; }
\`;
document.head.appendChild(style);`
    }
  };

  function attach() {
    if (panel) return;

    panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      top: '60px',
      right: '20px',
      width: '420px',
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
      <strong>🧩 Code Snippet Viewer</strong><br><br>
      <select id="snippet-select" style="width: 100%; padding: 6px; font-size: 13px;">
        ${Object.keys(snippets).map(k => `<option value="${k}">${k}</option>`).join('')}
      </select>
      <h3 id="snippet-title" style="margin-top: 12px; font-size: 15px;"></h3>
      <textarea id="snippet-code" style="width: 100%; height: 200px; font-family: monospace; font-size: 12px; margin-top: 6px;"></textarea>
    `;

    document.body.appendChild(panel);

    const select = panel.querySelector('#snippet-select');
    const title = panel.querySelector('#snippet-title');
    const code = panel.querySelector('#snippet-code');

    function updateSnippetUI(key) {
      title.textContent = snippets[key].title;
      code.value = snippets[key].code;
    }

    select.addEventListener('change', () => {
      updateSnippetUI(select.value);
    });

    // Load initial
    updateSnippetUI(select.value);
  }

  function detach() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  return { attach, detach };
})();

}