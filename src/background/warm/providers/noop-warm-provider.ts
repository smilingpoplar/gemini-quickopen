import type { WarmProvider } from '../types';

class NoopWarmProvider implements WarmProvider {
  async ensureReady() {
    return;
  }

  async acquire() {
    return null;
  }
}

export { NoopWarmProvider };
