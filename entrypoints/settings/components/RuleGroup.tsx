import { useCallback, useLayoutEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RuleItem } from './RuleItem';
import type { Rule, RuleGroup as RuleGroupType } from '../../../src/shared/types';

export function RuleGroup({
  group,
  isDefault,
  onUpdateGroup,
  onUpdateRule,
  onDeleteGroup,
  onAddRule,
  onDeleteRule
}: {
  group: RuleGroupType;
  isDefault: boolean;
  onUpdateGroup: (groupId: string, field: keyof RuleGroupType, value: string) => void;
  onUpdateRule: (groupId: string, ruleId: string, field: keyof Rule, value: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddRule: (groupId: string) => void;
  onDeleteRule: (groupId: string, ruleId: string) => void;
}) {
  const rules = isDefault
    ? [{ id: 'default', urlPattern: '*', cssSelector: group.cssSelector || '' }]
    : group.rules;

  const rulesListRef = useRef<HTMLDivElement | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);

  const syncPromptHeight = useCallback(() => {
    const textarea = promptInputRef.current;
    if (!textarea) return;

    if (window.matchMedia('(max-width: 900px)').matches) {
      textarea.style.height = 'auto';
      return;
    }

    const leftHeight = rulesListRef.current?.scrollHeight ?? 0;
    textarea.style.height = 'auto';
    const contentHeight = textarea.scrollHeight;
    const nextHeight = isDefault
      ? leftHeight || contentHeight
      : Math.max(leftHeight, contentHeight);

    textarea.style.height = `${nextHeight}px`;
  }, [isDefault]);

  useLayoutEffect(() => {
    syncPromptHeight();

    const list = rulesListRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      syncPromptHeight();
    });

    observer.observe(list);

    return () => {
      observer.disconnect();
    };
  }, [syncPromptHeight]);

  useLayoutEffect(() => {
    syncPromptHeight();
  }, [group.prompt, rules.length, syncPromptHeight]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: group.id,
    disabled: isDefault
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handlePromptChange = (value) => {
    onUpdateGroup(group.id, 'prompt', value);
  };

  const handleSelectorChange = (value) => {
    onUpdateGroup(group.id, 'cssSelector', value);
  };

  const handleDeleteGroup = () => {
    if (!window.confirm('确定删除这个规则组吗？此操作不可撤销。')) return;
    onDeleteGroup(group.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`prompt-group ${isDefault ? 'default-group' : ''}`}
      data-group-id={group.id}
    >
      {!isDefault && (
        <div className="group-side-actions">
          <div className="group-drag-handle group-side-drag-handle" {...attributes} {...listeners}>
            ⋮⋮
          </div>
          <button
            className="delete-group-btn group-delete-btn"
            onClick={handleDeleteGroup}
            title="删除规则组"
          >
            ×
          </button>
        </div>
      )}
      <div className="group-main">
        <div className="group-content">
          <div className="rules-list" ref={rulesListRef}>
            {isDefault ? (
              <div className="rule-item default-rule-item">
                <div className="drag-handle">⋮⋮</div>
                <input
                  type="text"
                  className="url-input default-url"
                  readOnly
                  value="*"
                  placeholder="默认规则，匹配所有网址"
                />
                <input
                  type="text"
                  className="selector-input default-selector"
                  value={group.cssSelector || ''}
                  readOnly
                  placeholder="CSS选择器（默认组不设置）"
                />
              </div>
            ) : (
              <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                {rules.map(rule => (
                  <RuleItem
                    key={rule.id}
                    rule={rule}
                    groupId={group.id}
                    isDefault={false}
                    onUpdate={onUpdateRule}
                    onDelete={onDeleteRule}
                  />
                ))}
              </SortableContext>
            )}
            {!isDefault && (
              <button className="add-rule-btn" onClick={() => onAddRule(group.id)}>
                + 添加规则
              </button>
            )}
          </div>
          <div className="prompt-section">
            <textarea
              ref={promptInputRef}
              className="prompt-input"
              placeholder="请输入prompt..."
              value={group.prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
