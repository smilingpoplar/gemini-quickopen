import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function createBrowserMock({
  popupWindows,
  normalWindows,
  createWindow,
}: {
  popupWindows: any[];
  normalWindows: any[];
  createWindow?: (config: any) => any;
}) {
  return {
    runtime: {
      getURL: () => 'chrome-extension://test-extension/',
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
    tabs: {
      onRemoved: {
        addListener: () => {},
      },
      get: async (tabId: number) => ({ id: tabId }),
      move: async () => {},
      update: async () => {},
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onRemoved: {
        addListener: () => {},
      },
      onFocusChanged: {
        addListener: () => {},
      },
      getAll: async ({ windowTypes }: { windowTypes?: string[] }) => {
        if (windowTypes?.includes('normal')) {
          return normalWindows;
        }

        if (windowTypes?.includes('popup')) {
          return popupWindows;
        }

        return [];
      },
      create: async (config: any) => {
        if (createWindow) return createWindow(config);
        return {
          id: 1000,
          tabs: [{ id: 1001, url: config.url ?? 'about:blank' }],
        };
      },
      update: async () => {},
      remove: async () => {},
      get: async (windowId: number) => ({ id: windowId }),
    },
  };
}

test('state should become ready after fill adopts warm popup', async () => {
  const originalBrowser = (globalThis as any).browser;

  (globalThis as any).browser = createBrowserMock({
    normalWindows: [{ id: 1, focused: true }],
    popupWindows: [{
      id: 900,
      left: -10000,
      top: 0,
      width: 1,
      height: 1,
      tabs: [{ id: 901, url: 'https://gemini.google.com/app' }],
    }],
  });

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/warm-instance.ts')).href}?state-ready=${Date.now()}`;
    const { warmInstance } = await import(moduleUrl);
    await warmInstance.fill();
    assert.equal(warmInstance.state, 'ready');
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});

test('state should become recovering right after dequeue consumes a warm item', async () => {
  const originalBrowser = (globalThis as any).browser;

  (globalThis as any).browser = createBrowserMock({
    normalWindows: [{ id: 1, focused: true }],
    popupWindows: [{
      id: 900,
      left: -10000,
      top: 0,
      width: 1,
      height: 1,
      tabs: [{ id: 901, url: 'https://gemini.google.com/app' }],
    }],
  });

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/warm-instance.ts')).href}?state-recovering=${Date.now()}`;
    const { warmInstance } = await import(moduleUrl);
    await warmInstance.fill();
    const consumed = await warmInstance.dequeue(20);
    assert.equal(consumed?.tabId, 901);
    assert.equal(warmInstance.state, 'recovering');
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});

test('state should return to idle when fill cannot create a usable warm item', async () => {
  const originalBrowser = (globalThis as any).browser;

  (globalThis as any).browser = createBrowserMock({
    normalWindows: [{ id: 1, focused: true }],
    popupWindows: [],
    createWindow: async () => ({ id: 1000, tabs: [] }),
  });

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/warm-instance.ts')).href}?state-idle=${Date.now()}`;
    const { warmInstance } = await import(moduleUrl);
    await warmInstance.fill();
    assert.equal(warmInstance.state, 'idle');
  } finally {
    (globalThis as any).browser = originalBrowser;
  }
});
