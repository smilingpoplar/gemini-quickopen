import { DEFAULT_PROMPT } from './url-pattern.js';

function generateRuleId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function isDefaultRule(rule) {
  return rule?.urlPattern === '*';
}

function normalizeRule(rule) {
  const normalizedRule = {
    ...rule,
    cssSelector: isDefaultRule(rule) ? '' : (rule?.cssSelector || ''),
    prompt: typeof rule?.prompt === 'string' ? rule.prompt : DEFAULT_PROMPT
  };

  if (!normalizedRule.id) {
    normalizedRule.id = generateRuleId();
  }

  return normalizedRule;
}

function ensureDefaultRule(urlPatterns = []) {
  const normalizedRules = (urlPatterns || []).map(normalizeRule);
  if (normalizedRules.some(isDefaultRule)) {
    return normalizedRules;
  }

  return [
    ...normalizedRules,
    {
      id: generateRuleId(),
      urlPattern: '*',
      cssSelector: '',
      prompt: DEFAULT_PROMPT
    }
  ];
}

async function loadUrlPatterns() {
  const result = await browser.storage.sync.get(['urlPatterns']);
  return ensureDefaultRule(result.urlPatterns || []);
}

async function saveUrlPatterns(urlPatterns) {
  await browser.storage.sync.set({ urlPatterns });
}

export {
  generateRuleId,
  isDefaultRule,
  ensureDefaultRule,
  loadUrlPatterns,
  saveUrlPatterns
};
