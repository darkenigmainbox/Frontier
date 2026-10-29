/**
 * Use a module worker when available, but recover automatically when a browser,
 * embedding policy, proxy or worker failure prevents it from starting. Newer
 * requests supersede older ones in both modes.
 */
export function createGenerationRunner({
  createWorker,
  generateFallback,
  onResult,
  onError,
  onModeChange = () => {},
  startupTimeoutMs = 10000,
  jobTimeoutMs = 60000,
}) {
  let mode = 'starting';
  let disposed = false;
  let worker = null;
  let latest = null;
  let pending = null;
  let inFlight = null;
  let fallbackController = null;
  let startupTimer = null;
  let jobTimer = null;

  function clearTimers() {
    if (startupTimer !== null) clearTimeout(startupTimer);
    if (jobTimer !== null) clearTimeout(jobTimer);
    startupTimer = null;
    jobTimer = null;
  }

  function runFallback(job) {
    if (disposed) return;
    fallbackController?.abort();
    const controller = new AbortController();
    fallbackController = controller;
    // Deferring the call lets rapid changes cancel an obsolete job before it
    // starts and lets the browser paint the loading indicator first.
    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted) return null;
        return generateFallback(job.settings, controller.signal);
      })
      .then((result) => {
        if (!disposed && !controller.signal.aborted && latest?.id === job.id) onResult(job.id, result);
      })
      .catch((error) => {
        if (!disposed && !controller.signal.aborted && latest?.id === job.id) onError(job.id, error);
      })
      .finally(() => {
        if (fallbackController === controller) fallbackController = null;
      });
  }

  function switchToFallback(reason) {
    if (disposed || mode === 'fallback') return;
    mode = 'fallback';
    clearTimers();
    worker?.terminate?.();
    worker = null;
    inFlight = null;
    pending = null;
    onModeChange('fallback', reason);
    if (latest) runFallback(latest);
  }

  function dispatchNext() {
    if (disposed || mode !== 'worker' || inFlight || !pending) return;
    inFlight = pending;
    pending = null;
    jobTimer = setTimeout(() => switchToFallback(new Error('The generator worker stopped responding.')), jobTimeoutMs);
    try {
      worker.postMessage(inFlight);
    } catch (error) {
      switchToFallback(error);
    }
  }

  function onWorkerMessage(event) {
    if (disposed) return;
    const data = event.data;
    if (data?.type === 'ready' && mode === 'starting') {
      if (startupTimer !== null) clearTimeout(startupTimer);
      startupTimer = null;
      mode = 'worker';
      onModeChange('worker');
      dispatchNext();
      return;
    }
    if (mode !== 'worker' || !inFlight || data?.id !== inFlight.id) return;
    if (jobTimer !== null) clearTimeout(jobTimer);
    jobTimer = null;
    const finished = inFlight;
    inFlight = null;
    if (latest?.id === finished.id) {
      if (data.error) onError(finished.id, new Error(data.error));
      else onResult(finished.id, data.result);
    }
    dispatchNext();
  }

  try {
    worker = createWorker();
    worker.addEventListener('message', onWorkerMessage);
    const handleWorkerFailure = (event) => {
      event.preventDefault?.();
      switchToFallback(new Error(event.message || 'The generator worker could not start.'));
    };
    worker.addEventListener('error', handleWorkerFailure);
    worker.addEventListener('messageerror', handleWorkerFailure);
    if (mode === 'starting') {
      startupTimer = setTimeout(() => switchToFallback(new Error('The generator worker did not start in time.')), startupTimeoutMs);
    }
  } catch (error) {
    switchToFallback(error);
  }

  return {
    request(id, settings) {
      if (disposed) return;
      latest = { id, settings };
      if (mode === 'fallback') {
        runFallback(latest);
      } else {
        // Only retain the newest request while the worker is starting or busy.
        pending = latest;
        dispatchNext();
      }
    },
    dispose() {
      disposed = true;
      clearTimers();
      fallbackController?.abort();
      worker?.terminate?.();
      worker = null;
      latest = null;
      pending = null;
      inFlight = null;
    },
    get mode() { return mode; },
  };
}
