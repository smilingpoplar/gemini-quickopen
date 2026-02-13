import { useState, useEffect, useCallback } from 'react';
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

export function useConfig() {
  const [config, setConfig] = useState({ ruleGroups: [] });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await browser.storage.sync.get(['ruleConfig']);
      const normalized = normalizeConfig(result.ruleConfig || { ruleGroups: [] });
      setConfig(normalized);
    } catch (error) {
      console.error('Failed to load config:', error);
      setConfig({ ruleGroups: [createDefaultGroup()] });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = useCallback(async (newConfig) => {
    try {
      await browser.storage.sync.set({ ruleConfig: newConfig });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }, []);

  const showStatus = useCallback((message) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 1500);
  }, []);

  const updateGroup = useCallback((groupId, field, value) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ruleGroups: prev.ruleGroups.map(g =>
          g.id === groupId ? { ...g, [field]: value } : g
        )
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  const updateRule = useCallback((groupId, ruleId, field, value) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ruleGroups: prev.ruleGroups.map(g => {
          if (g.id !== groupId) return g;
          if (g.isDefault && field === 'cssSelector') {
            return { ...g, cssSelector: value };
          }
          return {
            ...g,
            rules: g.rules.map(r =>
              r.id === ruleId ? { ...r, [field]: value } : r
            )
          };
        })
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  const addGroup = useCallback(() => {
    const newGroup = {
      id: generateId(),
      prompt: DEFAULT_PROMPT,
      isDefault: false,
      rules: [{ id: generateId(), urlPattern: '', cssSelector: '' }]
    };
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ruleGroups: [newGroup, ...prev.ruleGroups]
      };
      saveConfig(newConfig);
      showStatus('已添加规则组');
      return newConfig;
    });
    return newGroup.id;
  }, [saveConfig, showStatus]);

  const deleteGroup = useCallback((groupId) => {
    setConfig(prev => {
      const group = prev.ruleGroups.find(g => g.id === groupId);
      if (isDefaultGroup(group)) {
        showStatus('默认规则不能删除');
        return prev;
      }
      const newConfig = {
        ...prev,
        ruleGroups: prev.ruleGroups.filter(g => g.id !== groupId)
      };
      saveConfig(newConfig);
      showStatus('已删除');
      return newConfig;
    });
  }, [saveConfig, showStatus]);

  const addRule = useCallback((groupId) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ruleGroups: prev.ruleGroups.map(g => {
          if (g.id !== groupId || g.isDefault) return g;
          return {
            ...g,
            rules: [...g.rules, { id: generateId(), urlPattern: '', cssSelector: '' }]
          };
        })
      };
      saveConfig(newConfig);
      return newConfig;
    });
  }, [saveConfig]);

  const deleteRule = useCallback((groupId, ruleId) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ruleGroups: prev.ruleGroups.map(g => {
          if (g.id !== groupId || g.isDefault) return g;
          return {
            ...g,
            rules: g.rules.filter(r => r.id !== ruleId)
          };
        })
      };
      saveConfig(newConfig);
      showStatus('已删除');
      return newConfig;
    });
  }, [saveConfig, showStatus]);

  const reorderGroups = useCallback((newOrder) => {
    setConfig(prev => {
      const newConfig = { ...prev, ruleGroups: newOrder };
      saveConfig(newConfig);
      showStatus('顺序已更新');
      return newConfig;
    });
  }, [saveConfig, showStatus]);

  const reorderRules = useCallback((groupId, newOrder) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        ruleGroups: prev.ruleGroups.map(g =>
          g.id === groupId ? { ...g, rules: newOrder } : g
        )
      };
      saveConfig(newConfig);
      showStatus('顺序已更新');
      return newConfig;
    });
  }, [saveConfig, showStatus]);

  return {
    config,
    loading,
    status,
    isDefaultGroup,
    updateGroup,
    updateRule,
    addGroup,
    deleteGroup,
    addRule,
    deleteRule,
    reorderGroups,
    reorderRules
  };
}
