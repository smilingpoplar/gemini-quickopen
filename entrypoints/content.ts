import { defineContentScript } from 'wxt/utils/define-content-script';
import installGeminiMessageListener from '../src/content/main';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  runAt: 'document_start',
  main() {
    installGeminiMessageListener();
  },
});
