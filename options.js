// 默认 prompt
const DEFAULT_PROMPT = "请总结 ";

// DOM 元素
const promptInput = document.getElementById('prompt');
const previewElement = document.getElementById('preview');
const saveButton = document.getElementById('save');
const statusElement = document.getElementById('status');

// 加载保存的设置
function loadSettings() {
  chrome.storage.sync.get(['prompt'], (result) => {
    const prompt = result.prompt || DEFAULT_PROMPT;
    promptInput.value = prompt;
    updatePreview(prompt);
  });
}

// 更新预览
function updatePreview(prompt) {
  const exampleUrl = "https://example.com";
  previewElement.textContent = prompt + exampleUrl;
}

// 显示状态消息
function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.className = 'status ' + (isError ? 'error' : 'success');
  
  setTimeout(() => {
    statusElement.className = 'status';
  }, 3000);
}

// 保存设置
function saveSettings() {
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    showStatus('Prompt 不能为空！', true);
    return;
  }
  
  chrome.storage.sync.set({ prompt: prompt }, () => {
    showStatus('设置已保存！');
  });
}

// 事件监听
promptInput.addEventListener('input', (e) => {
  updatePreview(e.target.value);
});

saveButton.addEventListener('click', saveSettings);

// 页面加载时读取设置
document.addEventListener('DOMContentLoaded', loadSettings);
