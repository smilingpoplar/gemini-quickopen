import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

test('when only warm popup exists, focus should still trigger normal window creation', async () => {
  const originalBrowser = (globalThis as any).browser;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalNow = Date.now;

  const listeners: Record<string, any> = {
    onTabRemoved: null,
    onWindowRemoved: null,
    onFocusChanged: null,
    onMessage: null,
  };
  const createWindowCalls: any[] = [];

  (globalThis as any).setTimeout = () => 1;
  (globalThis as any).clearTimeout = () => {};

  (globalThis as any).browser = {
    runtime: {
      getURL: () => 'chrome-extension://test-extension/',
      onMessage: {
        addListener: (handler: unknown) => {
          listeners.onMessage = handler;
        },
      },
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
        addListener: (handler: unknown) => {
          listeners.onTabRemoved = handler;
        },
      },
      get: async (tabId: number) => ({ id: tabId }),
      move: async () => {},
      update: async () => {},
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onRemoved: {
        addListener: (handler: unknown) => {
          listeners.onWindowRemoved = handler;
        },
      },
      onFocusChanged: {
        addListener: (handler: unknown) => {
          listeners.onFocusChanged = handler;
        },
      },
      getAll: async ({ windowTypes }: { windowTypes?: string[] }) => {
        if (windowTypes?.includes('normal')) {
          return [];
        }

        if (windowTypes?.includes('popup')) {
          return [
            {
              id: 900,
              left: -10000,
              top: 0,
              width: 1,
              height: 1,
              tabs: [{ id: 901, url: 'https://gemini.google.com/app' }],
            },
          ];
        }

        return [];
      },
      create: async (config: any) => {
        createWindowCalls.push(config);
        const tabId = config.tabId ?? 1002;
        queueMicrotask(() => {
          listeners.onMessage?.({ type: 'GEMINI_CONTENT_READY' }, { tab: { id: tabId } });
        });
        return {
          id: typeof config.tabId === 'number' ? 1001 : 1000,
          tabs: [{ id: tabId, url: config.url ?? 'about:blank' }],
        };
      },
      update: async () => {},
      remove: async () => {},
      get: async (windowId: number) => ({ id: windowId }),
    },
  };

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/warm/providers/chrome-popup-warm-provider.ts')).href}?test=${Date.now()}`;
    let nowValue = 5000;
    Date.now = () => nowValue;

    const { ChromePopupWarmProvider } = await import(moduleUrl);
    const provider = new ChromePopupWarmProvider();
    (provider as any)._scheduleEnsureReady = () => {};

    const originalEnsureOnScreenWindowFromActivation = (provider as any)._ensureOnScreenWindowFromActivation.bind(provider);
    let pendingEnsure: Promise<void> | null = null;
    (provider as any)._ensureOnScreenWindowFromActivation = () => {
      pendingEnsure = originalEnsureOnScreenWindowFromActivation();
      return pendingEnsure;
    };

    assert.equal(typeof listeners.onFocusChanged, 'function');
    await listeners.onFocusChanged(900);
    if (pendingEnsure) {
      await pendingEnsure;
    }

    const normalWindowCall = createWindowCalls.find((call) => call.type === 'normal');
    assert.ok(normalWindowCall, 'should create a normal window');
    assert.equal(normalWindowCall.focused, true);
    assert.equal(normalWindowCall.state, 'maximized');
  } finally {
    (globalThis as any).browser = originalBrowser;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    Date.now = originalNow;
  }
});

test('closing the last normal window should not immediately auto-reopen a normal window', async () => {
  const originalBrowser = (globalThis as any).browser;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalNow = Date.now;

  let nowValue = 1000;
  Date.now = () => nowValue;

  const listeners: Record<string, any> = {
    onTabRemoved: null,
    onWindowRemoved: null,
    onFocusChanged: null,
    onMessage: null,
  };
  const createWindowCalls: any[] = [];

  (globalThis as any).setTimeout = () => 1;
  (globalThis as any).clearTimeout = () => {};

  (globalThis as any).browser = {
    runtime: {
      getURL: () => 'chrome-extension://test-extension/',
      onMessage: {
        addListener: (handler: unknown) => {
          listeners.onMessage = handler;
        },
      },
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
        addListener: (handler: unknown) => {
          listeners.onTabRemoved = handler;
        },
      },
      get: async (tabId: number) => ({ id: tabId }),
      move: async () => {},
      update: async () => {},
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onRemoved: {
        addListener: (handler: unknown) => {
          listeners.onWindowRemoved = handler;
        },
      },
      onFocusChanged: {
        addListener: (handler: unknown) => {
          listeners.onFocusChanged = handler;
        },
      },
      getAll: async ({ windowTypes }: { windowTypes?: string[] }) => {
        if (windowTypes?.includes('normal')) {
          return [];
        }

        if (windowTypes?.includes('popup')) {
          return [
            {
              id: 900,
              left: -10000,
              top: 0,
              width: 1,
              height: 1,
              tabs: [{ id: 901, url: 'https://gemini.google.com/app' }],
            },
          ];
        }

        return [];
      },
      create: async (config: any) => {
        createWindowCalls.push(config);
        const tabId = config.tabId ?? 1002;
        queueMicrotask(() => {
          listeners.onMessage?.({ type: 'GEMINI_CONTENT_READY' }, { tab: { id: tabId } });
        });
        return {
          id: typeof config.tabId === 'number' ? 1001 : 1000,
          tabs: [{ id: tabId, url: config.url ?? 'about:blank' }],
        };
      },
      update: async () => {},
      remove: async () => {},
      get: async (windowId: number) => ({ id: windowId }),
    },
  };

  try {
    const moduleUrl = `${pathToFileURL(path.resolve('src/background/warm/providers/chrome-popup-warm-provider.ts')).href}?test=${Date.now()}-close`;
    const { ChromePopupWarmProvider } = await import(moduleUrl);
    const provider = new ChromePopupWarmProvider();
    (provider as any)._scheduleEnsureReady = () => {};

    const originalEnsureOnScreenWindowFromActivation = (provider as any)._ensureOnScreenWindowFromActivation.bind(provider);
    let pendingEnsure: Promise<void> | null = null;
    (provider as any)._ensureOnScreenWindowFromActivation = () => {
      pendingEnsure = originalEnsureOnScreenWindowFromActivation();
      return pendingEnsure;
    };

    assert.equal(typeof listeners.onWindowRemoved, 'function');
    assert.equal(typeof listeners.onFocusChanged, 'function');

    await listeners.onWindowRemoved(111);
    await listeners.onFocusChanged(900);
    if (pendingEnsure) {
      await pendingEnsure;
      pendingEnsure = null;
    }

    const normalWindowCall = createWindowCalls.find((call) => call.type === 'normal');
    assert.equal(normalWindowCall, undefined, 'should not auto-reopen normal window immediately after close');

    nowValue = 2000;
    await listeners.onFocusChanged(900);
    if (pendingEnsure) {
      await pendingEnsure;
      pendingEnsure = null;
    }

    const delayedNormalWindowCall = createWindowCalls.find((call) => call.type === 'normal');
    assert.ok(delayedNormalWindowCall, 'should allow creating normal window after suppression window passes');
  } finally {
    (globalThis as any).browser = originalBrowser;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    Date.now = originalNow;
  }
});
