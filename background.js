// 默认的 prompt
const DEFAULT_PROMPT = "请总结 ";

// 初始化默认设置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['prompt'], (result) => {
    if (!result.prompt) {
      chrome.storage.sync.set({ prompt: DEFAULT_PROMPT });
    }
  });
});

// 点击插件图标时的处理
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // 获取当前标签页的 URL
    const currentUrl = tab.url;

    // 从存储中获取 prompt
    const result = await chrome.storage.sync.get(['prompt']);
    const prompt = result.prompt || DEFAULT_PROMPT;

    const geminiUrl = `https://gemini.google.com/app?q=${encodeURIComponent(prompt + currentUrl)}`;
    await chrome.tabs.create({ url: geminiUrl });
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
});
