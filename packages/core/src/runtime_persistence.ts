import fs from 'fs';
import path from 'path';
import { jobQueue } from './job_queue';
import { applyRuntimeCollections, clearRuntimeCollections, type PersistedRuntimeState, runtimeStore } from './state_store';

const DATA_DIR = path.resolve(process.cwd(), '.runtime-data');

const FILES = {
  signals: path.join(DATA_DIR, 'signals.json'),
  plans: path.join(DATA_DIR, 'plans.json'),
  jobs: path.join(DATA_DIR, 'jobs.json'),
  artifacts: path.join(DATA_DIR, 'artifacts.json'),
  events: path.join(DATA_DIR, 'events.json'),
  queue: path.join(DATA_DIR, 'queue.json'),
};

function ensureDataDir(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[runtime_persistence] Failed to parse ${filePath}. Using fallback. ${reason}`);
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function loadRuntimeState(): PersistedRuntimeState {
  ensureDataDir();

  const loadedState: PersistedRuntimeState = {
    signals: readJsonFile(FILES.signals, []),
    plans: readJsonFile(FILES.plans, []),
    jobs: readJsonFile(FILES.jobs, []),
    artifacts: readJsonFile(FILES.artifacts, []),
    events: readJsonFile(FILES.events, []),
    queue: readJsonFile(FILES.queue, { queue: [], executing: [] }),
  };

  applyRuntimeCollections(loadedState);
  jobQueue.restore(loadedState.jobs, loadedState.queue);

  return loadedState;
}

export function saveRuntimeState(): PersistedRuntimeState {
  ensureDataDir();

  const state: PersistedRuntimeState = {
    signals: runtimeStore.signals,
    plans: runtimeStore.plans,
    jobs: runtimeStore.jobs,
    artifacts: runtimeStore.artifacts,
    events: runtimeStore.events,
    queue: jobQueue.getState(),
  };

  writeJsonFile(FILES.signals, state.signals);
  writeJsonFile(FILES.plans, state.plans);
  writeJsonFile(FILES.jobs, state.jobs);
  writeJsonFile(FILES.artifacts, state.artifacts);
  writeJsonFile(FILES.events, state.events);
  writeJsonFile(FILES.queue, state.queue);

  return state;
}

export function resetPersistedState(): void {
  ensureDataDir();

  Object.values(FILES).forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  clearRuntimeCollections();
  jobQueue.reset();
  saveRuntimeState();
}
