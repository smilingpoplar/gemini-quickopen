import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('waitForGeminiTabReadyState should resolve when matching ready message arrives', async () => {
  const originalBrowser = (globalThis as any).browser;

  const listeners: Record<string, any> = {
    onMessage: null,
    onRemoved: null,
  };
  (globalThis as any).browser = {
    runtime: {
      onMessage: {
        addListener: (handler: unknown) => {
          listeners.onMessage = handler;
        },
      },
    },
    tabs: {
      onRemoved: {
        addListener: (handler: unknown) => {
          listeners.onRemoved = handler;
        },
      },
    },
  };

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/gemini-ready-tracker.ts')).href}?wait-ready=${Date.now()}`;
    const {
      GEMINI_CONTENT_READY,
      installGeminiReadyTracker,
      waitForGeminiTabReadyState,
    } = await import(moduleUrl);

    installGeminiReadyTracker();
    const readyPromise = waitForGeminiTabReadyState(701, 500);
    listeners.onMessage({ type: GEMINI_CONTENT_READY }, { tab: { id: 701 } });
    const isReady = await readyPromise;

    assert.equal(isReady, true);
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});

test('waitForGeminiTabReadyState should resolve false on timeout or removal', async () => {
  const originalBrowser = (globalThis as any).browser;

  const listeners: Record<string, any> = {
    onMessage: null,
    onRemoved: null,
  };
  (globalThis as any).browser = {
    runtime: {
      onMessage: {
        addListener: (handler: unknown) => {
          listeners.onMessage = handler;
        },
      },
    },
    tabs: {
      onRemoved: {
        addListener: (handler: unknown) => {
          listeners.onRemoved = handler;
        },
      },
    },
  };

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/gemini-ready-tracker.ts')).href}?install-ready=${Date.now()}`;
    const {
      installGeminiReadyTracker,
      waitForGeminiTabReadyState,
    } = await import(moduleUrl);

    installGeminiReadyTracker();
    assert.equal(typeof listeners.onRemoved, 'function');

    const removedPromise = waitForGeminiTabReadyState(42, 500);
    listeners.onRemoved(42);
    assert.equal(await removedPromise, false);

    const timeoutResult = await waitForGeminiTabReadyState(43, 10);
    assert.equal(timeoutResult, false);
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});
