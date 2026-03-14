const API_BASE = 'http://localhost:3000';
const REFRESH_MS = 3000;

const el = {
  meta: document.getElementById('meta'),
  runtimeStatus: document.getElementById('runtime-status'),
  agents: document.getElementById('agents'),
  skills: document.getElementById('skills'),
  workflows: document.getElementById('workflows'),
  events: document.getElementById('events'),
  jobsTableBody: document.getElementById('jobs-table-body'),
  artifactsTableBody: document.getElementById('artifacts-table-body'),
  jobDetails: document.getElementById('job-details'),
  artifactDetails: document.getElementById('artifact-details'),
  jobsError: document.getElementById('jobs-error'),
  artifactsError: document.getElementById('artifacts-error'),
  controlResult: document.getElementById('control-result'),
  approvalResult: document.getElementById('approval-result'),
  jobReviewState: document.getElementById('job-review-state'),
  testSignalName: document.getElementById('test-signal-name'),
  rejectReason: document.getElementById('reject-reason'),
  retryJobButton: document.getElementById('retry-job'),
  requeueJobButton: document.getElementById('requeue-job'),
  sendTestSignalButton: document.getElementById('send-test-signal'),
  resetRuntimeButton: document.getElementById('reset-runtime'),
  submitReviewButton: document.getElementById('submit-review'),
  approveJobButton: document.getElementById('approve-job'),
  rejectJobButton: document.getElementById('reject-job'),
  publishJobButton: document.getElementById('publish-job'),
};

let selectedJobId = null;
let selectedArtifactId = null;

function ensureRecentEventsSection() {
  let panel = document.getElementById('events-panel');
  if (panel) {
    return;
  }

  const layout = document.querySelector('.layout');
  if (!layout) {
    return;
  }

  panel = document.createElement('section');
  panel.id = 'events-panel';
  panel.className = 'panel wide';
  panel.innerHTML = `
    <h2>Recent Events</h2>
    <pre id="events">Loading...</pre>
  `;
  layout.appendChild(panel);

  el.events = document.getElementById('events');
}

ensureRecentEventsSection();

