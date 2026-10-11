// tools/pagebuilder.js
// Always-on "Build page" button for the Squarespace admin shell (top frame only).
// Click -> popup -> paste page-spec JSON -> Check (validate only) or Build (writes a NEW unlinked page).
// Core logic lives in page-builder-core.js (validation, block JSON, ids, region swap, API calls).

if (!window.OUPageBuilder) {
  window.OUPageBuilder = (() => {
    let host, root, ui;

    async function loadCore() {
      if (!window.SQSPage) await import(chrome.runtime.getURL('tools/page-builder-core.js'));
      return window.SQSPage;
    }

    // Accept bare JSON or JSON pasted inside a ```json fence (models love fences).
    function parseSpec(text) {
      const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      return JSON.parse(cleaned);
    }

    const CSS = `
      :host { all: initial; }
      * { box-sizing: border-box; font-family: -apple-system, system-ui, sans-serif; }
      .fab { position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; background: #111; color: #fff;
             border: 0; border-radius: 999px; padding: 10px 16px; font-size: 13px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,.3); }
      .fab:hover { background: #333; }
      .backdrop { position: fixed; inset: 0; z-index: 2147483001; background: rgba(0,0,0,.45); display: none; align-items: center; justify-content: center; }
      .backdrop.open { display: flex; }
      .modal { background: #fff; color: #111; width: min(720px, 92vw); max-height: 88vh; border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 10px; }
      .modal h2 { margin: 0; font-size: 16px; }
      textarea { width: 100%; height: 280px; font: 12px/1.4 ui-monospace, Menlo, monospace; padding: 8px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; }
      .row { display: flex; gap: 8px; align-items: center; }
      .row .spacer { flex: 1; }
      button.b { border: 1px solid #111; background: #fff; color: #111; border-radius: 6px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
      button.b.primary { background: #111; color: #fff; }
      button.b:disabled { opacity: .5; cursor: default; }
      pre.log { margin: 0; background: #f5f5f5; border-radius: 6px; padding: 8px; font: 12px/1.4 ui-monospace, Menlo, monospace; white-space: pre-wrap; max-height: 160px; overflow: auto; display: none; }
      pre.log.show { display: block; }
      pre.log.err { background: #fdecea; color: #7a1c14; }
      pre.log.ok { background: #e8f5e9; color: #1b5e20; }
    `;

    function attach() {
      if (host) return;
      host = document.createElement('div');
      host.id = 'ou-pagebuilder-host';
      root = host.attachShadow({ mode: 'open' }); // shadow DOM so admin CSS can't touch it
      root.innerHTML = `
        <style>${CSS}</style>
        <button class="fab" title="Build a page from a spec">＋ Build page</button>
        <div class="backdrop">
          <div class="modal" role="dialog" aria-label="Build page from spec">
            <h2>Build page from spec</h2>
            <textarea spellcheck="false" placeholder='Paste page spec JSON here, e.g. {"title":"New page","sections":[...]}'></textarea>
            <pre class="log"></pre>
            <div class="row">
              <button class="b" data-act="guide" title="Copy the spec guide to paste into the model's system prompt">Copy spec guide</button>
              <span class="spacer"></span>
              <button class="b" data-act="close">Close</button>
              <button class="b" data-act="check">Check</button>
              <button class="b primary" data-act="build">Build</button>
            </div>
          </div>
        </div>`;
      ui = {
        fab: root.querySelector('.fab'),
        backdrop: root.querySelector('.backdrop'),
        text: root.querySelector('textarea'),
        log: root.querySelector('.log'),
        buttons: [...root.querySelectorAll('button.b')],
      };
      ui.fab.addEventListener('click', () => { ui.backdrop.classList.add('open'); ui.text.focus(); });
      ui.backdrop.addEventListener('mousedown', (e) => { if (e.target === ui.backdrop) close(); });
      root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      root.querySelectorAll('button.b').forEach((b) => b.addEventListener('click', () => onAction(b.dataset.act)));
      (document.body || document.documentElement).appendChild(host);
      console.log('[PAGE BUILDER] Attached');
    }

    function detach() { host?.remove(); host = root = ui = null; }
    function close() { ui.backdrop.classList.remove('open'); }
    function show(msg, kind) { ui.log.textContent = msg; ui.log.className = 'log show' + (kind ? ' ' + kind : ''); }
    function busy(on) { ui.buttons.forEach((b) => { if (b.dataset.act !== 'close') b.disabled = on; }); }

    async function onAction(act) {
      if (act === 'close') return close();
      busy(true);
      try {
        const B = await loadCore();
        if (act === 'guide') {
          await navigator.clipboard.writeText(B.specGuide());
          return show('Spec guide copied. Paste it into the model\'s system prompt.', 'ok');
        }
        let spec;
        try { spec = parseSpec(ui.text.value); }
        catch (e) { return show('That is not valid JSON: ' + e.message, 'err'); }
        const errs = B.validate(spec);
        if (errs.length) return show('Fix these first:\n - ' + errs.join('\n - '), 'err');
        if (act === 'check') return show(`Valid. Would create "${spec.title}" (not linked in nav):\n` + B.outline(spec), 'ok');
        if (act === 'build') {
          show(`Building "${spec.title}"...\n` + B.outline(spec));
          const r = await B.commit(spec);
          show(`Built: /${r.urlId}\nFind it under "Not Linked" in the Pages panel.\n\n` + B.outline(spec), 'ok');
        }
      } catch (e) {
        console.error('[PAGE BUILDER]', e);
        show('Failed: ' + e.message, 'err');
      } finally {
        if (ui) busy(false);
      }
    }

    return { attach, detach };
  })();
}
