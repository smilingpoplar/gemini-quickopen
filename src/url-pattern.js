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

function matchRule(currentUrl, urlPatterns) {
  const specificPatterns = urlPatterns.filter(p => p.urlPattern !== '*');

  for (const rule of specificPatterns) {
    const patternList = parsePatterns(rule.urlPattern);
    for (const p of patternList) {
      const urlPatternRegex = urlMatchPatternToRegex(p);
      if (urlPatternRegex && urlPatternRegex.test(currentUrl)) return rule;
    }
  }

  const defaultRule = urlPatterns.find(p => p.urlPattern === '*');
  if (!defaultRule) return { prompt: DEFAULT_PROMPT, cssSelector: '' };
  return { ...defaultRule, cssSelector: '' };
}

export {
  normalizeUrlPatternInput,
  parsePatterns,
  urlMatchPatternToRegex,
  matchRule
};
