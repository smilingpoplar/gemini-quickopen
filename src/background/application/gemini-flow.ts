import { DEFAULT_PROMPT } from '../../shared/constants';
import { findMatchingGroup } from '../../shared/url-pattern';
import { loadConfig, saveConfig } from '../../shared/config-storage';
import { normalizeContentText, extractTextBySelector } from '../text-extractor';
import { warmInstance } from '../warm-instance';
import {
  GEMINI_URL,
  IS_CHROME,
  DEQUEUE_TIMEOUT_MS,
  MESSAGE_MAX_RETRIES,
  MESSAGE_RETRY_DELAY_MS,
} from '../constants';

export function setupExtensionLifecycle() {
  browser.runtime.onInstalled.addListener(async () => {
    const config = await loadConfig();
    await saveConfig(config);
    await warmInstance.fill();
  });

  browser.runtime.onStartup.addListener(async () => {
    await warmInstance.fill();
  });
}

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

async function openGeminiTabWithQuery(queryText) {
  const openedTab = await browser.tabs.create({ url: GEMINI_URL, active: true });
  const openedTabId = openedTab?.id;

  if (queryText && typeof openedTabId === 'number') {
    await sendQueryToGeminiTab(openedTabId, queryText);
  }

  return openedTabId;
}

export async function openPrerenderedGemini(queryText) {
  if (!IS_CHROME) {
    return openGeminiTabWithQuery(queryText);
  }

  const item = await warmInstance.dequeue(DEQUEUE_TIMEOUT_MS);
  const targetTabId = item?.tabId;

  if (typeof targetTabId !== 'number') {
    return openGeminiTabWithQuery(queryText);
  }

  if (queryText) {
    const sent = await sendQueryToGeminiTab(targetTabId, queryText);
    if (!sent) {
      return openGeminiTabWithQuery(queryText);
    }
  }

  return targetTabId;
}

export async function openGeminiWithTab(tab) {
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

export async function openGeminiWithCurrentTab() {
  try {
    const tab = await getCurrentTab();
    await openGeminiWithTab(tab);
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
}

export async function handleGeminiNavigation(details) {
  if (!IS_CHROME) return;
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
  const prerender = await warmInstance.dequeue(DEQUEUE_TIMEOUT_MS);
  const prerenderTabId = prerender?.tabId;

  if (typeof prerenderTabId !== 'number') return;
  if (triggerTabId === prerenderTabId) return;

  try {
    const sent = await sendQueryToGeminiTab(prerenderTabId, queryText);
    if (!sent) {
      await warmInstance.fill();
      return;
    }

    await browser.tabs.remove(triggerTabId);
  } catch (error) {
    console.error('处理 Gemini 导航失败:', error);
  }
}
