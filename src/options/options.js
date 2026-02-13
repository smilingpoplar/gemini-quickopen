import {
  generateId,
  isDefaultGroup,
  loadConfig,
  saveConfig,
  getDefaultGroup,
  getCustomGroups
} from './prompt-config.js';
import { DEFAULT_PROMPT } from '../constants.js';

const rulesContainer = document.getElementById('rulesContainer');
const addBtn = document.getElementById('addBtn');
const statusEl = document.getElementById('status');

const state = {
  config: { promptGroups: [] },
  saveTimeout: null
};

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.add('show');
  setTimeout(() => statusEl.classList.remove('show'), 1500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scheduleSave() {
  clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(async () => {
    await saveConfig(state.config);
    showStatus('已自动保存');
  }, 300);
}

function renderRuleItem(rule, groupId, isDefault) {
  const defaultClass = isDefault ? 'default-rule-item' : '';
  return `
    <div class="rule-item ${defaultClass}" draggable="true" data-rule-id="${rule.id}" data-group-id="${groupId}">
      <div class="drag-handle" draggable="true">⋮⋮</div>
      <input type="text" class="url-input ${defaultClass}" readonly value="${escapeHtml(rule.urlPattern)}" placeholder="${isDefault ? '默认规则，匹配所有网址' : '网址规则，如 github.com/*'}" data-field="urlPattern">
      <input type="text" class="selector-input ${defaultClass}" readonly value="${escapeHtml(rule.cssSelector || '')}" placeholder="CSS选择器（可选）" data-field="cssSelector">
      <button class="delete-rule-btn" title="删除规则">×</button>
    </div>
  `;
}

function renderGroup(group) {
  const isDefault = isDefaultGroup(group);
  const defaultClass = isDefault ? 'default-group' : '';

  const rulesHtml = isDefault
    ? renderRuleItem({ id: 'default', urlPattern: '*', cssSelector: group.cssSelector || '' }, group.id, true)
    : group.rules.map(rule => renderRuleItem(rule, group.id, false)).join('');

  return `
    <div class="prompt-group ${defaultClass}" draggable="true" data-group-id="${group.id}">
      <div class="group-header">
        <div class="group-drag-handle" draggable="true">⋮⋮</div>
        <span class="group-label">${isDefault ? '默认规则组' : '规则组'}</span>
        <button class="delete-group-btn" title="删除规则">×</button>
      </div>
      <div class="group-content">
        <div class="rules-list">
          ${rulesHtml}
          <button class="add-rule-btn">+ 添加规则</button>
        </div>
        <div class="prompt-section">
          <textarea class="prompt-input" placeholder="输入 Prompt..." data-field="prompt">${escapeHtml(group.prompt)}</textarea>
        </div>
      </div>
    </div>
  `;
}

function renderRules() {
  const customGroups = getCustomGroups(state.config);
  const defaultGroup = getDefaultGroup(state.config);

  if (customGroups.length === 0 && !defaultGroup) {
    rulesContainer.innerHTML = '<div class="empty-state">暂无规则，点击下方添加</div>';
    return;
  }

  const groupsHtml = [...customGroups, defaultGroup]
    .filter(Boolean)
    .map(renderGroup)
    .join('');

  rulesContainer.innerHTML = groupsHtml;
}

function findGroup(groupId) {
  return state.config.promptGroups.find(g => g.id === groupId);
}

function findRule(groupId, ruleId) {
  const group = findGroup(groupId);
  return group?.rules.find(r => r.id === ruleId);
}

function updateGroupField(groupId, field, value) {
  const group = findGroup(groupId);
  if (group) {
    group[field] = value;
    scheduleSave();
  }
}

function updateRuleField(groupId, ruleId, field, value) {
  const rule = findRule(groupId, ruleId);
  if (rule) {
    rule[field] = value;
    scheduleSave();
  }
}

function addGroup() {
  state.config.promptGroups.unshift({
    id: generateId(),
    prompt: DEFAULT_PROMPT,
    isDefault: false,
    rules: [
      { id: generateId(), urlPattern: '', cssSelector: '' }
    ]
  });
  renderRules();
  scheduleSave();

  setTimeout(() => {
    const firstUrlInput = rulesContainer.querySelector('.prompt-group:not(.default-group) .url-input');
    if (firstUrlInput) {
      firstUrlInput.focus();
    }
  }, 50);
}

function deleteGroup(groupId) {
  const group = findGroup(groupId);
  if (!group || isDefaultGroup(group)) {
    showStatus('默认规则不能删除');
    return;
  }

  if (!confirm('确定删除这个规则组？')) {
    return;
  }

  state.config.promptGroups = state.config.promptGroups.filter(g => g.id !== groupId);
  renderRules();
  scheduleSave();
  showStatus('已删除');
}

function addRuleToGroup(groupId) {
  const group = findGroup(groupId);
  if (!group || isDefaultGroup(group)) return;

  group.rules.push({
    id: generateId(),
    urlPattern: '',
    cssSelector: ''
  });
  renderRules();
  scheduleSave();

  setTimeout(() => {
    const groupEl = rulesContainer.querySelector(`[data-group-id="${groupId}"]`);
    if (groupEl) {
      const urlInputs = groupEl.querySelectorAll('.url-input');
      const lastInput = urlInputs[urlInputs.length - 1];
      if (lastInput) {
        lastInput.focus();
      }
    }
  }, 50);
}

function deleteRule(groupId, ruleId) {
  const group = findGroup(groupId);
  if (!group || isDefaultGroup(group)) return;

  group.rules = group.rules.filter(r => r.id !== ruleId);
  renderRules();
  scheduleSave();
  showStatus('已删除');
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.prompt-group:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderGroupsByDom() {
  const newOrder = [];
  rulesContainer.querySelectorAll('.prompt-group[data-group-id]').forEach((el) => {
    const groupId = el.dataset.groupId;
    const group = findGroup(groupId);
    if (group) {
      newOrder.push(group);
    }
  });
  state.config.promptGroups = newOrder;
}

function bindEvents() {
  addBtn.addEventListener('click', addGroup);

  rulesContainer.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    const field = target.dataset.field;
    const ruleItem = target.closest('.rule-item');
    const groupEl = target.closest('.prompt-group');

    if (!groupEl) return;

    const groupId = groupEl.dataset.groupId;
    const group = findGroup(groupId);

    if (target.classList.contains('prompt-input')) {
      updateGroupField(groupId, 'prompt', target.value);
      return;
    }

    if (ruleItem) {
      const ruleId = ruleItem.dataset.ruleId;
      if (group?.isDefault && field === 'cssSelector') {
        group.cssSelector = target.value;
        scheduleSave();
        return;
      }
      updateRuleField(groupId, ruleId, field, target.value);
    }
  });

  rulesContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('delete-group-btn')) {
      const groupEl = target.closest('.prompt-group');
      if (groupEl?.dataset.groupId) {
        deleteGroup(groupEl.dataset.groupId);
      }
      return;
    }

    if (target.classList.contains('delete-rule-btn')) {
      const ruleItem = target.closest('.rule-item');
      const groupEl = target.closest('.prompt-group');
      if (ruleItem?.dataset.ruleId && groupEl?.dataset.groupId) {
        deleteRule(groupEl.dataset.groupId, ruleItem.dataset.ruleId);
      }
      return;
    }

    if (target.classList.contains('add-rule-btn')) {
      const groupEl = target.closest('.prompt-group');
      if (groupEl?.dataset.groupId) {
        addRuleToGroup(groupEl.dataset.groupId);
      }
    }
  });

  let draggedGroup = null;
  let draggedRule = null;

  rulesContainer.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const ruleEl = target.closest('.rule-item[draggable="true"]');
    if (ruleEl) {
      if (ruleEl.classList.contains('default-rule-item')) return;
      draggedRule = ruleEl;
      ruleEl.classList.add('dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
      return;
    }

    const groupEl = target.closest('.prompt-group[draggable="true"]');
    if (!groupEl) return;

    if (groupEl.classList.contains('default-group')) return;

    const isGroupDrag = target.classList.contains('group-drag-handle');
    if (!isGroupDrag) return;

    draggedGroup = groupEl;
    groupEl.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  });

  rulesContainer.addEventListener('dragend', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const ruleEl = target.closest('.rule-item[draggable="true"]');
    if (ruleEl) {
      ruleEl.classList.remove('dragging');
      draggedRule = null;
      return;
    }

    const groupEl = target.closest('.prompt-group');
    if (groupEl) {
      groupEl.classList.remove('dragging');
    }
    draggedGroup = null;
  });

  rulesContainer.addEventListener('dragover', (event) => {
    event.preventDefault();

    if (draggedRule) {
      const rulesList = draggedRule.closest('.rules-list');
      if (!rulesList) return;

      const ruleItems = [...rulesList.querySelectorAll('.rule-item:not(.dragging)')];
      const afterElement = ruleItems.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = event.clientY - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;

      const addRuleBtn = rulesList.querySelector('.add-rule-btn');
      if (afterElement) {
        rulesList.insertBefore(draggedRule, afterElement);
      } else if (addRuleBtn) {
        rulesList.insertBefore(draggedRule, addRuleBtn);
      } else {
        rulesList.appendChild(draggedRule);
      }
      return;
    }

    if (!draggedGroup) return;

    const afterElement = getDragAfterElement(rulesContainer, event.clientY);
    if (afterElement) {
      rulesContainer.insertBefore(draggedGroup, afterElement);
    } else {
      rulesContainer.appendChild(draggedGroup);
    }
  });

  rulesContainer.addEventListener('drop', () => {
    if (draggedRule) {
      const groupEl = draggedRule.closest('.prompt-group');
      if (groupEl) {
        const groupId = groupEl.dataset.groupId;
        const group = findGroup(groupId);
        if (group) {
          const newOrder = [];
          groupEl.querySelectorAll('.rule-item[data-rule-id]').forEach((el) => {
            const ruleId = el.dataset.ruleId;
            const rule = group.rules.find(r => r.id === ruleId);
            if (rule) {
              newOrder.push(rule);
            }
          });
          group.rules = newOrder;
          scheduleSave();
          showStatus('顺序已更新');
        }
      }
      return;
    }

    if (draggedGroup) {
      reorderGroupsByDom();
      renderRules();
      scheduleSave();
      showStatus('顺序已更新');
    }
  });
}

async function loadSettings() {
  state.config = await loadConfig();
  renderRules();
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  await loadSettings();
});
