import {
  GEMINI_URL,
  IS_CHROME,
  WINDOW_ID_NONE,
  FILL_DELAY_MS,
} from './constants';
import {
  getWindows,
  createWindow,
  moveTab,
  activateTab,
  focusWindow,
  removeWindow,
} from './window-utils';
import { IdsStore } from './ids-store';

type WarmItem = { tabId: number; windowId: number | null };
type QueueWaiter = { id: number; resolve: () => void };
type WarmState = 'idle' | 'warming' | 'ready' | 'consuming' | 'recovering';

class WarmInstance {
  private _warmItem: WarmItem | null;
  private _isCreating: boolean;
  private _isEnsuringOnScreenWindow: boolean;
  private _isWaitingForOnScreenWindow: boolean;
  private _suppressWarmPopupActivationUntil: number;
  private _fillTimer: ReturnType<typeof setTimeout> | null;
  private _cache: IdsStore;
  private _waiting: QueueWaiter[];
  private _waitingSeq: number;
  private _ensureFilledPromise: Promise<void> | null;
  private _state: WarmState;

  constructor() {
    this._warmItem = null;
    this._isCreating = false;
    this._isEnsuringOnScreenWindow = false;
    this._isWaitingForOnScreenWindow = false;
    this._suppressWarmPopupActivationUntil = 0;
    this._fillTimer = null;
    this._cache = new IdsStore();
    this._waiting = [];
    this._waitingSeq = 0;
    this._ensureFilledPromise = null;
    this._state = 'idle';
    this._init();
  }

  _init() {
    browser.tabs.onRemoved.addListener(async (removedTabId) => {
      await this._handleWarmSurfaceRemoved({ removedTabId });
    });

    browser.windows.onRemoved.addListener(async (removedWindowId) => {
      await this._handleWarmSurfaceRemoved({ removedWindowId });
    });

    browser.windows.onFocusChanged.addListener(async (windowId) => {
      await this._handleFocusChanged(windowId);
    });
  }

  get state() {
    return this._state;
  }

  _setState(state: WarmState) {
    this._state = state;
  }

  _reconcile(delayMs = FILL_DELAY_MS) {
    if (!IS_CHROME) return;
    this._scheduleFill(delayMs);
  }

  async _handleWarmSurfaceRemoved({
    removedTabId,
    removedWindowId,
  }: {
    removedTabId?: number;
    removedWindowId?: number;
  }) {
    if (!IS_CHROME) return;

    const removedWarmItem = typeof removedTabId === 'number'
      ? this._removeOffScreenByTabId(removedTabId)
      : typeof removedWindowId === 'number'
        ? this._removeOffScreenByWindowId(removedWindowId)
        : false;

    const cached = await this._getCache();
    const removedCachedItem = (typeof removedTabId === 'number' && cached.tabId === removedTabId)
      || (typeof removedWindowId === 'number' && cached.windowId === removedWindowId);

    if (removedCachedItem) {
      await this._clearCache();
    }

    const hasWindows = await this._hasOnScreenWindows();
    if (!hasWindows) {
      this._isWaitingForOnScreenWindow = true;
      this._suppressWarmPopupActivationUntil = Date.now() + 800;
      this._reconcile(0);
      return;
    }

    if (removedWarmItem || removedCachedItem) {
      this._setState('recovering');
      this._reconcile();
    }
  }

  async _handleFocusChanged(windowId: number) {
    if (!IS_CHROME) return;
    if (windowId === WINDOW_ID_NONE) return;

    const hasOnScreenWindows = await this._hasOnScreenWindows();
    if (hasOnScreenWindows) {
      this._isWaitingForOnScreenWindow = false;
      return;
    }

    const isWarmPopup = await this._isWarmPopupWindow(windowId);
    if (isWarmPopup && Date.now() < this._suppressWarmPopupActivationUntil) return;
    if (!isWarmPopup && !this._isWaitingForOnScreenWindow) return;

    this._isWaitingForOnScreenWindow = true;
    void this._ensureOnScreenWindowFromActivation();
  }

  _removeOffScreenByTabId(tabId: number) {
    if (this._warmItem?.tabId !== tabId) return false;
    this._warmItem = null;
    return true;
  }

  _removeOffScreenByWindowId(windowId: number) {
    if (this._warmItem?.windowId !== windowId) return false;
    this._warmItem = null;
    return true;
  }

  _scheduleFill(delayMs = FILL_DELAY_MS) {
    if (this._fillTimer) {
      clearTimeout(this._fillTimer);
    }

    this._fillTimer = setTimeout(() => {
      this._fillTimer = null;
      void this._requestEnsureFilled();
    }, delayMs);
  }

