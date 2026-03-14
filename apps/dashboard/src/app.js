const API_BASE = 'http://localhost:3000';
const REFRESH_MS = 3000;

const el = {
  meta: document.getElementById('meta'),
  runtimeStatus: document.getElementById('runtime-status'),
  agents: document.getElementById('agents'),
  skills: document.getElementById('skills'),
  workflows: document.getElementById('workflows'),
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
let selectedPublishTargetId = 'local_files';
let selectedWorkspaceId = 'ghostclaw_core';
let selectedBlueprintId = 'ai_seo_agency';

function ensureDynamicSections() {
  const layout = document.querySelector('.layout');
  if (!layout) return;

  const addSection = (id, title, bodyHtml, wide = true) => {
    if (document.getElementById(id)) return;
    const panel = document.createElement('section');
    panel.id = id;
    panel.className = `panel${wide ? ' wide' : ''}`;
    panel.innerHTML = `<h2>${title}</h2>${bodyHtml}`;
    layout.appendChild(panel);
  };

  addSection(
    'workspace-panel',
    'Workspace',
    '<div class="row"><label for="workspace-select">Workspace</label><select id="workspace-select"></select></div><pre id="workspace-policy">Loading policy...</pre>',
  );
  addSection(
    'blueprints-panel',
    'Workspace Blueprints',
    '<pre id="blueprints">Loading blueprints...</pre><div class="row"><select id="blueprint-select"></select><input id="new-workspace-name" placeholder="Workspace name" /><input id="new-workspace-id" placeholder="workspace_id (optional)" /><button id="create-workspace">Create Workspace</button></div><pre id="workspace-create-result">No workspace creation actions yet.</pre>',
  );
  addSection('events-panel', 'Recent Events', '<pre id="events">Loading...</pre>');
  addSection(
    'publish-panel',
    'Publish Targets',
    '<div class="row"><select id="publish-target-select"></select><button id="publish-artifact">Publish Selected Artifact</button></div><pre id="publish-result">No publish actions yet.</pre>',
  );
  addSection('published-outputs-panel', 'Published Outputs', '<pre id="published-outputs">Loading...</pre>');

  el.workspaceSelect = document.getElementById('workspace-select');
  el.workspacePolicy = document.getElementById('workspace-policy');
  el.blueprints = document.getElementById('blueprints');
  el.blueprintSelect = document.getElementById('blueprint-select');
  el.newWorkspaceName = document.getElementById('new-workspace-name');
  el.newWorkspaceId = document.getElementById('new-workspace-id');
  el.createWorkspaceButton = document.getElementById('create-workspace');
  el.workspaceCreateResult = document.getElementById('workspace-create-result');
  el.events = document.getElementById('events');
  el.publishTargetSelect = document.getElementById('publish-target-select');
  el.publishArtifactButton = document.getElementById('publish-artifact');
  el.publishResult = document.getElementById('publish-result');
  el.publishedOutputs = document.getElementById('published-outputs');
}

ensureDynamicSections();

function toJsonText(value) {
  return JSON.stringify(value, null, 2);
}

function queryWithWorkspace(path, includeWorkspace = true) {
  if (!includeWorkspace || !selectedWorkspaceId) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}workspaceId=${encodeURIComponent(selectedWorkspaceId)}`;
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
  const workflow = job.workflowId ? ` | workflow: ${job.workflowId}` : '';
  const workspace = job.workspaceId ? ` | workspace: ${job.workspaceId}` : '';
  el.jobReviewState.textContent = `Review state: ${review}${blocked}${workflow}${workspace}`;
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

function attachEvents() {
  el.sendTestSignalButton.addEventListener('click', () =>
    runAction(
      () => postJson('/api/control/signals/test', { signalName: el.testSignalName.value, workspaceId: selectedWorkspaceId }),
      el.controlResult,
    ),
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
  el.resetRuntimeButton.addEventListener('click', () => runAction(() => postJson('/api/control/reset'), el.controlResult));

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

  if (el.publishTargetSelect) {
    el.publishTargetSelect.addEventListener('change', () => {
      selectedPublishTargetId = el.publishTargetSelect.value;
    });
  }

  if (el.publishArtifactButton) {
    el.publishArtifactButton.addEventListener('click', () =>
      runAction(() => {
        if (!selectedArtifactId) throw new Error('Select an artifact first.');
        return postJson(`/api/publish/artifacts/${selectedArtifactId}`, { targetId: selectedPublishTargetId });
      }, el.publishResult),
    );
  }

  if (el.createWorkspaceButton) {
    el.createWorkspaceButton.addEventListener('click', () =>
      runAction(() => postJson('/api/workspaces/from-blueprint', {
        blueprintId: el.blueprintSelect?.value || selectedBlueprintId,
        workspaceName: el.newWorkspaceName?.value,
        workspaceId: el.newWorkspaceId?.value,
      }), el.workspaceCreateResult),
    );
  }

  if (el.blueprintSelect) {
    el.blueprintSelect.addEventListener('change', () => {
      selectedBlueprintId = el.blueprintSelect.value || selectedBlueprintId;
    });
  }

  if (el.workspaceSelect) {
    el.workspaceSelect.addEventListener('change', async () => {
      selectedWorkspaceId = el.workspaceSelect.value || 'ghostclaw_core';
      selectedJobId = null;
      selectedArtifactId = null;
      el.jobDetails.textContent = 'Click a job row to view details.';
      el.artifactDetails.textContent = 'Click an artifact row to view details.';
      await refreshDashboard();
    });
  }
}

async function refreshDashboard() {
  const startedAt = new Date();
  let hadError = false;

  try {
    const workspaceData = await fetchJson('/api/runtime/workspaces');
    if (el.workspaceSelect) {
      el.workspaceSelect.innerHTML = workspaceData.workspaces
        .map((workspace) => `<option value="${workspace.id}">${workspace.name} (${workspace.id})</option>`)
        .join('');
      el.workspaceSelect.value = selectedWorkspaceId;
      if (el.workspaceSelect.value !== selectedWorkspaceId) {
        selectedWorkspaceId = workspaceData.defaultWorkspaceId;
        el.workspaceSelect.value = selectedWorkspaceId;
      }

      const selected = workspaceData.workspaces.find((workspace) => workspace.id === selectedWorkspaceId);
      if (el.workspacePolicy) {
        el.workspacePolicy.classList.remove('error');
        el.workspacePolicy.textContent = selected?.policy
          ? toJsonText(selected.policy)
          : 'No workspace policy found.';
      }
    }
  } catch (error) {
    hadError = true;
    if (el.workspacePolicy) {
      el.workspacePolicy.textContent = `Failed to fetch workspace policy: ${error.message}`;
      el.workspacePolicy.classList.add('error');
    }
  }


  try {
    const blueprintsData = await fetchJson('/api/workspaces/blueprints');
    if (el.blueprints) {
      el.blueprints.classList.remove('error');
      el.blueprints.textContent = toJsonText(blueprintsData);
    }

    if (el.blueprintSelect) {
      el.blueprintSelect.innerHTML = blueprintsData.blueprints
        .filter((blueprint) => blueprint.status === 'active')
        .map((blueprint) => `<option value="${blueprint.id}">${blueprint.name} (${blueprint.id})</option>`)
        .join('');
      el.blueprintSelect.value = selectedBlueprintId;
      selectedBlueprintId = el.blueprintSelect.value || selectedBlueprintId;
    }
  } catch (error) {
    hadError = true;
    if (el.blueprints) {
      el.blueprints.classList.add('error');
      el.blueprints.textContent = `Failed to fetch blueprints: ${error.message}`;
    }
  }

  try {
    const runtime = await fetchJson(queryWithWorkspace('/api/runtime/status'));
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
    const workflows = await fetchJson(queryWithWorkspace('/api/runtime/workflows'));
    el.workflows.textContent = toJsonText(workflows);
    el.workflows.classList.remove('error');
  } catch (error) {
    hadError = true;
    el.workflows.classList.add('error');
    el.workflows.textContent = `Failed to fetch workflows: ${error.message}`;
  }

  try {
    const events = await fetchJson(queryWithWorkspace('/api/runtime/events'));
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
    const publishTargets = await fetchJson(queryWithWorkspace('/api/publish/targets'));
    if (el.publishTargetSelect) {
      el.publishTargetSelect.innerHTML = publishTargets.targets
        .map((target) => `<option value="${target.id}">${target.name} (${target.id})</option>`)
        .join('');
      el.publishTargetSelect.value = selectedPublishTargetId;
      selectedPublishTargetId = el.publishTargetSelect.value || selectedPublishTargetId;
    }
  } catch (error) {
    hadError = true;
    if (el.publishResult) {
      el.publishResult.className = 'error';
      el.publishResult.textContent = `Failed to fetch publish targets: ${error.message}`;
    }
  }

  try {
    const published = await fetchJson(queryWithWorkspace('/api/publish/outputs'));
    if (el.publishedOutputs) {
      el.publishedOutputs.textContent = toJsonText(published);
      el.publishedOutputs.classList.remove('error');
    }
  } catch (error) {
    hadError = true;
    if (el.publishedOutputs) {
      el.publishedOutputs.classList.add('error');
      el.publishedOutputs.textContent = `Failed to fetch published outputs: ${error.message}`;
    }
  }

  try {
    const jobs = await fetchJson(queryWithWorkspace('/api/jobs'));
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
    const artifacts = await fetchJson(queryWithWorkspace('/api/artifacts'));
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
  el.meta.textContent = `${prefix} at ${startedAt.toLocaleTimeString()} (workspace: ${selectedWorkspaceId}, refresh every ${REFRESH_MS / 1000}s)`;
}

attachEvents();
refreshDashboard();
setInterval(refreshDashboard, REFRESH_MS);
