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

  const [results, siResults] = await Promise.all([
    Promise.allSettled(requests.map((request) => fetchJson(request.path))),
    Promise.allSettled([fetchJson('/api/skill-invocations')]),
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

  const statusText = hadError ? 'Updated with errors' : 'Updated successfully';
  sections.meta.textContent = `${statusText} at ${startedAt.toLocaleTimeString()} (refreshes every ${REFRESH_MS / 1000}s)`;
}

refreshDashboard();
setInterval(refreshDashboard, REFRESH_MS);
