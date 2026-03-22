import { Router } from 'express';
import { exec } from 'child_process';
import * as path from 'path';

const router = Router();

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** Whitelisted scripts that operators can run via API. */
const ALLOWED_SCRIPTS: Record<string, string> = {
  'dev': './scripts/dev-sqlite.sh',
  'check-runtime': './scripts/check-runtime.sh',
  'test-variation': './scripts/test-variation.sh',
  'check-export': './scripts/check-export.sh',
};

const TIMEOUT_MS = 30_000;

// POST /api/operator/run — execute a whitelisted script
router.post('/run', (req, res) => {
  const { script } = req.body ?? {};

  if (!script || typeof script !== 'string') {
    res.status(400).json({ error: '"script" is required.', allowed: Object.keys(ALLOWED_SCRIPTS) });
    return;
  }

  const scriptPath = ALLOWED_SCRIPTS[script];
  if (!scriptPath) {
    res.status(400).json({
      error: `Unknown script "${script}". Allowed: ${Object.keys(ALLOWED_SCRIPTS).join(', ')}`,
      allowed: Object.keys(ALLOWED_SCRIPTS),
    });
    return;
  }

  exec(
    scriptPath,
    { cwd: PROJECT_ROOT, timeout: TIMEOUT_MS, env: { ...process.env } },
    (err, stdout, stderr) => {
      const success = !err;
      res.json({
        script,
        success,
        stdout: stdout || '',
        stderr: stderr || '',
        ...(err && { error: err.message }),
      });
    },
  );
});

// GET /api/operator/scripts — list available scripts
router.get('/scripts', (_req, res) => {
  res.json({
    scripts: Object.entries(ALLOWED_SCRIPTS).map(([name, path]) => ({ name, path })),
  });
});

export default router;
