const API_BASE = 'http://localhost:3000';
const REFRESH_MS = 3000;

const el = {
  meta: document.getElementById('meta'),
  runtimeStatus: document.getElementById('runtime-status'),
  agents: document.getElementById('agents'),
  jobsTableBody: document.getElementById('jobs-table-body'),
  artifactsTableBody: document.getElementById('artifacts-table-body'),
  jobDetails: document.getElementById('job-details'),
  artifactDetails: document.getElementById('artifact-details'),
  jobsError: document.getElementById('jobs-error'),
  artifactsError: document.getElementById('artifacts-error'),
  controlResult: document.getElementById('control-result'),
  testSignalName: document.getElementById('test-signal-name'),
  retryJobButton: document.getElementById('retry-job'),
  requeueJobButton: document.getElementById('requeue-job'),
  sendTestSignalButton: document.getElementById('send-test-signal'),
  resetRuntimeButton: document.getElementById('reset-runtime'),
};

let selectedJobId = null;
let selectedArtifactId = null;

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
      <td>${job.retryCount}</td>
    `;

    row.addEventListener('click', async () => {
      selectedJobId = job.id;
      try {
        const details = await fetchJson(`/api/jobs/${job.id}`);
        el.jobDetails.textContent = toJsonText(details);
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

function setControlResult(message, isError = false) {
  el.controlResult.className = isError ? 'error' : 'success';
  el.controlResult.textContent = message;
}

async function runControlAction(action) {
  try {
    const result = await action();
    setControlResult(toJsonText(result), false);
    await refreshDashboard();
  } catch (error) {
    setControlResult(error.message, true);
  }
}

el.sendTestSignalButton.addEventListener('click', () =>
  runControlAction(() =>
    postJson('/api/control/signals/test', {
      signalName: el.testSignalName.value,
    }),
  ),
);

el.retryJobButton.addEventListener('click', () =>
  runControlAction(async () => {
    if (!selectedJobId) {
      throw new Error('Select a job first.');
    }
    return postJson(`/api/control/jobs/${selectedJobId}/retry`);
  }),
);

el.requeueJobButton.addEventListener('click', () =>
  runControlAction(async () => {
    if (!selectedJobId) {
      throw new Error('Select a job first.');
    }
    return postJson(`/api/control/jobs/${selectedJobId}/requeue`);
  }),
);

el.resetRuntimeButton.addEventListener('click', () =>
  runControlAction(() => postJson('/api/control/reset')),
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
    const jobs = await fetchJson('/api/jobs');
    el.jobsError.textContent = '';
    renderJobsTable(jobs.jobs);

    if (selectedJobId) {
      const selected = jobs.jobs.find((job) => job.id === selectedJobId);
      if (selected) {
        el.jobDetails.textContent = toJsonText(selected);
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
