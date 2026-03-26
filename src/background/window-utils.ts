import { WINDOW_ID_NONE } from './constants';

export async function getWindows() {
  return browser.windows.getAll({ windowTypes: ['normal'] });
}

export async function createWindow(config: any) {
  return browser.windows.create(config);
}

export async function moveTab(tabId: number, windowId: number, index = -1) {
  return browser.tabs.move(tabId, { windowId, index });
}

export async function activateTab(tabId: number) {
  return browser.tabs.update(tabId, { active: true });
}

export async function focusWindow(windowId: number) {
  if (windowId === WINDOW_ID_NONE) return;
  return browser.windows.update(windowId, { focused: true });
}

export async function removeWindow(windowId?: number | null) {
  if (!windowId) return;
  try {
    await browser.windows.remove(windowId);
  } catch {
    // noop
  }
}
