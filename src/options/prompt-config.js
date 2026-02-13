import { DEFAULT_PROMPT } from '../constants.js';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isDefaultGroup(group) {
  return group?.isDefault === true;
}

function migrateFromLegacyFormat(urlPatterns) {
  if (!Array.isArray(urlPatterns) || urlPatterns.length === 0) {
    return null;
  }

  const groups = [];
  const promptMap = new Map();

  for (const rule of urlPatterns) {
    const prompt = rule.prompt || DEFAULT_PROMPT;
    const key = prompt;
    const isDefault = rule.urlPattern === '*';

    if (!promptMap.has(key)) {
      promptMap.set(key, {
        id: generateId(),
        prompt: prompt,
        isDefault: isDefault,
        cssSelector: isDefault ? (rule.cssSelector || '') : '',
        rules: []
      });
    }

    const group = promptMap.get(key);
    if (!isDefault) {
      group.rules.push({
        id: rule.id || generateId(),
        urlPattern: rule.urlPattern,
        cssSelector: rule.cssSelector || ''
      });
    }
  }

  let hasDefault = false;
  for (const group of promptMap.values()) {
    if (group.isDefault) {
      hasDefault = true;
    }
    groups.push(group);
  }

  if (!hasDefault) {
    const defaultRule = urlPatterns.find(r => r.urlPattern === '*');
    groups.push({
      id: generateId(),
      prompt: defaultRule?.prompt || DEFAULT_PROMPT,
      isDefault: true,
      cssSelector: defaultRule?.cssSelector || '',
      rules: []
    });
  }

  return { promptGroups: groups };
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
    const migrated = migrateFromLegacyFormat(config);
    if (migrated) return migrated;
  }

  if (config?.promptGroups) {
    const groups = config.promptGroups.map(g => ({
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

    return { promptGroups: groups };
  }

  return { promptGroups: [createDefaultGroup()] };
}

async function loadConfig() {
  const result = await browser.storage.sync.get(['urlPatterns', 'promptConfig']);
  
  if (result.promptConfig) {
    return normalizeConfig(result.promptConfig);
  }
  
  if (result.urlPatterns) {
    const config = migrateFromLegacyFormat(result.urlPatterns);
    if (config) return config;
  }
  
  return { promptGroups: [createDefaultGroup()] };
}

async function saveConfig(config) {
  await browser.storage.sync.set({ 
    promptConfig: config,
    urlPatterns: null
  });
}

function getDefaultGroup(config) {
  return config?.promptGroups?.find(isDefaultGroup);
}

function getCustomGroups(config) {
  return config?.promptGroups?.filter(g => !isDefaultGroup(g)) || [];
}

export {
  generateId,
  isDefaultGroup,
  createDefaultGroup,
  normalizeConfig,
  loadConfig,
  saveConfig,
  getDefaultGroup,
  getCustomGroups
};
