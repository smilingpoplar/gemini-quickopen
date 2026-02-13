import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function RuleItem({ rule, groupId, isDefault, onUpdate, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: rule.id,
    disabled: isDefault
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleChange = (field, value) => {
    onUpdate(groupId, rule.id, field, value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rule-item ${isDefault ? 'default-rule-item' : ''}`}
      data-rule-id={rule.id}
      data-group-id={groupId}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        ⋮⋮
      </div>
      <input
        type="text"
        className={`url-input ${isDefault ? 'default-url' : ''}`}
        value={rule.urlPattern}
        readOnly={isDefault}
        placeholder={isDefault ? '默认规则，匹配所有网址' : '网址规则，如 github.com/*'}
        onChange={(e) => handleChange('urlPattern', e.target.value)}
      />
      <input
        type="text"
        className={`selector-input ${isDefault ? 'default-selector' : ''}`}
        value={rule.cssSelector || ''}
        placeholder="CSS选择器（可选）"
        onChange={(e) => handleChange('cssSelector', e.target.value)}
      />
      {!isDefault && (
        <button className="delete-rule-btn" onClick={() => onDelete(groupId, rule.id)} title="删除规则">
          ×
        </button>
      )}
    </div>
  );
}
