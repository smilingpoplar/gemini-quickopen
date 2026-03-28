import { DEFAULT_PROMPT } from '../../shared/constants';
import { loadConfig } from '../../shared/config-storage';
import { findMatchingGroup } from '../../shared/url-pattern';
import {
  DEQUEUE_TIMEOUT_MS,
  GEMINI_URL,
  MESSAGE_MAX_RETRIES,
  MESSAGE_RETRY_DELAY_MS,
} from '../constants';
import { normalizeContentText, extractTextBySelector } from '../text-extractor';
import { warmService } from '../warm/warm-service';

export async function getCurrentTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function buildGeminiQueryText(currentUrl, tabId, matchedResult) {
  const prompt = matchedResult.prompt || DEFAULT_PROMPT;
  const cssSelector = (matchedResult.cssSelector || '').trim();

  if (!cssSelector || typeof tabId !== 'number') {
    return `${currentUrl}\n${prompt}`;
  }

  const extractedText = normalizeContentText(await extractTextBySelector(tabId, cssSelector));
  return `${currentUrl}\n${prompt}\n${extractedText}`;
}

export async function sendQueryToGeminiTab(targetTabId, queryText, attempt = 1): Promise<boolean> {
  if (typeof targetTabId !== 'number') {
    return false;
  }

  try {
    await browser.tabs.sendMessage(targetTabId, {
      type: 'GEMINI_QUERY',
      queryText,
    });
    return true;
  } catch {
    if (attempt < MESSAGE_MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, MESSAGE_RETRY_DELAY_MS));
      return sendQueryToGeminiTab(targetTabId, queryText, attempt + 1);
    }

    return false;
  }
}

async function discardConsumedWarmTab(tabId?: number | null) {
  if (typeof tabId !== 'number') {
    return;
  }

  try {
    await browser.tabs.remove(tabId);
  } catch {
    // noop
  }
}

async function openGeminiTabWithQuery(queryText) {
  const openedTab = await browser.tabs.create({ url: GEMINI_URL, active: true });
  const openedTabId = openedTab?.id;

  if (queryText && typeof openedTabId === 'number') {
    await sendQueryToGeminiTab(openedTabId, queryText);
  }

  return openedTabId;
}

export async function openPrerenderedGemini(queryText) {
  const item = await warmService.acquire(DEQUEUE_TIMEOUT_MS);
  const targetTabId = item?.tabId;

  if (typeof targetTabId !== 'number') {
    return openGeminiTabWithQuery(queryText);
  }

  if (queryText) {
    const sent = await sendQueryToGeminiTab(targetTabId, queryText);
    if (!sent) {
      await discardConsumedWarmTab(targetTabId);
      return openGeminiTabWithQuery(queryText);
    }
  }

  return targetTabId;
}

export async function openGeminiForTab(tab) {
  const resolvedTab = tab?.url ? tab : await getCurrentTab();
  const currentUrl = resolvedTab?.url;
  const tabId = resolvedTab?.id;

  if (!currentUrl || !currentUrl.startsWith('http')) {
    return;
  }

  const config = await loadConfig();
  const matchedResult = findMatchingGroup(currentUrl, config);
  const queryText = await buildGeminiQueryText(currentUrl, tabId, matchedResult);

  await openPrerenderedGemini(queryText);
}

export async function openGeminiForCurrentTab() {
  try {
    const tab = await getCurrentTab();
    await openGeminiForTab(tab);
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
}

export { discardConsumedWarmTab };
