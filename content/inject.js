window.addEventListener('message', async (e) => {
    const tool = e.data.ouTool;

    if (tool === 'inspector') {
        console.log('[INSPECTOR] Message received: ENABLE');
        if (!window.OUInspector) {
            await import(chrome.runtime.getURL('tools/inspector.js'));
        }
        window.OUInspector.attach();
    }

    if (tool === 'inspector-disable') {
        console.log('[INSPECTOR] Message received: DISABLE');
        if (window.OUInspector) {
            window.OUInspector.detach();
        }
    }

    if (tool === 'altChecker') {
        console.log('[ALT CHECKER] Activating');
        if (!window.OUAltChecker) {
            await import(chrome.runtime.getURL('tools/altChecker.js'));
        }
        window.OUAltChecker.attach();
    }

    if (tool === 'altChecker-disable') {
        if (window.OUAltChecker) window.OUAltChecker.detach();
    }

    if (tool === 'styleSync') {
        console.log('[STYLE SYNC] Activating');
        if (!window.OUStyleSync) {
            await import(chrome.runtime.getURL('tools/styleSync.js'));
        }
        window.OUStyleSync.attach();
    }

    if (tool === 'styleSync-disable') {
        if (window.OUStyleSync) window.OUStyleSync.detach();
    }

    if (tool === 'snippet') {
        console.log('[SNIPPET] Activating');
        if (!window.OUSnippet) {
            await import(chrome.runtime.getURL('tools/snippet.js'));
        }
        window.OUSnippet.attach();
    }

    if (tool === 'snippet-disable') {
        if (window.OUSnippet) window.OUSnippet.detach();
    }

});
