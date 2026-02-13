import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable as useSortableRules } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RuleItem } from './RuleItem.jsx';

export function RuleGroup({
  group,
  isDefault,
  onUpdateGroup,
  onUpdateRule,
  onDeleteGroup,
  onAddRule,
  onDeleteRule,
  onReorderRules
}) {
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

  const rules = isDefault
    ? [{ id: 'default', urlPattern: '*', cssSelector: group.cssSelector || '' }]
    : group.rules;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`prompt-group ${isDefault ? 'default-group' : ''}`}
      data-group-id={group.id}
    >
      {!isDefault && (
        <div className="group-header">
          <div className="group-drag-handle" {...attributes} {...listeners}>
            ⋮⋮
          </div>
          <span className="group-label">
            规则组
          </span>
          <button
            className="delete-group-btn"
            onClick={() => onDeleteGroup(group.id)}
            title="删除规则组"
          >
            ×
          </button>
        </div>
      )}
      <div className="group-content">
        <div className="rules-list">
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
                placeholder="CSS选择器（可选）"
                onChange={(e) => handleSelectorChange(e.target.value)}
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
            className="prompt-input"
            placeholder="请输入prompt..."
            value={group.prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
