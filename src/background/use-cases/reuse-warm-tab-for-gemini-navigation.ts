import { DEQUEUE_TIMEOUT_MS } from '../constants';
import { warmService } from '../warm/warm-service';
import { sendQueryToGeminiTab } from './open-gemini-flow';

type NavigationSwapDetails = {
  frameId?: number;
  tabId?: number;
  url?: string;
};

type NavigationSwapDeps = {
  acquire: typeof warmService.acquire;
  ensureReady: typeof warmService.ensureReady;
  removeTab: typeof browser.tabs.remove;
  sendQuery: typeof sendQueryToGeminiTab;
};

function createReuseWarmTabForGeminiNavigation(deps: NavigationSwapDeps) {
  return async function reuseWarmTabForGeminiNavigation(details: NavigationSwapDetails) {
    if (details.frameId !== 0) return;
    if (!details.url?.startsWith('https://gemini.google.com')) return;

    let queryText;
    try {
      const url = new URL(details.url);
      queryText = url.searchParams.get('q');
    } catch {
      return;
    }

    if (!queryText) return;

    const triggerTabId = details.tabId;
    const prerender = await deps.acquire(DEQUEUE_TIMEOUT_MS);
    const prerenderTabId = prerender?.tabId;

    if (typeof prerenderTabId !== 'number') return;
    if (triggerTabId === prerenderTabId) return;

    try {
      const sent = await deps.sendQuery(prerenderTabId, queryText);
      if (!sent) {
        await deps.ensureReady();
        return;
      }

      if (typeof triggerTabId === 'number') {
        await deps.removeTab(triggerTabId);
      }
    } catch (error) {
      console.error('处理 Gemini 导航失败:', error);
    }
  };
}

const reuseWarmTabForGeminiNavigation = createReuseWarmTabForGeminiNavigation({
  acquire: warmService.acquire.bind(warmService),
  ensureReady: warmService.ensureReady.bind(warmService),
  removeTab: browser.tabs.remove.bind(browser.tabs),
  sendQuery: sendQueryToGeminiTab,
});

export { createReuseWarmTabForGeminiNavigation, reuseWarmTabForGeminiNavigation };
