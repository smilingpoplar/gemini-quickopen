import yaml from 'js-yaml';
import { DEFAULT_PROMPT } from './constants';
import { generateId } from './config-core';
import type { RuleConfig, RuleGroup } from './types';

export function exportToYaml(config: RuleConfig): string {
  const customGroups = config.ruleGroups.filter((group) => !group.isDefault);

  const exportData = {
    ruleGroups: customGroups
      .map((group) => ({
        prompt: group.prompt,
        rules: group.rules
          .map((rule) => ({
            urlPattern: rule.urlPattern,
            cssSelector: rule.cssSelector || undefined,
          }))
          .filter((rule) => rule.urlPattern),
      }))
      .filter((group) => group.rules.length > 0 || group.prompt),
  };

  return yaml.dump(exportData, { indent: 2, lineWidth: -1 });
}

export function importFromYaml(yamlString: string): RuleGroup[] {
  const data = yaml.load(yamlString);

  if (!data || typeof data !== 'object' || !Array.isArray((data as RuleConfig).ruleGroups)) {
    throw new Error('无效的 YAML 格式');
  }

  return (data as RuleConfig).ruleGroups.map((group) => ({
    id: generateId(),
    prompt: group.prompt || DEFAULT_PROMPT,
    cssSelector: group.cssSelector || '',
    rules: (group.rules || []).map((rule) => ({
      id: generateId(),
      urlPattern: rule.urlPattern || '',
      cssSelector: rule.cssSelector || '',
    })),
  }));
}

export function downloadYaml(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}

export function selectYamlFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => resolve(String(loadEvent.target?.result ?? ''));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    };

    input.onerror = () => reject(new Error('无法打开文件选择器'));
    input.click();
  });
}
