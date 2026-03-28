import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function createImportSafeBrowserMock() {
  return {
    runtime: {
      getURL: () => 'moz-extension://test-extension/',
    },
    tabs: {
      remove: async () => {},
      onRemoved: { addListener: () => {} },
      hide: async () => {},
      show: async () => {},
    },
    windows: {
      get: async () => ({ id: 1 }),
      update: async () => {},
    },
    storage: {
      session: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {},
      },
      local: {
        get: async () => ({}),
        set: async () => {},
        remove: async () => {},
      },
    },
  };
}

test('reuse warm tab for Gemini navigation should forward q to prerendered tab', async () => {
  const originalBrowser = (globalThis as any).browser;
  (globalThis as any).browser = createImportSafeBrowserMock();

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/use-cases/reuse-warm-tab-for-gemini-navigation.ts')).href}?firefox-navigation=${Date.now()}`;
    const { createReuseWarmTabForGeminiNavigation } = await import(moduleUrl);
    const calls = {
      acquire: [] as number[],
      sendQuery: [] as Array<{ tabId: number; queryText: string }>,
      removeTab: [] as number[],
      ensureReady: 0,
      order: [] as string[],
    };

    const reuseWarmTabForGeminiNavigation = createReuseWarmTabForGeminiNavigation({
      acquire: async (timeoutMs?: number) => {
        calls.acquire.push(timeoutMs ?? -1);
        return { tabId: 701, windowId: 702 };
      },
      ensureReady: async () => {
        calls.ensureReady += 1;
      },
      removeTab: async (tabId: number) => {
        calls.order.push(`remove:${tabId}`);
        calls.removeTab.push(tabId);
      },
      sendQuery: async (tabId: number, queryText: string) => {
        calls.order.push(`send:${tabId}`);
        calls.sendQuery.push({ tabId, queryText });
        return true;
      },
    });

    await reuseWarmTabForGeminiNavigation({
      frameId: 0,
      tabId: 123,
      url: 'https://gemini.google.com/app?q=hello%20firefox',
    });

    assert.deepEqual(calls.acquire, [2000]);
    assert.deepEqual(calls.sendQuery, [{ tabId: 701, queryText: 'hello firefox' }]);
    assert.deepEqual(calls.removeTab, [123]);
    assert.deepEqual(calls.order, ['send:701', 'remove:123']);
    assert.equal(calls.ensureReady, 0);
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});

test('reuse warm tab for Gemini navigation should keep trigger tab and recover on send failure', async () => {
  const originalBrowser = (globalThis as any).browser;
  const removedTabs: number[] = [];
  (globalThis as any).browser = {
    ...createImportSafeBrowserMock(),
    tabs: {
      remove: async (tabId: number) => {
        removedTabs.push(tabId);
      },
      onRemoved: { addListener: () => {} },
      hide: async () => {},
      show: async () => {},
    },
  };

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/use-cases/reuse-warm-tab-for-gemini-navigation.ts')).href}?firefox-navigation-fail=${Date.now()}`;
    const { createReuseWarmTabForGeminiNavigation } = await import(moduleUrl);
    const calls = {
      ensureReady: 0,
    };

    const reuseWarmTabForGeminiNavigation = createReuseWarmTabForGeminiNavigation({
      acquire: async () => ({ tabId: 701, windowId: 702 }),
      ensureReady: async () => {
        calls.ensureReady += 1;
      },
      removeTab: async (tabId: number) => {
        removedTabs.push(tabId);
      },
      sendQuery: async () => false,
    });

    await reuseWarmTabForGeminiNavigation({
      frameId: 0,
      tabId: 123,
      url: 'https://gemini.google.com/app?q=hello%20firefox',
    });

    assert.deepEqual(removedTabs, []);
    assert.equal(calls.ensureReady, 1);
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});
