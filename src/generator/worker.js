import { generateRock } from './rockGeometry.js';

self.addEventListener('message', (event) => {
  const { id, settings } = event.data;
  try {
    const result = generateRock(settings);
    self.postMessage({ id, result }, [
      result.positions.buffer,
      result.normals.buffer,
      result.tangents.buffer,
      result.colors.buffer,
      result.uvs.buffer,
      result.indices.buffer,
    ]);
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});

// A handshake lets the UI detect blocked or stalled module-worker startup.
self.postMessage({ type: 'ready' });