function toJsonText(value) {
  return JSON.stringify(value, null, 2);
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${path}`);
  }
  return response.json();
}

async function postJson(path, payload = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? `HTTP ${response.status} for ${path}`);
  }

  return data;
}

function setMessage(element, message, isError = false) {
  element.className = isError ? 'error' : 'success';
  element.textContent = message;
}

async function runAction(action, targetElement) {
  try {
    const result = await action();
    setMessage(targetElement, toJsonText(result), false);
    await refreshDashboard();
  } catch (error) {
    setMessage(targetElement, error.message, true);
  }
}

function setSelectedJobDetails(job) {
  el.jobDetails.textContent = toJsonText(job);
  const review = job.lifecycleState ?? 'draft';
  const blocked = job.blockedReason ? ` | blocked: ${job.blockedReason}` : '';
  el.jobReviewState.textContent = `Review state: ${review}${blocked}`;
}

function renderJobsTable(jobs) {
  el.jobsTableBody.innerHTML = '';

  jobs.forEach((job) => {
    const row = document.createElement('tr');
    row.className = 'clickable';
    row.innerHTML = `
      <td>${job.id}</td>
      <td>${job.planId}</td>
      <td>${job.jobType}</td>
      <td>${job.assignedAgent ?? '-'}</td>
      <td>${job.status}</td>
      <td>${job.blockedReason ?? '-'}</td>
      <td>${job.lifecycleState ?? 'draft'}</td>
      <td>${job.retryCount}</td>
    `;

    row.addEventListener('click', async () => {
      selectedJobId = job.id;
      try {
        const details = await fetchJson(`/api/jobs/${job.id}`);
        setSelectedJobDetails(details);
      } catch (error) {
        el.jobDetails.textContent = `Failed to load job ${job.id}: ${error.message}`;
      }
    });

    el.jobsTableBody.appendChild(row);
  });
}

function renderArtifactsTable(artifacts) {
  el.artifactsTableBody.innerHTML = '';

  artifacts.forEach((artifact) => {
    const created = new Date(artifact.createdAt).toLocaleTimeString();
    const row = document.createElement('tr');
    row.className = 'clickable';
    row.innerHTML = `
      <td>${artifact.id}</td>
      <td>${artifact.jobId}</td>
      <td>${artifact.type}</td>
      <td>${artifact.title}</td>
      <td>${artifact.status}</td>
      <td>${created}</td>
    `;

    row.addEventListener('click', async () => {
      selectedArtifactId = artifact.id;
      try {
        const details = await fetchJson(`/api/artifacts/${artifact.id}`);
        el.artifactDetails.textContent = toJsonText(details);
      } catch (error) {
        el.artifactDetails.textContent = `Failed to load artifact ${artifact.id}: ${error.message}`;
      }
    });

    el.artifactsTableBody.appendChild(row);
  });
}

el.sendTestSignalButton.addEventListener('click', () =>
  runAction(() => postJson('/api/control/signals/test', { signalName: el.testSignalName.value }), el.controlResult),
);
el.retryJobButton.addEventListener('click', () =>
  runAction(() => {
    if (!selectedJobId) throw new Error('Select a job first.');
    return postJson(`/api/control/jobs/${selectedJobId}/retry`);
  }, el.controlResult),
);
el.requeueJobButton.addEventListener('click', () =>
  runAction(() => {
    if (!selectedJobId) throw new Error('Select a job first.');
    return postJson(`/api/control/jobs/${selectedJobId}/requeue`);
  }, el.controlResult),
);
el.resetRuntimeButton.addEventListener('click', () =>
  runAction(() => postJson('/api/control/reset'), el.controlResult),
);

el.submitReviewButton.addEventListener('click', () =>
  runAction(() => {
    if (!selectedJobId) throw new Error('Select a job first.');
    return postJson(`/api/approvals/jobs/${selectedJobId}/submit`);
  }, el.approvalResult),
);
el.approveJobButton.addEventListener('click', () =>
  runAction(() => {
    if (!selectedJobId) throw new Error('Select a job first.');
    return postJson(`/api/approvals/jobs/${selectedJobId}/approve`);
  }, el.approvalResult),
);
el.rejectJobButton.addEventListener('click', () =>
  runAction(() => {
    if (!selectedJobId) throw new Error('Select a job first.');
    return postJson(`/api/approvals/jobs/${selectedJobId}/reject`, { reason: el.rejectReason.value });
  }, el.approvalResult),
);
el.publishJobButton.addEventListener('click', () =>
  runAction(() => {
    if (!selectedJobId) throw new Error('Select a job first.');
    return postJson(`/api/approvals/jobs/${selectedJobId}/publish`);
  }, el.approvalResult),
);

async function refreshDashboard() {
  const startedAt = new Date();
  let hadError = false;

  try {
    const runtime = await fetchJson('/api/runtime/status');
    el.runtimeStatus.textContent = toJsonText(runtime);
    el.runtimeStatus.classList.remove('error');
  } catch (error) {
    hadError = true;
    el.runtimeStatus.classList.add('error');
    el.runtimeStatus.textContent = `Failed to fetch runtime status: ${error.message}`;
  }

  try {
    const agents = await fetchJson('/api/runtime/agents');
    el.agents.textContent = toJsonText(agents);
    el.agents.classList.remove('error');
  } catch (error) {
    hadError = true;
    el.agents.classList.add('error');
    el.agents.textContent = `Failed to fetch agents: ${error.message}`;
  }

  try {
    const skills = await fetchJson('/api/runtime/skills');
    el.skills.textContent = toJsonText(skills);
    el.skills.classList.remove('error');
  } catch (error) {
    hadError = true;
    el.skills.classList.add('error');
    el.skills.textContent = `Failed to fetch skills: ${error.message}`;
  }


  try {
    const workflows = await fetchJson('/api/runtime/workflows');
    el.workflows.textContent = toJsonText(workflows);
    el.workflows.classList.remove('error');
  } catch (error) {
    hadError = true;
    el.workflows.classList.add('error');
    el.workflows.textContent = `Failed to fetch workflows: ${error.message}`;
  }


  try {
    const events = await fetchJson('/api/runtime/events');
    const formatted = events.events
      .slice(0, 20)
      .map((event) => {
        const time = new Date(event.timestamp).toLocaleTimeString();
        return `[${time}] ${event.type} - ${event.message}`;
      })
      .join('\n');

    el.events.textContent = formatted || 'No events yet.';
    el.events.classList.remove('error');
  } catch (error) {
    hadError = true;
    el.events.classList.add('error');
    el.events.textContent = `Failed to fetch events: ${error.message}`;
  }

  try {
    const jobs = await fetchJson('/api/jobs');
    el.jobsError.textContent = '';
    renderJobsTable(jobs.jobs);

    if (selectedJobId) {
      const selected = jobs.jobs.find((job) => job.id === selectedJobId);
      if (selected) {
        setSelectedJobDetails(selected);
      }
    }
  } catch (error) {
    hadError = true;
    el.jobsError.textContent = `Failed to fetch jobs: ${error.message}`;
  }

  try {
    const artifacts = await fetchJson('/api/artifacts');
    el.artifactsError.textContent = '';
    renderArtifactsTable(artifacts.artifacts);

    if (selectedArtifactId) {
      const selected = artifacts.artifacts.find((artifact) => artifact.id === selectedArtifactId);
      if (selected) {
        el.artifactDetails.textContent = toJsonText(selected);
      }
    }
  } catch (error) {
    hadError = true;
    el.artifactsError.textContent = `Failed to fetch artifacts: ${error.message}`;
  }

  const prefix = hadError ? 'Updated with errors' : 'Updated successfully';
  el.meta.textContent = `${prefix} at ${startedAt.toLocaleTimeString()} (refresh every ${REFRESH_MS / 1000}s)`;
}

refreshDashboard();
setInterval(refreshDashboard, REFRESH_MS);
