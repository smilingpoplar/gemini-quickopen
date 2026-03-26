import {
  STORAGE_KEY_TAB,
  STORAGE_KEY_WINDOW,
  STORAGE_KEY_TAB_PERSIST,
  STORAGE_KEY_WINDOW_PERSIST,
} from './constants';

class IdsStore {
  private _memory: { tabId: number | null; windowId: number | null };

  constructor() {
    this._memory = { tabId: null, windowId: null };
  }

  _isValidPair(value: { tabId: number | null; windowId: number | null }) {
    return typeof value?.tabId === 'number' && typeof value?.windowId === 'number';
  }

  _normalizePair(tabId: unknown, windowId: unknown) {
    return {
      tabId: typeof tabId === 'number' ? tabId : null,
      windowId: typeof windowId === 'number' ? windowId : null,
    };
  }

  async _readFromStorage() {
    const sessionResult = await browser.storage.session.get([STORAGE_KEY_TAB, STORAGE_KEY_WINDOW]);
    const sessionPair = this._normalizePair(sessionResult[STORAGE_KEY_TAB], sessionResult[STORAGE_KEY_WINDOW]);
    if (this._isValidPair(sessionPair)) {
      return sessionPair;
    }

    const localResult = await browser.storage.local.get([STORAGE_KEY_TAB_PERSIST, STORAGE_KEY_WINDOW_PERSIST]);
    const localPair = this._normalizePair(localResult[STORAGE_KEY_TAB_PERSIST], localResult[STORAGE_KEY_WINDOW_PERSIST]);
    if (this._isValidPair(localPair)) {
      return localPair;
    }

    return { tabId: null, windowId: null };
  }

  async get() {
    if (this._isValidPair(this._memory)) {
      return this._memory;
    }

    const pair = await this._readFromStorage();
    this._memory = pair;

    if (this._isValidPair(pair)) {
      await this.set(pair.tabId, pair.windowId);
    }

    return this._memory;
  }

  async set(tabId: number | null, windowId: number | null) {
    this._memory = { tabId, windowId };

    const sessionData = {};
    const localData = {};

    if (tabId !== null) {
      sessionData[STORAGE_KEY_TAB] = tabId;
      localData[STORAGE_KEY_TAB_PERSIST] = tabId;
    }

    if (windowId !== null) {
      sessionData[STORAGE_KEY_WINDOW] = windowId;
      localData[STORAGE_KEY_WINDOW_PERSIST] = windowId;
    }

    await browser.storage.session.set(sessionData);
    await browser.storage.local.set(localData);
  }

  async clear() {
    this._memory = { tabId: null, windowId: null };
    await browser.storage.session.remove([STORAGE_KEY_TAB, STORAGE_KEY_WINDOW]);
    await browser.storage.local.remove([STORAGE_KEY_TAB_PERSIST, STORAGE_KEY_WINDOW_PERSIST]);
  }
}

export { IdsStore };
