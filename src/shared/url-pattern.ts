import { isValidPattern, patternToRegex } from 'webext-patterns';
import { DEFAULT_PROMPT } from './constants';
import type { MatchedGroup, RuleConfig } from './types';

export function parsePatterns(text: string): string[] {
  return text
    .split('\n')
    .map((pattern) => pattern.trim())
    .filter(Boolean);
}

export function normalizeUrlPatternInput(pattern: string): string {
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

export function urlMatchPatternToRegex(pattern: string): RegExp | null {
  const normalized = normalizeUrlPatternInput(pattern);
  if (!normalized || normalized === '*') return /^.*$/i;
  if (!isValidPattern(normalized)) return null;
  return patternToRegex(normalized);
}

export function matchUrlToRule(currentUrl: string, urlPattern: string): boolean {
  const patternList = parsePatterns(urlPattern);
  for (const pattern of patternList) {
    const regex = urlMatchPatternToRegex(pattern);
    if (regex && regex.test(currentUrl)) return true;
  }

  return false;
}

export function findMatchingGroup(currentUrl: string, config: RuleConfig): MatchedGroup {
  const groups = config?.ruleGroups || [];

  for (const group of groups) {
    if (group.isDefault) continue;

    for (const rule of group.rules || []) {
      if (matchUrlToRule(currentUrl, rule.urlPattern)) {
        return {
          prompt: group.prompt,
          cssSelector: rule.cssSelector || '',
        };
      }
    }
  }

  const defaultGroup = groups.find((group) => group.isDefault);
  if (defaultGroup) {
    return {
      prompt: defaultGroup.prompt,
      cssSelector: defaultGroup.cssSelector || '',
    };
  }

  return { prompt: DEFAULT_PROMPT, cssSelector: '' };
}
