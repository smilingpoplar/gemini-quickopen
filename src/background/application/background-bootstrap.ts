import { warmInstance } from '../warm-instance';
import { openGeminiWithCurrentTab, openGeminiWithTab, setupExtensionLifecycle, handleGeminiNavigation } from './gemini-flow';

export async function bootstrapBackgroundApp(): Promise<void> {
  setupExtensionLifecycle();

  // Chrome MV3 uses `action`, while Firefox MV2 uses `browserAction`.
  const actionApi = browser.action ?? browser.browserAction;

  actionApi?.onClicked.addListener(async (tab) => {
    await openGeminiWithTab(tab);
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'open-gemini') {
      await openGeminiWithCurrentTab();
    }
  });

  browser.webNavigation.onCommitted.addListener(handleGeminiNavigation);

  await warmInstance.fill();
}
