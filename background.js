const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_PROMPT = "请总结 ";

// 打开 Gemini 的核心逻辑
async function openGeminiWithCurrentTab() {
  try {
    // 获取当前活动标签页
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tab.url;

    const result = await browserAPI.storage.sync.get(['prompt']);
    const prompt = result.prompt || DEFAULT_PROMPT;

    const geminiUrl = `https://gemini.google.com/app?q=${encodeURIComponent(prompt + currentUrl)}`;
    await browserAPI.tabs.create({ url: geminiUrl });
  } catch (error) {
    console.error('打开 Gemini 时出错:', error);
  }
}

browserAPI.runtime.onInstalled.addListener(() => {
  browserAPI.storage.sync.get(['prompt'], (result) => {
    if (!result.prompt) {
      browserAPI.storage.sync.set({ prompt: DEFAULT_PROMPT });
    }
  });
});

// 监听图标点击
browserAPI.action.onClicked.addListener(async (tab) => {
  await openGeminiWithCurrentTab();
});

// 监听快捷键
browserAPI.commands.onCommand.addListener(async (command) => {
  if (command === 'open-gemini') {
    await openGeminiWithCurrentTab();
  }
});
