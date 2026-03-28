import { GEMINI_CONTENT_READY } from '../background/gemini-ready-tracker';

function waitForElement(selector: string, timeout = 10000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (typeof timeout === 'number' && timeout > 0) {
      timer = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`在 ${timeout}ms 内未找到元素: ${selector}`));
      }, timeout);
    }

    const observer = new MutationObserver(() => {
      const target = document.querySelector(selector);
      if (target) {
        if (timer) clearTimeout(timer);
        observer.disconnect();
        resolve(target);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function simulateInput(element: Element, value: string): void {
  (element as HTMLElement).textContent = value;
  element.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

function simulateEnter(element: Element): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      keyCode: 13,
      bubbles: true,
    }),
  );
}

async function runAutoSubmit(query: string): Promise<void> {
  if (!query) return;

  try {
    const editor = await waitForElement('div[contenteditable="true"]', 15000);

    (editor as HTMLElement).focus();
    await delay(100);
    simulateInput(editor, query);
    await delay(100);
    simulateEnter(editor);
  } catch (error) {
    console.error('自动发送失败:', error);
  }
}

export default function installGeminiMessageListener(): void {
  void browser.runtime.sendMessage({ type: GEMINI_CONTENT_READY }).catch(() => undefined);

  browser.runtime.onMessage.addListener((message: { type?: string; queryText?: string }) => {
    if (message.type === 'GEMINI_QUERY') {
      void runAutoSubmit(message.queryText || '');
    }

    return undefined;
  });
}
