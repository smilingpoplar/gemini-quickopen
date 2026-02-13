'use strict';

let hasStarted = false;

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

const getQuery = () => {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q');
  if (q) {
    url.searchParams.delete('q');
    window.history.replaceState({}, '', url.toString());
  }
  return q;
};

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

async function runAutoSubmit() {
  const query = getQuery();
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

export default function main() {
  if (hasStarted) return () => {};
  hasStarted = true;
  void runAutoSubmit();
  return () => {
    hasStarted = false;
  };
}
