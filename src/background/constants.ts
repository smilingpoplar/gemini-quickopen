export const GEMINI_URL = 'https://gemini.google.com/app';

export const IS_CHROME = browser.runtime.getURL('').startsWith('chrome-extension://');

export const STORAGE_KEY_TAB = 'prerenderTabId';
export const STORAGE_KEY_WINDOW = 'prerenderWindowId';
export const STORAGE_KEY_TAB_PERSIST = 'prerenderTabIdPersist';
export const STORAGE_KEY_WINDOW_PERSIST = 'prerenderWindowIdPersist';

export const WINDOW_ID_NONE = browser.windows?.WINDOW_ID_NONE ?? -1;

export const FILL_DELAY_MS = 2000;
export const DEQUEUE_TIMEOUT_MS = 2000;

export const MESSAGE_MAX_RETRIES = 10;
export const MESSAGE_RETRY_DELAY_MS = 500;
