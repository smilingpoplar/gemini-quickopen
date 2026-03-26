import { DEFAULT_PROMPT } from './constants';
import type { RuleConfig, RuleGroup } from './types';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function isDefaultGroup(group?: RuleGroup): boolean {
  return group?.isDefault === true;
}

export function createDefaultGroup(): RuleGroup {
  return {
    id: generateId(),
    prompt: DEFAULT_PROMPT,
    isDefault: true,
    cssSelector: '',
    rules: [],
  };
}

export function normalizeConfig(config: unknown): RuleConfig {
  if (Array.isArray(config)) {
    return { ruleGroups: [createDefaultGroup()] };
  }

  if (typeof config === 'object' && config !== null && 'ruleGroups' in config) {
    const source = (config as RuleConfig).ruleGroups ?? [];
    const groups: RuleGroup[] = source.map((group) => ({
      ...group,
      cssSelector: group.cssSelector || '',
      rules: (group.rules || []).map((rule) => ({
        id: rule.id || generateId(),
        urlPattern: rule.urlPattern || '',
        cssSelector: rule.cssSelector || '',
      })),
    }));

    if (!groups.some(isDefaultGroup)) {
      groups.push(createDefaultGroup());
    }

    return { ruleGroups: groups };
  }

  return { ruleGroups: [createDefaultGroup()] };
}
