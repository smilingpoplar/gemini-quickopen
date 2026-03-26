export function normalizeContentText(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export async function extractTextBySelector(tabId: number, selector: string): Promise<string> {
  if (!selector) return '';

  if (!browser.scripting?.executeScript) {
    console.warn('当前浏览器不支持 scripting.executeScript，跳过 selector 提取');
    return '';
  }

  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: ((rawSelector: string) => {
        try {
          const element = document.querySelector<HTMLElement>(rawSelector);
          if (!element) return '';
          const text = element.innerText || element.textContent || '';
          return text.replace(/\s+/g, ' ').trim();
        } catch {
          return '';
        }
      }) as any,
      args: [selector],
    });

    return String(results?.[0]?.result || '');
  } catch (error) {
    console.error('提取 selector 文本失败:', error);
    return '';
  }
}
