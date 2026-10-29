import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationRunner } from '../src/generator/generationRunner.js';

class FakeWorker {
  listeners = new Map();
  posted = [];
  terminated = false;

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  postMessage(job) {
    this.posted.push(job);
  }

  terminate() {
    this.terminated = true;
  }

  emit(type, data) {
    this.listeners.get(type)?.(type === 'message'
      ? { data }
      : { message: data, preventDefault() {} });
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(overrides = {}) {
  const worker = new FakeWorker();
  const results = [];
  const errors = [];
  const modes = [];
  const fallbackJobs = [];
  const runner = createGenerationRunner({
    createWorker: () => worker,
    generateFallback: async (settings, signal) => {
      fallbackJobs.push({ settings, signal });
      return { seed: settings.seed };
    },
    onResult: (id, result) => results.push({ id, result }),
    onError: (id, error) => errors.push({ id, error }),
    onModeChange: (mode) => modes.push(mode),
    ...overrides,
  });
  return { runner, worker, results, errors, modes, fallbackJobs };
}

test('uses compatibility mode if worker construction is blocked', async () => {
  const state = setup({ createWorker: () => { throw new Error('Workers blocked'); } });
  assert.equal(state.runner.mode, 'fallback');
  state.runner.request(1, { seed: 12 });
  await tick();
  assert.deepEqual(state.results, [{ id: 1, result: { seed: 12 } }]);
  assert.deepEqual(state.modes, ['fallback']);
  assert.equal(state.errors.length, 0);
  state.runner.dispose();
});

test('recovers from a worker load error using the latest pending settings', async () => {
  const state = setup();
  state.runner.request(1, { seed: 10 });
  state.runner.request(2, { seed: 20 });
  state.worker.emit('error', 'Module worker blocked');
  await tick();
  assert.equal(state.worker.terminated, true);
  assert.equal(state.runner.mode, 'fallback');
  assert.deepEqual(state.results, [{ id: 2, result: { seed: 20 } }]);
  assert.equal(state.fallbackJobs.length, 1);
  assert.equal(state.errors.length, 0);
  state.runner.dispose();
});

test('falls back if a worker never sends its startup handshake', async () => {
  const state = setup({ startupTimeoutMs: 5 });
  state.runner.request(1, { seed: 31 });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(state.runner.mode, 'fallback');
  assert.equal(state.worker.terminated, true);
  assert.deepEqual(state.results, [{ id: 1, result: { seed: 31 } }]);
  state.runner.dispose();
});

test('worker requests coalesce and stale results cannot replace the latest mesh', () => {
  const state = setup();
  state.runner.request(1, { seed: 1 });
  state.runner.request(2, { seed: 2 });
  state.worker.emit('message', { type: 'ready' });
  assert.deepEqual(state.worker.posted.map((job) => job.id), [2]);
  state.runner.request(3, { seed: 3 });
  state.runner.request(4, { seed: 4 });
  state.worker.emit('message', { id: 2, result: { seed: 2 } });
  assert.deepEqual(state.worker.posted.map((job) => job.id), [2, 4]);
  assert.deepEqual(state.results, []);
  state.worker.emit('message', { id: 4, result: { seed: 4 } });
  assert.deepEqual(state.results, [{ id: 4, result: { seed: 4 } }]);
  assert.deepEqual(state.modes, ['worker']);
  state.runner.dispose();
});

test('recovers from worker failure after startup without losing a newer request', async () => {
  const state = setup();
  state.worker.emit('message', { type: 'ready' });
  state.runner.request(1, { seed: 1 });
  state.runner.request(2, { seed: 2 });
  state.worker.emit('messageerror', 'Worker message failed');
  await tick();
  assert.equal(state.worker.terminated, true);
  assert.deepEqual(state.results, [{ id: 2, result: { seed: 2 } }]);
  state.runner.dispose();
});

test('falls back if a started worker stops responding to a job', async () => {
  const state = setup({ jobTimeoutMs: 5 });
  state.worker.emit('message', { type: 'ready' });
  state.runner.request(1, { seed: 42 });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(state.runner.mode, 'fallback');
  assert.deepEqual(state.results, [{ id: 1, result: { seed: 42 } }]);
  state.runner.dispose();
});

test('a newer compatibility request aborts and ignores the old one', async () => {
  const deferred = [];
  const state = setup({
    createWorker: () => { throw new Error('Unavailable'); },
    generateFallback: (settings, signal) => new Promise((resolve) => deferred.push({ settings, signal, resolve })),
  });
  state.runner.request(1, { seed: 1 });
  await tick();
  state.runner.request(2, { seed: 2 });
  await tick();
  assert.equal(deferred[0].signal.aborted, true);
  deferred[0].resolve({ seed: 1 });
  deferred[1].resolve({ seed: 2 });
  await tick();
  assert.deepEqual(state.results, [{ id: 2, result: { seed: 2 } }]);
  state.runner.dispose();
});

test('reports a real fallback failure and supports retrying the same settings', async () => {
  let attempts = 0;
  const state = setup({
    createWorker: () => { throw new Error('Unavailable'); },
    generateFallback: async (settings) => {
      if (++attempts === 1) throw new Error('Temporary generator error');
      return { seed: settings.seed };
    },
  });
  state.runner.request(1, { seed: 11 });
  await tick();
  assert.equal(state.errors[0].error.message, 'Temporary generator error');
  state.runner.request(2, { seed: 11 });
  await tick();
  assert.deepEqual(state.results, [{ id: 2, result: { seed: 11 } }]);
  state.runner.dispose();
});

test('disposing cancels work and prevents late callbacks', async () => {
  let resolveJob;
  let signal;
  const state = setup({
    createWorker: () => { throw new Error('Unavailable'); },
    generateFallback: (_settings, currentSignal) => {
      signal = currentSignal;
      return new Promise((resolve) => { resolveJob = resolve; });
    },
  });
  state.runner.request(1, { seed: 1 });
  await tick();
  state.runner.dispose();
  assert.equal(signal.aborted, true);
  resolveJob({ seed: 1 });
  await tick();
  assert.deepEqual(state.results, []);
  assert.deepEqual(state.errors, []);
});
