const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_PROMPT = "请总结";

// 将 glob 模式转换为正则表达式
function globToRegex(pattern) {
  return pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // 转义正则特殊字符
    .replace(/\*/g, '.*');                  // * 转换为 .*
}

// 解析多行网址规则
function parsePatterns(text) {
  return text.split('\n').map(p => p.trim()).filter(Boolean);
}

// 根据 URL 匹配对应的 prompt
function matchPrompt(currentUrl, urlPatterns) {
  const specificPatterns = urlPatterns.filter(p => p.urlPattern !== '*');

  for (const pattern of specificPatterns) {
    const patternList = parsePatterns(pattern.urlPattern);
    for (const p of patternList) {
      const regex = new RegExp(globToRegex(p), 'i');
      if (regex.test(currentUrl)) return pattern.prompt;
    }
  }

  const defaultPattern = urlPatterns.find(p => p.urlPattern === '*');
  return defaultPattern?.prompt ?? DEFAULT_PROMPT;
}

// 打开 Gemini 的核心逻辑
async function openGeminiWithCurrentTab() {
  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    // 如果 URL 不是 http/https 开头，不执行任何操作
    if (!currentUrl || !currentUrl.startsWith('http')) {
      return;
    }

    const result = await browserAPI.storage.sync.get(['urlPatterns']);
    const urlPatterns = result.urlPatterns || [];

    const prompt = matchPrompt(currentUrl, urlPatterns);
    const geminiUrl = `https://gemini.google.com/app?q=${encodeURIComponent(currentUrl + '\n' + prompt)}`;
    await browserAPI.tabs.create({ url: geminiUrl });
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
}

browserAPI.runtime.onInstalled.addListener(() => {
  browserAPI.storage.sync.get(['urlPatterns'], ({ urlPatterns = [] }) => {
    if (!urlPatterns.some(p => p.urlPattern === '*')) {
      urlPatterns.push({ id: Date.now().toString(36), urlPattern: '*', prompt: DEFAULT_PROMPT });
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

export {};
