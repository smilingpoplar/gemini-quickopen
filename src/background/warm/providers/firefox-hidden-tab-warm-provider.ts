import { FILL_DELAY_MS, GEMINI_URL } from '../../constants';
import {
  clearGeminiReadyState,
  installGeminiReadyTracker,
  waitForGeminiTabReadyState,
} from '../../gemini-ready-tracker';
import { activateTab, focusWindow } from '../../window-utils';
import { WarmResourceStore } from '../warm-resource-store';
import type { WarmItem } from '../types';
import { BaseWarmProvider } from './base-warm-provider';

class FirefoxHiddenTabWarmProvider extends BaseWarmProvider {
  private _isCreating: boolean;
  private _fillTimer: ReturnType<typeof setTimeout> | null;
  private _store: WarmResourceStore;

  constructor(store = new WarmResourceStore()) {
    super();
    installGeminiReadyTracker();
    this._isCreating = false;
    this._fillTimer = null;
    this._store = store;
    this._init();
  }

  _init() {
    browser.tabs.onRemoved.addListener(async (removedTabId) => {
      await this._handleWarmSurfaceRemoved(removedTabId);
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

  async _handleWarmSurfaceRemoved(removedTabId: number) {
    const removedWarmItem = this._removeWarmItemByTabId(removedTabId);
    const stored = await this._getStoredWarmItem();
    const removedStoredItem = stored?.tabId === removedTabId;

    if (removedStoredItem) {
      await this._store.clear();
    }

    if (removedWarmItem || removedStoredItem) {
      this.setWarmState('recovering');
      this._scheduleEnsureReady();
    }
  }

  async _getStoredWarmItem() {
    if (this.warmItem) {
      return this.warmItem;
    }

    const stored = await this._store.get('firefox-hidden-tab');
    if (!stored) {
      return null;
    }

    try {
      await browser.tabs.get(stored.tabId);
      if (typeof stored.windowId === 'number') {
        await browser.windows.get(stored.windowId);
      }
      return { tabId: stored.tabId, windowId: stored.windowId };
    } catch {
      this._removeWarmItemByTabId(stored.tabId);
      await this._store.clear();
      return null;
    }
  }

  protected async ensureFilled() {
    if (this.warmItem) {
      return;
    }

    const stored = await this._getStoredWarmItem();
    if (stored) {
      await this.setWarmItem(stored);
      return;
    }

    await this._createHiddenTab();
  }

  protected async consumeWarmItem(item: WarmItem) {
    try {
      await browser.tabs.get(item.tabId);
    } catch {
      await this._store.clear();
      this.setWarmState('recovering');
      this._scheduleEnsureReady(100);
      return null;
    }

    await this._store.clear();

    try {
      await browser.tabs.show(item.tabId);
      await activateTab(item.tabId);
      if (typeof item.windowId === 'number') {
        await focusWindow(item.windowId);
      }

      this.setWarmState('recovering');
      this._scheduleEnsureReady(100);
      return item;
    } catch {
      try {
        await browser.tabs.remove(item.tabId);
      } catch {
        // noop
      }
      this.setWarmState('recovering');
      this._scheduleEnsureReady(100);
      return null;
    }
  }

  protected async persistWarmItem(item: WarmItem) {
    await this._store.set({
      kind: 'firefox-hidden-tab',
      tabId: item.tabId,
      windowId: item.windowId,
    });
  }

  async _createHiddenTab() {
    if (this._isCreating) return;

    this._isCreating = true;
    try {
      const stored = await this._getStoredWarmItem();
      if (stored) {
        await this.setWarmItem(stored);
        return;
      }

      const tab = await browser.tabs.create({ url: GEMINI_URL, active: false });
      if (!tab?.id) {
        return;
      }

      try {
        await browser.tabs.hide(tab.id);
      } catch {
        await browser.tabs.remove(tab.id);
        await this._store.clear();
        return;
      }

      const isReady = await waitForGeminiTabReadyState(tab.id);
      if (!isReady) {
        clearGeminiReadyState(tab.id);
        await browser.tabs.remove(tab.id);
        await this._store.clear();
        return;
      }

      await this.setWarmItem({ tabId: tab.id, windowId: tab.windowId ?? null });
    } finally {
      this._isCreating = false;
    }
  }
}

export { FirefoxHiddenTabWarmProvider };
