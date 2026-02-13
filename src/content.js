'use strict';

const waitForElement = (selector, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const elem = document.querySelector(selector);
    if (elem) return resolve(elem);

    let timer;
    if (typeof timeout === 'number' && timeout > 0) {
      timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`在${timeout}ms内，未找到元素：${selector}`));
      }, timeout);
    }
    const observer = new MutationObserver(() => {
      const elem = document.querySelector(selector);
      if (elem) {
        if (timer) clearTimeout(timer);
        observer.disconnect();
        resolve(elem);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const simulateInput = (elem, value) => {
  elem.textContent = value;
  elem.dispatchEvent(new InputEvent('input', { bubbles: true }));
};

const simulateEnter = (elem) => {
  elem.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter',
    keyCode: 13,
    bubbles: true
  }));
};

async function runAutoSubmit(query) {
  if (!query) return;

  try {
    const editor = await waitForElement('div[contenteditable="true"]', 15000);

    editor.focus();
    await delay(100);
    simulateInput(editor, query);
    await delay(100);
    simulateEnter(editor);
  } catch (error) {
    console.error('自动发送失败:', error);
  }
}

function main() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GEMINI_QUERY') {
      void runAutoSubmit(message.queryText);
    }
  });
}

export default main;
