/**
 * ai-dashboard — minimal framework chrome.
 *
 * Boots the index page: fetches /api/meta + /api/organs/health, renders
 * the organ grid + network log, subscribes to /api/network/stream.
 *
 * No framework dependencies. Works in any modern browser.
 */
(function () {
  const AID = window.AID = window.AID || {};

  function $(id) { return document.getElementById(id); }
  function fmtTime(ts) {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString();
    } catch (_) { return String(ts); }
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  AID.boot = function (opts) {
    const els = {};
    for (const k of Object.keys(opts)) els[k] = $(opts[k]);

    let meta = null;
    let lastEvents = [];
    const MAX_LOG_ROWS = 200;

    function applyMeta(m) {
      meta = m;
      if (els.brandEl && m.brand) els.brandEl.textContent = m.brand;
      if (els.taglineEl && m.tagline) els.taglineEl.textContent = m.tagline;
      if (els.versionEl && m.version) els.versionEl.textContent = `ai-dashboard v${m.version}`;
      if (els.organCountEl && m.organs) els.organCountEl.textContent = `${m.organs.length} configured`;
      if (m.brand) document.title = `${m.brand} — Dashboard`;
    }

    function renderOrgans(meta, healthMap) {
      if (!els.organGridEl) return;
      const tiles = (meta.organs || []).map((o) => {
        const h = (healthMap && healthMap[o.name]) || { status: 'unknown', port: '', version: '' };
        const cls = h.status === 'running' ? 'running' : (h.status === 'down' ? 'down' : (h.status === 'error' ? 'error' : ''));
        return `
          <div class="aid-tile">
            <div class="aid-tile-row">
              <span class="aid-tile-name">${escapeHtml(o.name)}</span>
              ${o.badge ? `<span class="aid-tile-badge">${escapeHtml(o.badge)}</span>` : ''}
            </div>
            <div class="aid-tile-status ${cls}">
              <span class="dot"></span> ${escapeHtml(h.status || 'unknown')}
            </div>
            <div class="aid-tile-url">${escapeHtml(o.url || '')}</div>
            <div class="aid-tile-version">${h.version ? 'v' + escapeHtml(h.version) : ''}</div>
          </div>
        `;
      }).join('');
      els.organGridEl.innerHTML = tiles || '<div class="aid-net-empty">No organs in registry.</div>';
    }

    function appendNetEvent(ev) {
      if (!els.netLogEl) return;
      lastEvents.unshift(ev);
      if (lastEvents.length > MAX_LOG_ROWS) lastEvents.length = MAX_LOG_ROWS;
      renderNetLog();
    }

    function renderNetLog() {
      if (!els.netLogEl) return;
      if (lastEvents.length === 0) {
        els.netLogEl.innerHTML = `<div class="aid-net-empty">No proxy traffic yet. Calls to <code>/api/&lt;organ&gt;/*</code> appear here.</div>`;
        if (els.netCountEl) els.netCountEl.textContent = '0 events';
        return;
      }
      const rows = lastEvents.map((e) => {
        const error = e.status >= 400 || e.error;
        return `
          <div class="aid-net-row ${error ? 'error' : ''}">
            <span class="aid-net-time">${escapeHtml(fmtTime(e.timestamp))}</span>
            <span class="aid-net-method">${escapeHtml(e.method)}</span>
            <span class="aid-net-path">${escapeHtml(e.path)}</span>
            <span class="aid-net-status ${error ? 'error' : ''}">${escapeHtml(e.status || '')}</span>
            <span class="aid-net-duration">${e.duration != null ? e.duration + 'ms' : ''}</span>
          </div>
        `;
      }).join('');
      els.netLogEl.innerHTML = rows;
      if (els.netCountEl) els.netCountEl.textContent = `${lastEvents.length} event${lastEvents.length === 1 ? '' : 's'}`;
    }

    async function refresh() {
      if (els.refreshBtnEl) els.refreshBtnEl.classList.add('spin');
      try {
        const [metaRes, healthRes, eventsRes] = await Promise.all([
          fetch('/api/meta').then((r) => r.json()),
          fetch('/api/organs/health').then((r) => r.json()),
          fetch('/api/network/events?limit=200').then((r) => r.json()),
        ]);
        applyMeta(metaRes);
        renderOrgans(metaRes, healthRes);
        lastEvents = (eventsRes.events || []).slice(0, MAX_LOG_ROWS);
        renderNetLog();
        if (els.lastRefreshEl) els.lastRefreshEl.textContent = `Last refreshed: ${fmtTime(new Date())}`;
        if (els.liveDotEl) els.liveDotEl.classList.remove('dim');
      } catch (err) {
        console.error('[aid] refresh failed', err);
        if (els.liveDotEl) els.liveDotEl.classList.add('dim');
      } finally {
        if (els.refreshBtnEl) setTimeout(() => els.refreshBtnEl.classList.remove('spin'), 600);
      }
    }

    function subscribe() {
      try {
        const es = new EventSource('/api/network/stream');
        es.onmessage = (m) => {
          try { appendNetEvent(JSON.parse(m.data)); } catch (_) {}
        };
        es.onerror = () => {
          if (els.liveDotEl) els.liveDotEl.classList.add('dim');
        };
      } catch (_) { /* SSE not supported */ }
    }

    if (els.refreshBtnEl) els.refreshBtnEl.addEventListener('click', refresh);
    refresh();
    subscribe();
    setInterval(refresh, 30000);
  };
})();
