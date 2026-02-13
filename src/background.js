import { DEFAULT_PROMPT } from './constants.js';
import { findMatchingGroup } from './url-pattern.js';
import { loadConfig, saveConfig } from './options/prompt-config.js';

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

async function buildGeminiQueryText(currentUrl, tabId, matchedResult) {
  const prompt = matchedResult.prompt || DEFAULT_PROMPT;
  const cssSelector = (matchedResult.cssSelector || '').trim();

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

  const config = await loadConfig();
  const matchedResult = findMatchingGroup(currentUrl, config);
  const queryText = await buildGeminiQueryText(currentUrl, tabId, matchedResult);

  const geminiUrl = 'https://gemini.google.com/app';
  const newTab = await browser.tabs.create({ url: geminiUrl });

  const sendQueryToContentScript = async (attempt = 1) => {
    try {
      await browser.tabs.sendMessage(newTab.id, {
        type: 'GEMINI_QUERY',
        queryText
      });
    } catch (error) {
      if (attempt < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await sendQueryToContentScript(attempt + 1);
      }
    }
  };

  await sendQueryToContentScript();
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
  const config = await loadConfig();
  await saveConfig(config);
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
