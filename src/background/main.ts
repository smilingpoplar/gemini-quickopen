import { installGeminiReadyTracker } from './gemini-ready-tracker';
import { saveConfig, loadConfig } from '../shared/config-storage';
import { warmService } from './warm/warm-service';
import { openGeminiForCurrentTab, openGeminiForTab } from './use-cases/open-gemini-flow';
import { reuseWarmTabForGeminiNavigation } from './use-cases/reuse-warm-tab-for-gemini-navigation';

async function warmOnInstall() {
  const config = await loadConfig();
  await saveConfig(config);
  await warmService.ensureReady();
}

async function warmOnStartup() {
  await warmService.ensureReady();
}

export async function bootstrapBackground(): Promise<void> {
  installGeminiReadyTracker();

  browser.runtime.onInstalled.addListener(() => {
    void warmOnInstall();
  });

  browser.runtime.onStartup.addListener(() => {
    void warmOnStartup();
  });

  // Chrome MV3 uses `action`, while Firefox MV2 uses `browserAction`.
  const actionApi = browser.action ?? browser.browserAction;

  actionApi?.onClicked.addListener(async (tab) => {
    await openGeminiForTab(tab);
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command === 'open-gemini') {
      await openGeminiForCurrentTab();
    }
  });

  browser.webNavigation.onCommitted.addListener(reuseWarmTabForGeminiNavigation);

  await warmService.ensureReady();
}
