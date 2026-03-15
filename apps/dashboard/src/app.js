const API_BASE = 'http://localhost:3000';
const REFRESH_MS = 3000;

const sections = {
  runtimeStatus: document.getElementById('runtime-status'),
  queue: document.getElementById('queue'),
  agents: document.getElementById('agents'),
  artifacts: document.getElementById('artifacts'),
  plannerStrategies: document.getElementById('planner-strategies'),
  skillInvocations: document.getElementById('skill-invocations'),
  meta: document.getElementById('meta'),
  retEvents: document.getElementById('ret-events'),
  retTimelineView: document.getElementById('ret-timeline-view'),
  retTraceView: document.getElementById('ret-trace-view'),
};

// --- Skill invocations state ---
let siLastData = [];
const siExpandedIds = new Set();
const siFilters = { workspace: '', agent: '', skill: '', status: '' };

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(inv) {
  if (inv.completedAt === null) return 'pending\u2026';
  return `${((inv.completedAt - inv.startedAt) / 1000).toFixed(1)}s`;
}

function buildDetailHtml(inv) {
  const errorSection = inv.error
    ? `<div class="si-detail-error"><strong>Error:</strong> ${escapeHtml(inv.error)}</div>`
    : '';

  const artifactList =
    inv.artifactIds.length > 0
      ? inv.artifactIds
          .map((id) => `<code class="si-artifact-id">${escapeHtml(id)}</code>`)
          .join(' ')
      : '&mdash;';

  const outputStr =
    inv.outputPayload !== null
      ? escapeHtml(JSON.stringify(inv.outputPayload, null, 2))
      : '&mdash;';

  return `<div class="si-detail">
    ${errorSection}
    <div class="si-detail-grid">
      <div class="si-detail-col">
        <div class="si-detail-label">Input Payload</div>
        <pre class="si-detail-pre">${escapeHtml(JSON.stringify(inv.inputPayload, null, 2))}</pre>
      </div>
      <div class="si-detail-col">
        <div class="si-detail-label">Output Payload</div>
        <pre class="si-detail-pre">${outputStr}</pre>
      </div>
      <div class="si-detail-col">
        <div class="si-detail-label">Artifacts</div>
        <div>${artifactList}</div>
      </div>
      <div class="si-detail-col">
        <div class="si-detail-label">Retry / Fallback</div>
        <div class="si-detail-meta">
          Retries: <strong>${inv.retryCount}</strong><br>
          Fallback: <strong>${inv.fallbackUsed ? 'Yes' : 'No'}</strong>
        </div>
      </div>
      <div class="si-detail-col">
        <div class="si-detail-label">Timestamps</div>
        <div class="si-detail-meta">
          Started: <strong>${new Date(inv.startedAt).toLocaleString()}</strong><br>
          Completed: <strong>${inv.completedAt !== null ? new Date(inv.completedAt).toLocaleString() : '&mdash;'}</strong>
        </div>
      </div>
    </div>
  </div>`;
}

