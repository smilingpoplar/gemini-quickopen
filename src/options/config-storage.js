import { DEFAULT_PROMPT } from '../constants.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isDefaultGroup(group) {
  return group?.isDefault === true;
}

function createDefaultGroup() {
  return {
    id: generateId(),
    prompt: DEFAULT_PROMPT,
    isDefault: true,
    cssSelector: '',
    rules: []
  };
}

function normalizeConfig(config) {
  if (Array.isArray(config)) {
    return { ruleGroups: [createDefaultGroup()] };
  }

  if (config?.ruleGroups) {
    const groups = config.ruleGroups.map(g => ({
      ...g,
      cssSelector: g.cssSelector || '',
      rules: (g.rules || []).map(r => ({
        id: r.id || generateId(),
        urlPattern: r.urlPattern || '',
        cssSelector: r.cssSelector || ''
      }))
    }));

    if (!groups.some(isDefaultGroup)) {
      groups.push(createDefaultGroup());
    }

    return { ruleGroups: groups };
  }

  return { ruleGroups: [createDefaultGroup()] };
}

async function loadConfig() {
  try {
    const result = await browser.storage.sync.get(['ruleConfig']);
    return normalizeConfig(result.ruleConfig || { ruleGroups: [] });
  } catch (error) {
    console.error('Failed to load config:', error);
    return { ruleGroups: [createDefaultGroup()] };
  }
}

async function saveConfig(config) {
  try {
    await browser.storage.sync.set({ ruleConfig: config });
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export { loadConfig, saveConfig };
