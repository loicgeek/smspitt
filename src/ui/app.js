/* global EventSource, fetch */

const API  = `http://${location.hostname}:__API_PORT__/api/v1`;
const SSE  = `/events`;

let messages  = [];
let selected  = null;
let searchQ   = '';
let filterProvider = '';
let filterStatus   = '';

// ── DOM refs ──
const $list     = document.getElementById('msg-list');
const $detail   = document.getElementById('detail');
const $search   = document.getElementById('search');
const $fProv    = document.getElementById('filter-provider');
const $fStatus  = document.getElementById('filter-status');
const $liveDot  = document.getElementById('live-dot');
const $liveText = document.getElementById('live-text');
const $clearBtn = document.getElementById('btn-clear');
const $inboundBtn = document.getElementById('btn-inbound');
const $modal    = document.getElementById('inbound-modal');
const $toast    = document.getElementById('toast');

// ── SSE ──
function connect() {
  const es = new EventSource(SSE);

  es.addEventListener('message.created', e => {
    const msg = JSON.parse(e.data);
    messages.unshift(msg);
    renderList();
    if (!selected) selectMessage(msg.id);
    flashLive(msg.id);
  });

  es.addEventListener('message.updated', e => {
    const { id, status } = JSON.parse(e.data);
    const msg = messages.find(m => m.id === id);
    if (msg) {
      msg.status = status;
      renderList();
      if (selected?.id === id) renderDetail(msg);
    }
  });

  es.addEventListener('cleared', () => {
    messages = [];
    selected = null;
    renderList();
    renderDetail(null);
  });

  es.onopen = () => setLive(true);
  es.onerror = () => {
    setLive(false);
    setTimeout(connect, 3000);
    es.close();
  };
}

function setLive(on) {
  $liveDot.className  = 'live-dot' + (on ? ' connected' : '');
  $liveText.textContent = on ? 'Live' : 'Disconnected';
}

// ── Initial load ──
async function loadMessages() {
  try {
    const r = await fetch(`${API}/messages`);
    const { messages: msgs } = await r.json();
    messages = msgs;
    renderList();
    if (msgs.length) selectMessage(msgs[0].id);
  } catch {
    // server not ready yet, SSE will push new ones
  }
}

// ── Render list ──
function filtered() {
  return messages.filter(m => {
    if (filterProvider && m.provider !== filterProvider) return false;
    if (filterStatus   && m.status   !== filterStatus)   return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return m.to.includes(q) || m.from.toLowerCase().includes(q) || m.body.toLowerCase().includes(q);
    }
    return true;
  });
}

function renderList() {
  const items = filtered();
  if (!items.length) {
    $list.innerHTML = `<div class="msg-list-empty"><p>💬</p><p>No messages yet</p><p style="font-size:11px;margin-top:4px">Send an SMS to port __MOCK_PORT__</p></div>`;
    return;
  }
  $list.innerHTML = items.map(m => `
    <div class="msg-item ${selected?.id === m.id ? 'active' : ''}" data-id="${m.id}">
      <div class="msg-dot" id="dot-${m.id}"></div>
      <div class="msg-meta">
        <div class="msg-to">${esc(m.to)}</div>
        <div class="msg-preview">${esc(m.body)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="msg-time">${reltime(m.createdAt)}</div>
        <div style="margin-top:3px">${statusBadge(m.status)}</div>
      </div>
    </div>
  `).join('');

  $list.querySelectorAll('.msg-item').forEach(el => {
    el.addEventListener('click', () => selectMessage(el.dataset.id));
  });
}

function selectMessage(id) {
  selected = messages.find(m => m.id === id) ?? null;
  renderList();
  renderDetail(selected);
}

function flashLive(id) {
  const dot = document.getElementById(`dot-${id}`);
  if (!dot) return;
  dot.classList.add('live');
  setTimeout(() => dot?.classList.remove('live'), 5000);
}