  async fill() {
    if (!this._warmItem) {
      this._setState('warming');
    }
    await this._requestEnsureFilled();
  }

  _removeWaiter(waiterId: number) {
    this._waiting = this._waiting.filter(waiter => waiter.id !== waiterId);
  }

  _notifyWaiters() {
    while (this._waiting.length > 0) {
      const waiter = this._waiting.shift();
      waiter?.resolve();
    }
  }

  _waitForItem(timeoutMs?: number) {
    if (this._warmItem) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      const waiterId = ++this._waitingSeq;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const waiter: QueueWaiter = {
        id: waiterId,
        resolve: () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(true);
        },
      };
      this._waiting.push(waiter);

      if (typeof timeoutMs === 'number' && timeoutMs >= 0) {
        timeoutId = setTimeout(() => {
          this._removeWaiter(waiterId);
          resolve(false);
        }, timeoutMs);
      }
    });
  }

  async dequeue(timeoutMs?: number) {
    if (!IS_CHROME) return null;
    const deadline = typeof timeoutMs === 'number' ? Date.now() + timeoutMs : null;

    while (true) {
      if (!this._warmItem) {
        this._setState('warming');
        void this._requestEnsureFilled();

        while (!this._warmItem) {
          let remaining: number | undefined;
          if (deadline !== null) {
            remaining = deadline - Date.now();
            if (remaining <= 0) {
              return null;
            }
          }

          const hasItem = await this._waitForItem(remaining);
          if (!hasItem) {
            return null;
          }
        }
      }

      const item = this._warmItem;
      this._warmItem = null;
      this._setState('consuming');

      if (!item) continue;

      try {
        await browser.tabs.get(item.tabId);
      } catch {
        if (item.windowId) {
          await removeWindow(item.windowId);
        }
        await this._clearCache();
        this._setState('recovering');
        this._reconcile(100);
        continue;
      }

      await this._clearCache();

      try {
        const windows = await getWindows();
        const targetWindow = windows.find(w => w.id !== item.windowId && w.focused)
          || windows.find(w => w.id !== item.windowId)
          || null;

        if (!targetWindow || typeof targetWindow.id !== 'number') {
          const createdWindow = await createWindow({
            tabId: item.tabId,
            type: 'normal',
            focused: true,
            state: 'maximized'
          });

          if (item.windowId && item.windowId !== createdWindow.id) {
            await removeWindow(item.windowId);
          }

          this._isWaitingForOnScreenWindow = (await getWindows()).length === 0;
          this._setState('recovering');
          this._reconcile(100);
          return { tabId: item.tabId, windowId: createdWindow.id || null };
        }

        await moveTab(item.tabId, targetWindow.id);
        await activateTab(item.tabId);
        await focusWindow(targetWindow.id);

        if (item.windowId !== targetWindow.id) {
          await removeWindow(item.windowId);
        }

        this._isWaitingForOnScreenWindow = (await getWindows()).length === 0;
        this._setState('recovering');
        this._reconcile(100);
        return { tabId: item.tabId, windowId: targetWindow.id };
      } catch {
        if (item.windowId) {
          await removeWindow(item.windowId);
        }
        this._setState('recovering');
        this._reconcile(100);
      }
    }
  }

  async _setWarmItem(tabId: number, windowId: number | null) {
    if (this._warmItem) {
      return;
    }

    this._warmItem = { tabId, windowId };
    this._setState('ready');
    await this._setCache(tabId, windowId);
    this._notifyWaiters();
  }

  async _clearCache() {
    await this._cache.clear();
  }

  async _getCache() {
    return this._cache.get();
  }

  async _setCache(tabId: number | null, windowId: number | null) {
    await this._cache.set(tabId, windowId);
  }

  async _hasOnScreenWindows() {
    const windows = await getWindows();
    return windows.length > 0;
  }

  async _findWarmPopupItems() {
    try {
      const popupWindows = await browser.windows.getAll({
        populate: true,
        windowTypes: ['popup']
      });

      return popupWindows
        .map((windowInfo) => {
          const firstTab = windowInfo.tabs?.[0];
          const tabUrl = firstTab?.url || '';
          const isGeminiTab = tabUrl.startsWith(GEMINI_URL);
          const isOffscreenShape = (windowInfo.left ?? 0) <= -1000
            && (windowInfo.width ?? 0) <= 5
            && (windowInfo.height ?? 0) <= 5;
          const tabId = firstTab?.id;
          const windowId = windowInfo.id;

          if (!isGeminiTab || !isOffscreenShape) return null;
          if (typeof tabId !== 'number' || typeof windowId !== 'number') return null;
          return { tabId, windowId };
        })
        .filter(item => item !== null);
    } catch {
      return [];
    }
  }

  async _isWarmPopupWindow(windowId: number) {
    if (typeof windowId !== 'number') return false;

    if (this._warmItem?.windowId === windowId) return true;

    const cached = await this._getCache();
    if (cached.windowId === windowId) return true;

    const warmItems = await this._findWarmPopupItems();
    return warmItems.some(item => item.windowId === windowId);
  }

  async _adoptExistingWarmPopupIfAny() {
    const warmItems = await this._findWarmPopupItems();
    if (warmItems.length === 0) return null;

    const [keepItem, ...redundantItems] = warmItems;

    for (const item of redundantItems) {
      await removeWindow(item.windowId);
    }

    this._warmItem = null;
    await this._clearCache();
    await this._setWarmItem(keepItem.tabId, keepItem.windowId);
    return keepItem;
  }

  async _getOffScreenFromCache() {
    if (this._warmItem) {
      return this._warmItem;
    }

    const cached = await this._getCache();
    if (!cached.tabId || !cached.windowId) {
      return null;
    }

    try {
      await browser.tabs.get(cached.tabId);
      await browser.windows.get(cached.windowId);
      return { tabId: cached.tabId, windowId: cached.windowId };
    } catch {
      this._removeOffScreenByTabId(cached.tabId);
      await this._clearCache();
      return null;
    }
  }

  async _ensureOnScreenWindowFromActivation() {
    if (this._isEnsuringOnScreenWindow) return;
    if (!this._isWaitingForOnScreenWindow) return;

    this._isEnsuringOnScreenWindow = true;
    try {
      const hasWindows = await this._hasOnScreenWindows();
      if (hasWindows) {
        this._isWaitingForOnScreenWindow = false;
        this._setState('recovering');
        this._reconcile(0);
        return;
      }

      const offScreenItem = await this._getOffScreenFromCache();
      if (!offScreenItem) {
        await this._requestEnsureFilled();
      }

      await createWindow({ type: 'normal', focused: true, state: 'maximized' });
      this._isWaitingForOnScreenWindow = (await getWindows()).length === 0;
      this._setState('recovering');
      this._reconcile();
    } finally {
      this._isEnsuringOnScreenWindow = false;
    }
  }

  async _ensureFilled() {
    if (!IS_CHROME) return;
    if (this._isCreating) return;

    const hasOnScreenWindows = await this._hasOnScreenWindows();
    this._isWaitingForOnScreenWindow = !hasOnScreenWindows;

    if (this._warmItem) return;

    const adoptedItem = await this._adoptExistingWarmPopupIfAny();
    if (adoptedItem) return;

    const offScreenItem = await this._getOffScreenFromCache();
    if (offScreenItem) {
      await this._setWarmItem(offScreenItem.tabId, offScreenItem.windowId);
      return;
    }

    await this._createWindow();
  }

  _requestEnsureFilled() {
    if (!IS_CHROME) {
      return Promise.resolve();
    }

    if (!this._ensureFilledPromise) {
      if (!this._warmItem) {
        this._setState('warming');
      }
      this._ensureFilledPromise = this._ensureFilled()
        .catch(() => {
          // noop: dequeue has timeout fallback.
        })
        .finally(() => {
          this._ensureFilledPromise = null;
          if (this._state !== 'consuming') {
            this._setState(this._warmItem ? 'ready' : 'idle');
          }
          this._notifyWaiters();
        });
    }

    return this._ensureFilledPromise;
  }

  async _createWindow() {
    if (!IS_CHROME) return;
    if (this._isCreating) return;

    this._isCreating = true;
    try {
      const offScreenItem = await this._getOffScreenFromCache();
      if (offScreenItem) {
        await this._setWarmItem(offScreenItem.tabId, offScreenItem.windowId);
        return;
      }

      const adoptedItem = await this._adoptExistingWarmPopupIfAny();
      if (adoptedItem) {
        return;
      }

      const win = await createWindow({
        url: GEMINI_URL,
        type: 'popup',
        left: -10000,
        top: 0,
        width: 1,
        height: 1,
        focused: false
      });

      const tab = win.tabs?.[0];
      if (!tab?.id || !win.id) {
        return;
      }

      await this._setWarmItem(tab.id, win.id);
    } finally {
      this._isCreating = false;
    }
  }
}

const warmInstance = new WarmInstance();

export { warmInstance };