function renderSkillInvocations(data) {
  siLastData = data;
  const el = sections.skillInvocations;
  el.classList.remove('error');

  let filtered = data.slice();
  if (siFilters.workspace) {
    filtered = filtered.filter((inv) =>
      inv.workspaceId.toLowerCase().includes(siFilters.workspace),
    );
  }
  if (siFilters.agent) {
    filtered = filtered.filter((inv) =>
      inv.agentId.toLowerCase().includes(siFilters.agent),
    );
  }
  if (siFilters.skill) {
    filtered = filtered.filter((inv) =>
      inv.skillId.toLowerCase().includes(siFilters.skill),
    );
  }
  if (siFilters.status) {
    filtered = filtered.filter((inv) => inv.status === siFilters.status);
  }

  if (filtered.length === 0) {
    el.innerHTML = `<div class="si-empty">${
      data.length === 0
        ? 'No skill invocations recorded.'
        : 'No invocations match current filters.'
    }</div>`;
    return;
  }

  const rows = filtered
    .map((inv) => {
      const ts = new Date(inv.startedAt).toLocaleTimeString();
      const duration = formatDuration(inv);
      const statusBadge = `<span class="si-badge si-badge--${escapeHtml(inv.status)}">${escapeHtml(inv.status)}</span>`;

      const indicators = [];
      if (inv.retryCount > 0) {
        indicators.push(
          `<span class="si-indicator si-indicator--retry" aria-label="Retried ${inv.retryCount} time(s)" title="Retried ${inv.retryCount} time(s)">\u21ba${inv.retryCount}</span>`,
        );
      }
      if (inv.fallbackUsed) {
        indicators.push(
          `<span class="si-indicator si-indicator--fallback" aria-label="Fallback used" title="Fallback used">fb</span>`,
        );
      }

      const rowClass = inv.status === 'failed' ? ' si-row--failed' : '';
      const detailClass = siExpandedIds.has(inv.id) ? ' si-detail-row--expanded' : '';

      return `<tr class="si-row${rowClass}" data-id="${escapeHtml(inv.id)}">
  <td class="si-mono">${escapeHtml(ts)}</td>
  <td class="si-mono">${escapeHtml(inv.workspaceId)}</td>
  <td class="si-mono">${escapeHtml(inv.planId)}</td>
  <td class="si-mono">${escapeHtml(inv.jobId)}</td>
  <td class="si-mono">${escapeHtml(inv.agentId)}</td>
  <td class="si-mono">${escapeHtml(inv.skillId)}</td>
  <td>${statusBadge}${indicators.length ? ' ' + indicators.join(' ') : ''}</td>
  <td class="si-mono">${escapeHtml(duration)}</td>
</tr>
<tr class="si-detail-row${detailClass}">
  <td colspan="8">${buildDetailHtml(inv)}</td>
</tr>`;
    })
    .join('');

  el.innerHTML = `<table class="si-table">
  <thead>
    <tr>
      <th>Timestamp</th>
      <th>Workspace</th>
      <th>Plan</th>
      <th>Job</th>
      <th>Agent</th>
      <th>Skill</th>
      <th>Status</th>
      <th>Duration</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

// Event delegation for row expand/collapse
sections.skillInvocations.addEventListener('click', (e) => {
  const row = e.target.closest('tr.si-row[data-id]');
  if (!row) return;
  const id = row.dataset.id;
  if (siExpandedIds.has(id)) {
    siExpandedIds.delete(id);
  } else {
    siExpandedIds.add(id);
  }
  renderSkillInvocations(siLastData);
});

// Filter listeners
['si-filter-workspace', 'si-filter-agent', 'si-filter-skill'].forEach((filterId) => {
  document.getElementById(filterId).addEventListener('input', (e) => {
    siFilters[filterId.replace('si-filter-', '')] = e.target.value.trim().toLowerCase();
    renderSkillInvocations(siLastData);
  });
});
document.getElementById('si-filter-status').addEventListener('change', (e) => {
  siFilters.status = e.target.value;
  renderSkillInvocations(siLastData);
});

// --- Runtime Event Timeline state ---
let retLastData = [];
const retExpandedIds = new Set();
const retFilters = { workspace: '', event_type: '', job_id: '', skill_invocation_id: '', correlation_id: '' };
let retTraceMode = false;
let retTraceCorrelationId = null;

function retEventTypeBadgeClass(eventType) {
  if (eventType === 'skill.invocation.failed') return 'ret-badge--red';
  if (
    eventType === 'skill.invocation.completed' ||
    eventType === 'artifact.created' ||
    eventType === 'plan.created' ||
    eventType === 'publish.completed'
  ) return 'ret-badge--green';
  if (
    eventType === 'skill.invocation.started' ||
    eventType === 'job.queued' ||
    eventType === 'publish.requested'
  ) return 'ret-badge--yellow';
  if (eventType === 'job.assigned') return 'ret-badge--blue';
  return 'ret-badge--gray';
}

function retRelatedIds(evt) {
  const parts = [];
  if (evt.signal_id) parts.push(`sig:${evt.signal_id.slice(0, 8)}`);
  if (evt.plan_id) parts.push(`plan:${evt.plan_id.slice(0, 8)}`);
  if (evt.job_id) parts.push(`job:${evt.job_id.slice(0, 8)}`);
  if (evt.skill_invocation_id) parts.push(`inv:${evt.skill_invocation_id.slice(0, 8)}`);
  if (evt.artifact_id) parts.push(`art:${evt.artifact_id.slice(0, 8)}`);
  if (evt.publish_event_id) parts.push(`pub:${evt.publish_event_id.slice(0, 8)}`);
  return parts.join(' ');
}

function retPayloadSummary(payload) {
  const str = JSON.stringify(payload) || '';
  return str.length > 80 ? str.slice(0, 80) + '…' : str;
}

function retBuildDetailHtml(evt) {
  const replayBadge = evt.replayable
    ? `<span class="ret-badge ret-badge--green">replayable</span>`
    : `<span class="ret-badge ret-badge--gray">non-replayable</span>`;

  const idFields = [
    ['signal_id', evt.signal_id],
    ['plan_id', evt.plan_id],
    ['job_id', evt.job_id],
    ['assignment_id', evt.assignment_id],
    ['skill_invocation_id', evt.skill_invocation_id],
    ['artifact_id', evt.artifact_id],
    ['publish_event_id', evt.publish_event_id],
    ['correlation_id', evt.correlation_id],
    ['workspace_id', evt.workspace_id],
  ].filter(([, v]) => v).map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}`).join('<br>');

  return `<div class="ret-detail">
    <div class="ret-detail-grid">
      <div class="ret-detail-col">
        <div class="ret-detail-label">Payload</div>
        <pre class="ret-detail-pre">${escapeHtml(JSON.stringify(evt.payload, null, 2))}</pre>
      </div>
      <div class="ret-detail-col">
        <div class="ret-detail-label">Related IDs</div>
        <div class="ret-detail-meta">${idFields || '\u2014'}</div>
      </div>
      <div class="ret-detail-col">
        <div class="ret-detail-label">Classification</div>
        <div>${replayBadge}</div>
      </div>
    </div>
  </div>`;
}

