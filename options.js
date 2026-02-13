const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_PROMPT = "请总结";
let urlPatterns = [];

const rulesContainer = document.getElementById('rulesContainer');
const addBtn = document.getElementById('addBtn');
const statusEl = document.getElementById('status');

let saveTimeout = null;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.add('show');
  setTimeout(() => statusEl.classList.remove('show'), 1500);
}

function isDefaultRule(pattern) {
  return pattern.urlPattern === '*';
}

function autoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    browserAPI.storage.sync.set({ urlPatterns }, () => {
      showStatus('已自动保存');
    });
  }, 300);
}

function loadSettings() {
  browserAPI.storage.sync.get(['urlPatterns'], (result) => {
    urlPatterns = (result.urlPatterns || []).map((pattern) => ({
      ...pattern,
      cssSelector: isDefaultRule(pattern) ? '' : (pattern.cssSelector || '')
    }));

    // 确保有默认规则
    if (!urlPatterns.some(p => p.urlPattern === '*')) {
      urlPatterns.push({
        id: generateId(),
        urlPattern: '*',
        cssSelector: '',
        prompt: DEFAULT_PROMPT
      });
    }

    renderRules();
  });
}

function renderRules() {
  const rules = urlPatterns.filter(p => !isDefaultRule(p));
  const defaultRule = urlPatterns.find(p => isDefaultRule(p));

  if (rules.length === 0 && !defaultRule) {
    rulesContainer.innerHTML = '<div class="empty-state">暂无规则，点击下方添加</div>';
    return;
  }

  let html = '';

  // 非默认规则
  rules.forEach((pattern, index) => {
    html += `
      <div class="rule-item" draggable="true" data-id="${pattern.id}">
        <div class="drag-handle">⋮⋮</div>
        <div class="urls-area">
          <textarea class="urls-input" placeholder="github.com&#10;*.youtube.com" data-field="urlPattern">${escapeHtml(pattern.urlPattern)}</textarea>
          <input type="text" class="selector-input" value="${escapeHtml(pattern.cssSelector || '')}" placeholder="可选 CSS selector，例如 article h1" data-field="cssSelector">
        </div>
        <span class="arrow">→</span>
        <input type="text" class="prompt-input" value="${escapeHtml(pattern.prompt)}" placeholder="Prompt" data-field="prompt">
        <button class="delete-btn" title="删除规则">×</button>
      </div>
    `;
  });

  // 默认规则（固定最后，不可拖拽）
  if (defaultRule) {
    html += `
      <div class="rule-item default-rule">
        <div class="drag-handle" style="visibility:hidden">⋮⋮</div>
        <div class="urls-area">
          <textarea class="urls-input default-urls" readonly placeholder="默认规则，* 匹配所有网址">${escapeHtml(defaultRule.urlPattern)}</textarea>
        </div>
        <span class="arrow">→</span>
        <input type="text" class="prompt-input" value="${escapeHtml(defaultRule.prompt)}" placeholder="默认 Prompt" data-field="prompt" data-default="true">
        <button class="delete-btn" style="visibility:hidden">×</button>
      </div>
    `;
  }

  rulesContainer.innerHTML = html;

  bindRuleEvents();
  initDragAndDrop();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function bindRuleEvents() {
  // 输入框变化自动保存
  rulesContainer.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', (e) => {
      const ruleItem = e.target.closest('.rule-item');
      const id = ruleItem.dataset.id;
      const field = e.target.dataset.field;
      const isDefault = e.target.dataset.default === 'true';

      if (isDefault) {
        const defaultPattern = urlPatterns.find(p => isDefaultRule(p));
        if (defaultPattern) defaultPattern.prompt = e.target.value;
      } else if (id && field) {
        const pattern = urlPatterns.find(p => p.id === id);
        if (pattern) pattern[field] = e.target.value;
      }

      autoSave();
    });
  });

  // 删除按钮
  rulesContainer.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleItem = e.target.closest('.rule-item');
      const id = ruleItem.dataset.id;

      if (id) {
        const pattern = urlPatterns.find(p => p.id === id);
        if (isDefaultRule(pattern)) {
          showStatus('默认规则不能删除');
          return;
        }

        if (confirm('确定删除这条规则？')) {
          urlPatterns = urlPatterns.filter(p => p.id !== id);
          renderRules();
          autoSave();
          showStatus('已删除');
        }
      }
    });
  });
}

function initDragAndDrop() {
  const items = rulesContainer.querySelectorAll('.rule-item[draggable="true"]');

  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
    });
  });

  rulesContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const container = rulesContainer;
    const dragging = container.querySelector('.dragging');
    if (!dragging) return;

    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement == null) {
      container.appendChild(dragging);
    } else {
      container.insertBefore(dragging, afterElement);
    }
  });

  rulesContainer.addEventListener('drop', () => {
    const newOrder = [];
    const defaultRule = urlPatterns.find(p => isDefaultRule(p));

    rulesContainer.querySelectorAll('.rule-item').forEach(item => {
      const id = item.dataset.id;
      if (id) {
        const pattern = urlPatterns.find(p => p.id === id);
        if (pattern && !isDefaultRule(pattern)) {
          newOrder.push(pattern);
        }
      }
    });

    // 保持默认规则在最后
    urlPatterns = [...newOrder];
    if (defaultRule) urlPatterns.push(defaultRule);

    renderRules();
    autoSave();
    showStatus('顺序已更新');
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.rule-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function addRule() {
  const defaultRule = urlPatterns.find(p => isDefaultRule(p));
  const rules = urlPatterns.filter(p => !isDefaultRule(p));

  rules.push({ id: generateId(), urlPattern: '', cssSelector: '', prompt: DEFAULT_PROMPT });

  urlPatterns = [...rules];
  if (defaultRule) urlPatterns.push(defaultRule);

  renderRules();
  autoSave();

  setTimeout(() => {
    const inputs = rulesContainer.querySelectorAll('.urls-input:not([readonly])');
    if (inputs.length > 0) {
      inputs[inputs.length - 1].focus();
    }
  }, 50);
}

addBtn.addEventListener('click', addRule);

document.addEventListener('DOMContentLoaded', loadSettings);

export {};
