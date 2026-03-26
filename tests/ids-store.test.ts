import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function createStorage(initialSession = {}, initialLocal = {}) {
  const sessionState = { ...initialSession };
  const localState = { ...initialLocal };
  const calls = {
    sessionGet: 0,
    localGet: 0,
  };

  return {
    calls,
    browser: {
      runtime: {
        getURL: () => 'chrome-extension://test-extension/',
      },
      storage: {
        session: {
          get: async (keys: string[]) => {
            calls.sessionGet += 1;
            return Object.fromEntries(keys.map((key) => [key, (sessionState as any)[key]]));
          },
          set: async (data: Record<string, unknown>) => {
            Object.assign(sessionState, data);
          },
          remove: async (keys: string[]) => {
            for (const key of keys) delete (sessionState as any)[key];
          },
        },
        local: {
          get: async (keys: string[]) => {
            calls.localGet += 1;
            return Object.fromEntries(keys.map((key) => [key, (localState as any)[key]]));
          },
          set: async (data: Record<string, unknown>) => {
            Object.assign(localState, data);
          },
          remove: async (keys: string[]) => {
            for (const key of keys) delete (localState as any)[key];
          },
        },
      },
    },
    readSession: () => ({ ...sessionState }),
    readLocal: () => ({ ...localState }),
  };
}

async function loadIdsStoreModule(tag: string) {
  const moduleUrl = `${pathToFileURL(path.resolve('src/background/ids-store.ts')).href}?test=${tag}`;
  return import(moduleUrl);
}

test('get should return memory directly when memory has valid pair', async () => {
  const originalBrowser = (globalThis as any).browser;
  const { browser, calls } = createStorage();
  (globalThis as any).browser = browser;

  try {
    const { IdsStore } = await loadIdsStoreModule(`memory-${Date.now()}`);
    const cache = new IdsStore();
    await cache.set(11, 22);

    const value = await cache.get();
    assert.deepEqual(value, { tabId: 11, windowId: 22 });
    assert.equal(calls.sessionGet, 0);
    assert.equal(calls.localGet, 0);
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});

test('get should prefer session pair, else fallback to local pair', async () => {
  const originalBrowser = (globalThis as any).browser;
  const { browser } = createStorage(
    { prerenderTabId: 101 },
    { prerenderTabIdPersist: 7, prerenderWindowIdPersist: 9 },
  );
  (globalThis as any).browser = browser;

  try {
    const { IdsStore } = await loadIdsStoreModule(`fallback-${Date.now()}`);
    const cache = new IdsStore();

    const value = await cache.get();
    assert.deepEqual(value, { tabId: 7, windowId: 9 });
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});

test('set and clear should sync session/local and memory', async () => {
  const originalBrowser = (globalThis as any).browser;
  const env = createStorage();
  (globalThis as any).browser = env.browser;

  try {
    const { IdsStore } = await loadIdsStoreModule(`set-clear-${Date.now()}`);
    const cache = new IdsStore();

    await cache.set(3, 4);
    assert.equal((env.readSession() as any).prerenderTabId, 3);
    assert.equal((env.readSession() as any).prerenderWindowId, 4);
    assert.equal((env.readLocal() as any).prerenderTabIdPersist, 3);
    assert.equal((env.readLocal() as any).prerenderWindowIdPersist, 4);

    await cache.clear();
    assert.equal((env.readSession() as any).prerenderTabId, undefined);
    assert.equal((env.readSession() as any).prerenderWindowId, undefined);
    assert.equal((env.readLocal() as any).prerenderTabIdPersist, undefined);
    assert.equal((env.readLocal() as any).prerenderWindowIdPersist, undefined);
    assert.deepEqual(await cache.get(), { tabId: null, windowId: null });
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});
