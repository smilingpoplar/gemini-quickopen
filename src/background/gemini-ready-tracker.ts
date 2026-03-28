const GEMINI_CONTENT_READY = 'GEMINI_CONTENT_READY';
const DEFAULT_READY_TIMEOUT_MS = 5000;

let installed = false;
const readyTabIds = new Set<number>();
const waiters = new Map<number, Array<(isReady: boolean) => void>>();

function markGeminiTabReady(tabId: number) {
  readyTabIds.add(tabId);
}

function clearGeminiReadyState(tabId: number) {
  readyTabIds.delete(tabId);
  const tabWaiters = waiters.get(tabId) ?? [];
  waiters.delete(tabId);
  for (const resolve of tabWaiters) {
    resolve(false);
  }
}

function waitForGeminiTabReadyState(tabId: number, timeoutMs = DEFAULT_READY_TIMEOUT_MS): Promise<boolean> {
  if (typeof tabId !== 'number') {
    return Promise.resolve(false);
  }

  if (readyTabIds.has(tabId)) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const tabWaiters = waiters.get(tabId) ?? [];
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (isReady: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const currentWaiters = waiters.get(tabId) ?? [];
      const remainingWaiters = currentWaiters.filter(waiter => waiter !== finish);
      if (remainingWaiters.length > 0) {
        waiters.set(tabId, remainingWaiters);
      } else {
        waiters.delete(tabId);
      }
      resolve(isReady);
    };

    tabWaiters.push(finish);
    waiters.set(tabId, tabWaiters);
    timeoutId = setTimeout(() => {
      finish(false);
    }, timeoutMs);
  });
}

function installGeminiReadyTracker() {
  if (installed) {
    return;
  }

  installed = true;

  browser.runtime?.onMessage?.addListener?.((message, sender) => {
    if (message?.type !== GEMINI_CONTENT_READY) {
      return undefined;
    }

    const tabId = sender.tab?.id;
    if (typeof tabId === 'number') {
      markGeminiTabReady(tabId);
      const tabWaiters = waiters.get(tabId) ?? [];
      waiters.delete(tabId);
      for (const resolve of tabWaiters) {
        resolve(true);
      }
    }

    return undefined;
  });

  browser.tabs?.onRemoved?.addListener?.((tabId) => {
    clearGeminiReadyState(tabId);
  });
}

export {
  DEFAULT_READY_TIMEOUT_MS,
  GEMINI_CONTENT_READY,
  clearGeminiReadyState,
  installGeminiReadyTracker,
  markGeminiTabReady,
  waitForGeminiTabReadyState,
};
