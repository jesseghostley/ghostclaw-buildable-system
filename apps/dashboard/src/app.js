const API_BASE = 'http://localhost:3000';
const REFRESH_MS = 3000;

const sections = {
  runtimeStatus: document.getElementById('runtime-status'),
  queue: document.getElementById('queue'),
  agents: document.getElementById('agents'),
  artifacts: document.getElementById('artifacts'),
  meta: document.getElementById('meta'),
};

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
  ];

  const results = await Promise.allSettled(
    requests.map((request) => fetchJson(request.path)),
  );

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

  const statusText = hadError ? 'Updated with errors' : 'Updated successfully';
  sections.meta.textContent = `${statusText} at ${startedAt.toLocaleTimeString()} (refreshes every ${REFRESH_MS / 1000}s)`;
}

refreshDashboard();
setInterval(refreshDashboard, REFRESH_MS);
