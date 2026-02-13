import { DEFAULT_PROMPT } from './constants.js';
import { matchRule } from './url-pattern.js';
import { loadUrlPatterns, saveUrlPatterns } from './rule-config.js';

function normalizeContentText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function extractTextBySelector(tabId, selector) {
  if (!selector) return '';

  if (!browser.scripting?.executeScript) {
    console.warn('当前浏览器不支持 scripting.executeScript，跳过 selector 提取');
    return '';
  }

  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (rawSelector) => {
        try {
          const element = document.querySelector(rawSelector);
          if (!element) return '';
          const text = element.innerText || element.textContent || '';
          return text.replace(/\s+/g, ' ').trim();
        } catch (error) {
          return '';
        }
      },
      args: [selector]
    });

    return results?.[0]?.result || '';
  } catch (error) {
    console.error('提取 selector 文本失败:', error);
    return '';
  }
}

async function getCurrentTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function buildGeminiQueryText(currentUrl, tabId, matchedRule) {
  const prompt = matchedRule.prompt || DEFAULT_PROMPT;
  const cssSelector = (matchedRule.cssSelector || '').trim();

  if (!cssSelector || typeof tabId !== 'number') {
    return `${currentUrl}\n${prompt}`;
  }

  const extractedText = normalizeContentText(await extractTextBySelector(tabId, cssSelector));
  return `${prompt}\n${extractedText}`;
}

async function openGeminiWithTab(tab) {
  const resolvedTab = tab?.url ? tab : await getCurrentTab();
  const currentUrl = resolvedTab?.url;
  const tabId = resolvedTab?.id;

  if (!currentUrl || !currentUrl.startsWith('http')) {
    return;
  }

  const urlPatterns = await loadUrlPatterns();
  const matchedRule = matchRule(currentUrl, urlPatterns);
  const queryText = await buildGeminiQueryText(currentUrl, tabId, matchedRule);
  const geminiUrl = `https://gemini.google.com/app?q=${encodeURIComponent(queryText)}`;
  await browser.tabs.create({ url: geminiUrl });
}

async function openGeminiWithCurrentTab() {
  try {
    const tab = await getCurrentTab();
    await openGeminiWithTab(tab);
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
}

browser.runtime.onInstalled.addListener(async () => {
  const urlPatterns = await loadUrlPatterns();
  await saveUrlPatterns(urlPatterns);
});

browser.action.onClicked.addListener(async (tab) => {
  await openGeminiWithTab(tab);
});

browser.commands.onCommand.addListener(async (command) => {
  if (command === 'open-gemini') {
    await openGeminiWithCurrentTab();
  }
});

export { };
