import { DEFAULT_PROMPT, matchRule } from './url-pattern.js';
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

function normalizeContentText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

async function extractTextBySelector(tabId, selector) {
  if (!selector) return '';

  if (!browserAPI.scripting?.executeScript) {
    console.warn('当前浏览器不支持 scripting.executeScript，跳过 selector 提取');
    return '';
  }

  try {
    const results = await browserAPI.scripting.executeScript({
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

// 打开 Gemini 的核心逻辑
async function openGeminiWithCurrentTab() {
  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;
    const tabId = tab.id;

    // 如果 URL 不是 http/https 开头，不执行任何操作
    if (!currentUrl || !currentUrl.startsWith('http')) {
      return;
    }

    const result = await browserAPI.storage.sync.get(['urlPatterns']);
    const urlPatterns = (result.urlPatterns || []).map((rule) => ({
      ...rule,
      cssSelector: rule.urlPattern === '*' ? '' : (rule.cssSelector || '')
    }));

    const matchedRule = matchRule(currentUrl, urlPatterns);
    const prompt = matchedRule.prompt || DEFAULT_PROMPT;
    const cssSelector = (matchedRule.cssSelector || '').trim();

    let queryText = `${currentUrl}\n${prompt}`;
    if (cssSelector && typeof tabId === 'number') {
      const extractedText = normalizeContentText(await extractTextBySelector(tabId, cssSelector));
      queryText = `${prompt}\n${extractedText}`;
    }

    const geminiUrl = `https://gemini.google.com/app?q=${encodeURIComponent(queryText)}`;
    await browserAPI.tabs.create({ url: geminiUrl });
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
}

browserAPI.runtime.onInstalled.addListener(() => {
  browserAPI.storage.sync.get(['urlPatterns'], ({ urlPatterns = [] }) => {
    if (!urlPatterns.some(p => p.urlPattern === '*')) {
      urlPatterns.push({
        id: Date.now().toString(36),
        urlPattern: '*',
        cssSelector: '',
        prompt: DEFAULT_PROMPT
      });
      browserAPI.storage.sync.set({ urlPatterns });
    }
  });
});

browserAPI.action.onClicked.addListener(async (tab) => {
  await openGeminiWithCurrentTab();
});

browserAPI.commands.onCommand.addListener(async (command) => {
  if (command === 'open-gemini') {
    await openGeminiWithCurrentTab();
  }
});

export { };