function renderRuntimeEvents(data) {
  retLastData = data;
  const el = sections.retEvents;
  if (!el) return;

  if (data.length === 0) {
    el.innerHTML = `<div class="ret-empty">No runtime events recorded.</div>`;
    return;
  }

  const rows = data.map((evt) => {
    const ts = new Date(evt.occurred_at).toLocaleTimeString();
    const badgeClass = retEventTypeBadgeClass(evt.event_type);
    const badge = `<span class="ret-badge ${escapeHtml(badgeClass)}">${escapeHtml(evt.event_type)}</span>`;
    const corrId = evt.correlation_id || '';
    const corrDisplay = corrId
      ? `<button class="ret-corr-link" data-corr="${escapeHtml(corrId)}">${escapeHtml(corrId.slice(0, 10))}…</button>`
      : '\u2014';
    const relIds = retRelatedIds(evt);
    const summary = retPayloadSummary(evt.payload);
    const rowClass = evt.event_type === 'skill.invocation.failed' ? ' ret-row--failed' : '';
    const detailClass = retExpandedIds.has(evt.event_id) ? ' ret-detail-row--expanded' : '';

    return `<tr class="ret-row${rowClass}" data-id="${escapeHtml(evt.event_id)}">
  <td class="ret-mono">${escapeHtml(ts)}</td>
  <td>${badge}</td>
  <td class="ret-mono">${evt.workspace_id ? escapeHtml(evt.workspace_id) : '\u2014'}</td>
  <td>${corrDisplay}</td>
  <td class="ret-mono">${escapeHtml(relIds)}</td>
  <td class="ret-mono">${escapeHtml(summary)}</td>
</tr>
<tr class="ret-detail-row${detailClass}">
  <td colspan="6">${retBuildDetailHtml(evt)}</td>
</tr>`;
  }).join('');

  el.innerHTML = `<table class="ret-table">
  <thead>
    <tr>
      <th>Time</th>
      <th>Event Type</th>
      <th>Workspace</th>
      <th>Correlation ID</th>
      <th>Related IDs</th>
      <th>Payload Summary</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

function retShowTimeline() {
  retTraceMode = false;
  retTraceCorrelationId = null;
  if (sections.retTimelineView) sections.retTimelineView.style.display = '';
  if (sections.retTraceView) sections.retTraceView.style.display = 'none';
}

function retChainStatusIcon(eventType) {
  if (eventType === 'skill.invocation.failed') return { icon: '✗', cls: 'ret-chain-status--fail' };
  if (
    eventType === 'skill.invocation.completed' ||
    eventType === 'artifact.created' ||
    eventType === 'publish.completed' ||
    eventType === 'plan.created'
  ) return { icon: '✓', cls: 'ret-chain-status--ok' };
  if (
    eventType === 'skill.invocation.started' ||
    eventType === 'job.queued' ||
    eventType === 'publish.requested'
  ) return { icon: '⋯', cls: 'ret-chain-status--prog' };
  return { icon: '•', cls: '' };
}

function retKeyObjectId(evt) {
  return evt.skill_invocation_id || evt.artifact_id || evt.publish_event_id ||
    evt.job_id || evt.plan_id || evt.signal_id || '';
}

function renderTraceView(corrId, traceData) {
  const el = sections.retTraceView;
  if (!el) return;
  if (sections.retTimelineView) sections.retTimelineView.style.display = 'none';
  el.style.display = '';

  const { events, chain_complete, has_failures } = traceData;

  const lastEventType = events.length > 0 ? events[events.length - 1].event_type : '';

  const steps = events.map((evt, idx) => {
    const { icon, cls } = retChainStatusIcon(evt.event_type);
    const ts = new Date(evt.occurred_at).toLocaleTimeString();
    const keyId = retKeyObjectId(evt);
    const stepClass = evt.event_type === 'skill.invocation.failed' ? ' ret-chain-step--failed' : '';

    const errorDetail = evt.event_type === 'skill.invocation.failed' && evt.payload
      ? `<div class="ret-chain-error">✗ ${escapeHtml(String((evt.payload).error || JSON.stringify(evt.payload)))}</div>`
      : '';

    const connector = idx < events.length - 1
      ? `<div class="ret-chain-connector">↓</div>`
      : '';

    return `<div class="ret-chain-step${stepClass}">
  <span class="ret-chain-status ${escapeHtml(cls)}">${icon}</span>
  <div class="ret-chain-body">
    <div class="ret-chain-type">${escapeHtml(evt.event_type)}</div>
    <div class="ret-chain-meta">${escapeHtml(ts)}${keyId ? ' · ' + escapeHtml(keyId.slice(0, 16)) : ''}</div>
    ${errorDetail}
  </div>
</div>${connector}`;
  }).join('\n');

  const interruptedWarning = !chain_complete && events.length > 0
    ? `<div class="ret-chain-warning">⚠ Chain interrupted — last event: ${escapeHtml(lastEventType)}</div>`
    : '';

  el.innerHTML = `<div class="ret-trace-header">
  <button class="ret-back-btn" id="ret-back-btn">← Back to Timeline</button>
  <span class="ret-trace-title">Trace: ${escapeHtml(corrId)}</span>
  ${has_failures ? `<span class="ret-badge ret-badge--red">has failures</span>` : ''}
  ${chain_complete ? `<span class="ret-badge ret-badge--green">chain complete</span>` : ''}
</div>
<div class="ret-chain">${steps || '<div class="ret-empty">No events found for this correlation ID.</div>'}</div>
${interruptedWarning}`;

  document.getElementById('ret-back-btn').addEventListener('click', () => {
    retShowTimeline();
  });
}

async function fetchRuntimeEvents() {
  const params = new URLSearchParams();
  if (retFilters.workspace) params.set('workspace', retFilters.workspace);
  if (retFilters.event_type) params.set('event_type', retFilters.event_type);
  if (retFilters.job_id) params.set('job_id', retFilters.job_id);
  if (retFilters.skill_invocation_id) params.set('skill_invocation_id', retFilters.skill_invocation_id);
  if (retFilters.correlation_id) params.set('correlation_id', retFilters.correlation_id);
  const qs = params.toString();
  return fetchJson(`/api/runtime-events${qs ? '?' + qs : ''}`);
}

async function fetchCorrelationTrace(correlationId) {
  return fetchJson(`/api/runtime-events/by-correlation/${encodeURIComponent(correlationId)}`);
}

// Event delegation for runtime events table
document.getElementById('ret-events').addEventListener('click', async (e) => {
  const corrBtn = e.target.closest('button.ret-corr-link[data-corr]');
  if (corrBtn) {
    const corrId = corrBtn.dataset.corr;
    retTraceMode = true;
    retTraceCorrelationId = corrId;
    try {
      const traceData = await fetchCorrelationTrace(corrId);
      renderTraceView(corrId, traceData);
    } catch (err) {
      sections.retTraceView.innerHTML = `<div class="error">Failed to load trace: ${escapeHtml(err.message)}</div>`;
      if (sections.retTimelineView) sections.retTimelineView.style.display = 'none';
      sections.retTraceView.style.display = '';
    }
    return;
  }

  const row = e.target.closest('tr.ret-row[data-id]');
  if (!row) return;
  const id = row.dataset.id;
  if (retExpandedIds.has(id)) {
    retExpandedIds.delete(id);
  } else {
    // Fetch event detail to get replayable field
    try {
      const detail = await fetchJson(`/api/runtime-events/${encodeURIComponent(id)}`);
      const existing = retLastData.find((e) => e.event_id === id);
      if (existing) {
        existing.replayable = detail.replayable;
      }
    } catch (_) { /* ignore */ }
    retExpandedIds.add(id);
  }
  renderRuntimeEvents(retLastData);
});

// Filter listeners for runtime events
['ret-filter-workspace', 'ret-filter-job-id', 'ret-filter-skill-inv-id', 'ret-filter-correlation-id'].forEach((filterId) => {
  document.getElementById(filterId).addEventListener('input', async (e) => {
    const key = filterId.replace('ret-filter-', '').replace(/-/g, '_');
    retFilters[key] = e.target.value.trim();
    if (!retTraceMode) {
      try {
        const data = await fetchRuntimeEvents();
        renderRuntimeEvents(data);
      } catch (_) { /* handled in refresh */ }
    }
  });
});
document.getElementById('ret-filter-event-type').addEventListener('change', async (e) => {
  retFilters.event_type = e.target.value;
  if (!retTraceMode) {
    try {
      const data = await fetchRuntimeEvents();
      renderRuntimeEvents(data);
    } catch (_) { /* handled in refresh */ }
  }
});

function renderJson(element, data) {
  element.classList.remove('error');
  element.textContent = JSON.stringify(data, null, 2);
}

function renderError(element, message) {
  element.classList.add('error');
  element.textContent = message;
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return response.json();
}

async function refreshDashboard() {
  const startedAt = new Date();

  const requests = [
    { key: 'runtimeStatus', path: '/api/runtime/status' },
    { key: 'queue', path: '/api/runtime/queue' },
    { key: 'agents', path: '/api/runtime/agents' },
    { key: 'artifacts', path: '/api/runtime/artifacts' },
    { key: 'plannerStrategies', path: '/api/runtime/planner-strategies' },
  ];

  const [results, siResults, retResults] = await Promise.all([
    Promise.allSettled(requests.map((request) => fetchJson(request.path))),
    Promise.allSettled([fetchJson('/api/skill-invocations')]),
    Promise.allSettled([fetchRuntimeEvents()]),
  ]);

  let hadError = false;

  results.forEach((result, index) => {
    const { key, path } = requests[index];
    if (result.status === 'fulfilled') {
      renderJson(sections[key], result.value);
      return;
    }

    hadError = true;
    renderError(sections[key], `Failed to fetch ${path}: ${result.reason?.message ?? 'Unknown error'}`);
  });

  if (siResults[0].status === 'fulfilled') {
    renderSkillInvocations(siResults[0].value);
  } else {
    hadError = true;
    renderError(
      sections.skillInvocations,
      `Failed to fetch /api/skill-invocations: ${siResults[0].reason?.message ?? 'Unknown error'}`,
    );
  }

  if (!retTraceMode) {
    if (retResults[0].status === 'fulfilled') {
      renderRuntimeEvents(retResults[0].value);
    } else {
      hadError = true;
      if (sections.retEvents) {
        sections.retEvents.innerHTML = `<div class="error">Failed to fetch runtime events: ${escapeHtml(retResults[0].reason?.message ?? 'Unknown error')}</div>`;
      }
    }
  }

  const statusText = hadError ? 'Updated with errors' : 'Updated successfully';
  sections.meta.textContent = `${statusText} at ${startedAt.toLocaleTimeString()} (refreshes every ${REFRESH_MS / 1000}s)`;
}

refreshDashboard();
setInterval(refreshDashboard, REFRESH_MS);
