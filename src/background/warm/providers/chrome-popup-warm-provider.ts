import {
  FILL_DELAY_MS,
  GEMINI_URL,
  WINDOW_ID_NONE,
} from '../../constants';
import {
  activateTab,
  createWindow,
  focusWindow,
  getWindows,
  moveTab,
  removeWindow,
} from '../../window-utils';
import {
  clearGeminiReadyState,
  installGeminiReadyTracker,
  waitForGeminiTabReadyState,
} from '../../gemini-ready-tracker';
import { WarmResourceStore } from '../warm-resource-store';
import type { WarmItem } from '../types';
import { BaseWarmProvider } from './base-warm-provider';

class ChromePopupWarmProvider extends BaseWarmProvider {
  private _isCreating: boolean;
  private _isEnsuringOnScreenWindow: boolean;
  private _isWaitingForOnScreenWindow: boolean;
  private _suppressWarmPopupActivationUntil: number;
  private _fillTimer: ReturnType<typeof setTimeout> | null;
  private _store: WarmResourceStore;

  constructor(store = new WarmResourceStore()) {
    super();
    installGeminiReadyTracker();
    this._isCreating = false;
    this._isEnsuringOnScreenWindow = false;
    this._isWaitingForOnScreenWindow = false;
    this._suppressWarmPopupActivationUntil = 0;
    this._fillTimer = null;
    this._store = store;
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

  _scheduleEnsureReady(delayMs = FILL_DELAY_MS) {
    if (this._fillTimer) {
      clearTimeout(this._fillTimer);
    }

    this._fillTimer = setTimeout(() => {
      this._fillTimer = null;
      void this.requestEnsureReady();
    }, delayMs);
  }

  _removeWarmItemByTabId(tabId: number) {
    if (this.warmItem?.tabId !== tabId) {
      return false;
    }

    this.clearInMemoryWarmItem();
    return true;
  }

  _removeWarmItemByWindowId(windowId: number) {
    if (this.warmItem?.windowId !== windowId) {
      return false;
    }

    this.clearInMemoryWarmItem();
    return true;
  }

  async _handleWarmSurfaceRemoved({
    removedTabId,
    removedWindowId,
  }: {
    removedTabId?: number;
    removedWindowId?: number;
  }) {
    const removedWarmItem = typeof removedTabId === 'number'
      ? this._removeWarmItemByTabId(removedTabId)
      : typeof removedWindowId === 'number'
        ? this._removeWarmItemByWindowId(removedWindowId)
        : false;

    const stored = await this._getStoredWarmItem();
    const removedStoredItem = (typeof removedTabId === 'number' && stored?.tabId === removedTabId)
      || (typeof removedWindowId === 'number' && stored?.windowId === removedWindowId);

    if (removedStoredItem) {
      await this._store.clear();
    }

    const hasWindows = await this._hasOnScreenWindows();
    if (!hasWindows) {
      this._isWaitingForOnScreenWindow = true;
      this._suppressWarmPopupActivationUntil = Date.now() + 800;
      this._scheduleEnsureReady(0);
      return;
    }

    if (removedWarmItem || removedStoredItem) {
      this.setWarmState('recovering');
      this._scheduleEnsureReady();
    }
  }

  async _handleFocusChanged(windowId: number) {
    if (windowId === WINDOW_ID_NONE) {
      return;
    }

    const hasOnScreenWindows = await this._hasOnScreenWindows();
    if (hasOnScreenWindows) {
      this._isWaitingForOnScreenWindow = false;
      return;
    }

    const isWarmPopup = await this._isWarmPopupWindow(windowId);
    if (isWarmPopup && Date.now() < this._suppressWarmPopupActivationUntil) {
      return;
    }
    if (!isWarmPopup && !this._isWaitingForOnScreenWindow) {
      return;
    }

    this._isWaitingForOnScreenWindow = true;
    void this._ensureOnScreenWindowFromActivation();
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

    if (this.warmItem?.windowId === windowId) return true;

    const stored = await this._getStoredWarmItem();
    if (stored?.windowId === windowId) return true;

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

    this.clearInMemoryWarmItem();
    await this._store.clear();
    await this.setWarmItem(keepItem);
    return keepItem;
  }

  async _getStoredWarmItem() {
    if (this.warmItem) {
      return this.warmItem;
    }

    const stored = await this._store.get('chrome-popup');
    if (!stored || stored.windowId === null) {
      return null;
    }

    try {
      await browser.tabs.get(stored.tabId);
      await browser.windows.get(stored.windowId);
      return { tabId: stored.tabId, windowId: stored.windowId };
    } catch {
      this._removeWarmItemByTabId(stored.tabId);
      await this._store.clear();
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
        this.setWarmState('recovering');
        this._scheduleEnsureReady(0);
        return;
      }

      const stored = await this._getStoredWarmItem();
      if (!stored) {
        await this.requestEnsureReady();
      }

      await createWindow({ type: 'normal', focused: true, state: 'maximized' });
      this._isWaitingForOnScreenWindow = (await getWindows()).length === 0;
      this.setWarmState('recovering');
      this._scheduleEnsureReady();
    } finally {
      this._isEnsuringOnScreenWindow = false;
    }
  }

  protected async ensureFilled() {
    if (this._isCreating) return;

    const hasOnScreenWindows = await this._hasOnScreenWindows();
    this._isWaitingForOnScreenWindow = !hasOnScreenWindows;

    if (this.warmItem) return;

    const adoptedItem = await this._adoptExistingWarmPopupIfAny();
    if (adoptedItem) return;

    const stored = await this._getStoredWarmItem();
    if (stored) {
      await this.setWarmItem(stored);
      return;
    }

    await this._createPopupWindow();
  }

  protected async consumeWarmItem(item: WarmItem) {
    try {
      await browser.tabs.get(item.tabId);
    } catch {
      if (item.windowId) {
        await removeWindow(item.windowId);
      }
      await this._store.clear();
      this.setWarmState('recovering');
      this._scheduleEnsureReady(100);
      return null;
    }

    await this._store.clear();

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
        this.setWarmState('recovering');
        this._scheduleEnsureReady(100);
        return { tabId: item.tabId, windowId: createdWindow.id || null };
      }

      await moveTab(item.tabId, targetWindow.id);
      await activateTab(item.tabId);
      await focusWindow(targetWindow.id);

      if (item.windowId !== targetWindow.id) {
        await removeWindow(item.windowId);
      }

      this._isWaitingForOnScreenWindow = (await getWindows()).length === 0;
      this.setWarmState('recovering');
      this._scheduleEnsureReady(100);
      return { tabId: item.tabId, windowId: targetWindow.id };
    } catch {
      if (item.windowId) {
        await removeWindow(item.windowId);
      }
      this.setWarmState('recovering');
      this._scheduleEnsureReady(100);
      return null;
    }
  }

  protected async persistWarmItem(item: WarmItem) {
    await this._store.set({
      kind: 'chrome-popup',
      tabId: item.tabId,
      windowId: item.windowId,
    });
  }

  async _createPopupWindow() {
    if (this._isCreating) return;

    this._isCreating = true;
    try {
      const stored = await this._getStoredWarmItem();
      if (stored) {
        await this.setWarmItem(stored);
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

      const isReady = await waitForGeminiTabReadyState(tab.id);
      if (!isReady) {
        clearGeminiReadyState(tab.id);
        await removeWindow(win.id);
        return;
      }

      await this.setWarmItem({ tabId: tab.id, windowId: win.id });
    } finally {
      this._isCreating = false;
    }
  }
}

export { ChromePopupWarmProvider };
