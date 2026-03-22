import request from 'supertest';
import app from '../apps/api/src/app';

describe('POST /api/operator/run', () => {
  it('rejects missing script field', async () => {
    const res = await request(app).post('/api/operator/run').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/"script" is required/);
    expect(res.body.allowed).toEqual(expect.arrayContaining(['check-runtime']));
  });

  it('rejects unknown script names', async () => {
    const res = await request(app).post('/api/operator/run').send({ script: 'rm-rf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unknown script/);
    expect(res.body.allowed).toBeDefined();
  });

  it('executes check-runtime and returns stdout/stderr/success', async () => {
    // check-runtime will fail because no server is running on port 3000 during tests,
    // but it should still execute and return structured output
    const res = await request(app).post('/api/operator/run').send({ script: 'check-runtime' });
    expect(res.status).toBe(200);
    expect(res.body.script).toBe('check-runtime');
    expect(typeof res.body.success).toBe('boolean');
    expect(typeof res.body.stdout).toBe('string');
    expect(typeof res.body.stderr).toBe('string');
  }, 15000);
});

describe('GET /api/operator/scripts', () => {
  it('lists all allowed scripts', async () => {
    const res = await request(app).get('/api/operator/scripts');
    expect(res.status).toBe(200);
    expect(res.body.scripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'check-runtime' }),
        expect.objectContaining({ name: 'test-variation' }),
        expect.objectContaining({ name: 'check-export' }),
        expect.objectContaining({ name: 'dev' }),
      ]),
    );
  });
});
