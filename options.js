import {
  generateRuleId,
  isDefaultRule,
  loadUrlPatterns,
  saveUrlPatterns
} from './rule-config.js';
import { DEFAULT_PROMPT } from './constants.js';

const rulesContainer = document.getElementById('rulesContainer');
const addBtn = document.getElementById('addBtn');
const statusEl = document.getElementById('status');

const state = {
  urlPatterns: [],
  saveTimeout: null
};

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.add('show');
  setTimeout(() => statusEl.classList.remove('show'), 1500);
}

function getDefaultRule() {
  return state.urlPatterns.find(isDefaultRule);
}

function getCustomRules() {
  return state.urlPatterns.filter((rule) => !isDefaultRule(rule));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function scheduleSave() {
  clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(async () => {
    await saveUrlPatterns(state.urlPatterns);
    showStatus('已自动保存');
  }, 300);
}

function updateRuleField(ruleId, field, value) {
  if (!ruleId || !field) {
    return;
  }

  const target = state.urlPatterns.find((rule) => rule.id === ruleId);
  if (!target) {
    return;
  }

  target[field] = value;
  scheduleSave();
}

function renderRules() {
  const customRules = getCustomRules();
  const defaultRule = getDefaultRule();

  if (customRules.length === 0 && !defaultRule) {
    rulesContainer.innerHTML = '<div class="empty-state">暂无规则，点击下方添加</div>';
    return;
  }

  const customRuleHtml = customRules.map((rule) => `
    <div class="rule-item" draggable="true" data-id="${rule.id}">
      <div class="drag-handle">⋮⋮</div>
      <div class="urls-area">
        <textarea class="urls-input" placeholder="github.com&#10;*.youtube.com" data-field="urlPattern">${escapeHtml(rule.urlPattern)}</textarea>
        <input type="text" class="selector-input" value="${escapeHtml(rule.cssSelector || '')}" placeholder="可选 CSS selector，例如 article h1" data-field="cssSelector">
      </div>
      <span class="arrow">→</span>
      <input type="text" class="prompt-input" value="${escapeHtml(rule.prompt)}" placeholder="Prompt" data-field="prompt">
      <button class="delete-btn" title="删除规则">×</button>
    </div>
  `).join('');

  const defaultRuleHtml = defaultRule ? `
    <div class="rule-item default-rule">
      <div class="drag-handle" style="visibility:hidden">⋮⋮</div>
      <div class="urls-area">
        <textarea class="urls-input default-urls" readonly placeholder="默认规则，* 匹配所有网址">${escapeHtml(defaultRule.urlPattern)}</textarea>
      </div>
      <span class="arrow">→</span>
      <input type="text" class="prompt-input" value="${escapeHtml(defaultRule.prompt)}" placeholder="默认 Prompt" data-field="prompt" data-default="true">
      <button class="delete-btn" style="visibility:hidden">×</button>
    </div>
  ` : '';

  rulesContainer.innerHTML = `${customRuleHtml}${defaultRuleHtml}`;
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.rule-item:not(.dragging):not(.default-rule)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child };
    }
    return closest;
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function reorderRulesByDom() {
  const defaultRule = getDefaultRule();
  const customRules = [];

  rulesContainer.querySelectorAll('.rule-item[data-id]').forEach((item) => {
    const id = item.dataset.id;
    const matched = state.urlPatterns.find((rule) => rule.id === id);
    if (matched && !isDefaultRule(matched)) {
      customRules.push(matched);
    }
  });

  state.urlPatterns = defaultRule ? [...customRules, defaultRule] : customRules;
}

function deleteRule(ruleId) {
  const target = state.urlPatterns.find((rule) => rule.id === ruleId);
  if (!target) {
    return;
  }

  if (isDefaultRule(target)) {
    showStatus('默认规则不能删除');
    return;
  }

  if (!confirm('确定删除这条规则？')) {
    return;
  }

  state.urlPatterns = state.urlPatterns.filter((rule) => rule.id !== ruleId);
  renderRules();
  scheduleSave();
  showStatus('已删除');
}

function addRule() {
  const defaultRule = getDefaultRule();
  const customRules = getCustomRules();

  customRules.push({
    id: generateRuleId(),
    urlPattern: '',
    cssSelector: '',
    prompt: DEFAULT_PROMPT
  });

  state.urlPatterns = defaultRule ? [...customRules, defaultRule] : customRules;
  renderRules();
  scheduleSave();

  setTimeout(() => {
    const inputs = rulesContainer.querySelectorAll('.urls-input:not([readonly])');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      lastInput.focus();
    }
  }, 50);
}

function bindEvents() {
  addBtn.addEventListener('click', addRule);

  rulesContainer.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    const field = target.dataset.field;
    const ruleItem = target.closest('.rule-item');
    if (!ruleItem) {
      return;
    }

    if (target.dataset.default === 'true') {
      const defaultRule = getDefaultRule();
      if (defaultRule) {
        defaultRule.prompt = target.value;
        scheduleSave();
      }
      return;
    }

    updateRuleField(ruleItem.dataset.id, field, target.value);
  });

  rulesContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains('delete-btn')) {
      return;
    }

    const ruleItem = target.closest('.rule-item');
    if (!ruleItem?.dataset.id) {
      return;
    }

    deleteRule(ruleItem.dataset.id);
  });

  rulesContainer.addEventListener('dragstart', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('.rule-item[draggable="true"]')) {
      return;
    }

    target.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  });

  rulesContainer.addEventListener('dragend', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('.rule-item[draggable="true"]')) {
      return;
    }

    target.classList.remove('dragging');
  });

  rulesContainer.addEventListener('dragover', (event) => {
    event.preventDefault();

    const dragging = rulesContainer.querySelector('.rule-item.dragging');
    if (!dragging) {
      return;
    }

    const afterElement = getDragAfterElement(rulesContainer, event.clientY);
    if (!afterElement) {
      const defaultRuleItem = rulesContainer.querySelector('.rule-item.default-rule');
      if (defaultRuleItem) {
        rulesContainer.insertBefore(dragging, defaultRuleItem);
      } else {
        rulesContainer.appendChild(dragging);
      }
      return;
    }

    rulesContainer.insertBefore(dragging, afterElement);
  });

  rulesContainer.addEventListener('drop', () => {
    reorderRulesByDom();
    renderRules();
    scheduleSave();
    showStatus('顺序已更新');
  });
}

async function loadSettings() {
  state.urlPatterns = await loadUrlPatterns();
  renderRules();
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  await loadSettings();
});