// ── Render detail ──
function renderDetail(msg) {
  if (!msg) {
    $detail.innerHTML = `<div class="detail-empty"><span>📭</span><p>Select a message to inspect it</p></div>`;
    return;
  }
  const chars = [...msg.body].length;
  $detail.innerHTML = `
    <div class="detail">
      <div class="detail-header">
        <h2>${esc(msg.to)}</h2>
        <span class="badge badge-provider">${esc(msg.provider)}</span>
        ${statusBadge(msg.status)}
        <button class="btn btn-ghost btn-sm" onclick="copyText('${esc(msg.to)}')" title="Copy number">📋</button>
      </div>
      <div class="detail-body">
        <div class="meta-grid">
          <span class="meta-label">To</span>      <span class="meta-value">${esc(msg.to)} <button class="btn btn-ghost btn-sm" onclick="copyText('${esc(msg.to)}')">copy</button></span>
          <span class="meta-label">From</span>    <span class="meta-value">${esc(msg.from)}</span>
          <span class="meta-label">Provider</span><span class="meta-value">${esc(msg.provider)}</span>
          <span class="meta-label">Encoding</span><span class="meta-value">${esc(msg.encoding)}</span>
          <span class="meta-label">Parts</span>   <span class="meta-value">${msg.parts} × ${msg.encoding === 'GSM7' ? (msg.parts === 1 ? '160' : '153') : (msg.parts === 1 ? '70' : '67')} chars</span>
          <span class="meta-label">Status</span>  <span class="meta-value">${statusBadge(msg.status)}</span>
          <span class="meta-label">Sent at</span> <span class="meta-value">${new Date(msg.createdAt).toLocaleString()}</span>
          ${msg.webhookUrl ? `<span class="meta-label">Webhook</span><span class="meta-value" style="color:var(--accent)">${esc(msg.webhookUrl)}</span>` : ''}
        </div>

        <div class="msg-body-card">
          <div class="label">Message body <button class="btn btn-ghost btn-sm" onclick="copyText(${JSON.stringify(msg.body)})">copy</button></div>
          <div class="msg-body-text">${esc(msg.body)}</div>
          <div class="msg-char-count">${chars} char${chars !== 1 ? 's' : ''} · ${msg.parts} part${msg.parts !== 1 ? 's' : ''} · ${msg.encoding}</div>
        </div>

        <div class="actions-card">
          <div class="label">Simulate</div>
          <div class="actions-row">
            <button class="btn btn-ghost btn-sm" onclick="simulateStatus('${msg.id}','delivered')">↻ Delivered</button>
            <button class="btn btn-ghost btn-sm" onclick="simulateStatus('${msg.id}','failed')">✗ Failed</button>
            <button class="btn btn-ghost btn-sm" onclick="simulateStatus('${msg.id}','undelivered')">⚠ Undelivered</button>
            <button class="btn btn-primary btn-sm" onclick="openInbound('${esc(msg.to)}','${esc(msg.from)}')">↩ Inbound reply</button>
          </div>
        </div>

        <div class="raw-card">
          <button class="raw-toggle" onclick="toggleRaw(this)">
            Raw Request <span>▼</span>
          </button>
          <div class="raw-content">
            <pre>${esc(JSON.stringify(msg.rawRequest, null, 2))}</pre>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Actions ──
async function simulateStatus(id, status) {
  await fetch(`${API}/messages/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

window.simulateStatus = simulateStatus;

window.toggleRaw = function(btn) {
  const content = btn.nextElementSibling;
  content.classList.toggle('open');
  btn.querySelector('span').textContent = content.classList.contains('open') ? '▲' : '▼';
};

window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
};

window.openInbound = function(to, from) {
  document.getElementById('inbound-to').value   = to;
  document.getElementById('inbound-from').value = from;
  document.getElementById('inbound-body').value  = '';
  document.getElementById('inbound-webhook').value = '';
  $modal.classList.add('open');
};

// ── Clear all ──
$clearBtn.addEventListener('click', async () => {
  if (!messages.length) return;
  await fetch(`${API}/messages`, { method: 'DELETE' });
});

// ── Inbound modal ──
$inboundBtn.addEventListener('click', () => {
  document.getElementById('inbound-to').value = '';
  document.getElementById('inbound-from').value = '';
  document.getElementById('inbound-body').value = '';
  document.getElementById('inbound-webhook').value = '';
  $modal.classList.add('open');
});

document.getElementById('modal-cancel').addEventListener('click', () => $modal.classList.remove('open'));
$modal.addEventListener('click', e => { if (e.target === $modal) $modal.classList.remove('open'); });

document.getElementById('modal-submit').addEventListener('click', async () => {
  const to      = document.getElementById('inbound-to').value.trim();
  const from    = document.getElementById('inbound-from').value.trim();
  const body    = document.getElementById('inbound-body').value.trim();
  const webhook = document.getElementById('inbound-webhook').value.trim();

  if (!to || !from || !body) { showToast('Fill in all required fields'); return; }

  await fetch(`${API}/inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, from, body, webhookUrl: webhook || undefined }),
  });
  $modal.classList.remove('open');
  showToast('Inbound SMS simulated');
});

// ── Search / filters ──
$search.addEventListener('input', e => { searchQ = e.target.value; renderList(); });
$fProv.addEventListener('change', e => { filterProvider = e.target.value; renderList(); });
$fStatus.addEventListener('change', e => { filterStatus = e.target.value; renderList(); });

// ── Utils ──
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function reltime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)   return `${Math.floor(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  return `${Math.floor(diff / 3_600_000)}h`;
}

function statusBadge(s) {
  const cls = { queued:'queued', delivered:'delivered', failed:'failed', undelivered:'undelivered', received:'received' }[s] ?? 'queued';
  return `<span class="badge badge-${cls}">${s}</span>`;
}

function showToast(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  setTimeout(() => $toast.classList.remove('show'), 2000);
}

// ── Relative time updater ──
setInterval(() => {
  if (messages.length) renderList();
}, 10_000);

// ── Boot ──
connect();
loadMessages();
