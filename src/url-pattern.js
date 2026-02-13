import { isValidPattern, patternToRegex } from 'webext-patterns';
import { DEFAULT_PROMPT } from './constants.js';

function parsePatterns(text) {
  return text.split('\n').map(p => p.trim()).filter(Boolean);
}

function normalizeUrlPatternInput(pattern) {
  const raw = (pattern || '').trim();
  if (!raw || raw === '*') return raw;

  let normalized = raw;
  if (!normalized.includes('://')) {
    normalized = `*://${normalized}`;
  }

  if (!normalized.includes('/')) {
    normalized = `${normalized}/*`;
  } else {
    const schemeIndex = normalized.indexOf('://');
    const pathStart = normalized.indexOf('/', schemeIndex + 3);
    if (pathStart === -1) {
      normalized = `${normalized}/*`;
    } else {
      const pathPart = normalized.slice(pathStart);
      if (!pathPart.includes('*')) normalized = `${normalized}*`;
    }
  }

  return normalized;
}

function urlMatchPatternToRegex(pattern) {
  const normalized = normalizeUrlPatternInput(pattern);
  if (!normalized || normalized === '*') return /^.*$/i;
  if (!isValidPattern(normalized)) return null;
  return patternToRegex(normalized);
}

function matchUrlToRule(currentUrl, urlPattern) {
  const patternList = parsePatterns(urlPattern);
  for (const p of patternList) {
    const urlPatternRegex = urlMatchPatternToRegex(p);
    if (urlPatternRegex && urlPatternRegex.test(currentUrl)) return true;
  }
  return false;
}

function findMatchingGroup(currentUrl, config) {
  const groups = config?.ruleGroups || [];
  
  // 先找非默认组，按顺序匹配
  for (const group of groups) {
    if (group.isDefault) continue;
    
    for (const rule of (group.rules || [])) {
      if (matchUrlToRule(currentUrl, rule.urlPattern)) {
        return {
          prompt: group.prompt,
          cssSelector: rule.cssSelector || ''
        };
      }
    }
  }
  
  const defaultGroup = groups.find(g => g.isDefault);
  if (defaultGroup) {
    return {
      prompt: defaultGroup.prompt,
      cssSelector: defaultGroup.cssSelector || ''
    };
  }
  
  return { prompt: DEFAULT_PROMPT, cssSelector: '' };
}

export {
  normalizeUrlPatternInput,
  parsePatterns,
  urlMatchPatternToRegex,
  matchUrlToRule,
  findMatchingGroup
};
