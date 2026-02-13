import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useConfig } from './useConfig.js';
import { RuleGroup } from './components/RuleGroup.jsx';
import { RuleItem } from './components/RuleItem.jsx';

export function App() {
  const {
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
  } = useConfig();

  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const customGroups = config.ruleGroups.filter(g => !isDefaultGroup(g));
  const defaultGroup = config.ruleGroups.find(g => isDefaultGroup(g));
  const allGroups = [...customGroups, defaultGroup].filter(Boolean);

  const handleDragStart = (event) => {
    const { active } = event;
    const activeGroup = config.ruleGroups.find(g => g.id === active.id);
    if (activeGroup) {
      setActiveId(active.id);
      setActiveType('group');
      return;
    }
      for (const group of config.ruleGroups) {
      const rule = group.rules.find(r => r.id === active.id);
      if (rule) {
        setActiveId(active.id);
        setActiveType('rule');
        setActiveGroupId(group.id);
        return;
      }
    }
  };

  const [activeGroupId, setActiveGroupId] = useState(null);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setActiveType(null);
      setActiveGroupId(null);
      return;
    }

    if (activeType === 'group') {
      const oldIndex = customGroups.findIndex(g => g.id === active.id);
      const newIndex = customGroups.findIndex(g => g.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = [...customGroups];
        const [removed] = newOrder.splice(oldIndex, 1);
        newOrder.splice(newIndex, 0, removed);
        reorderGroups([...newOrder, defaultGroup].filter(Boolean));
      }
    } else if (activeType === 'rule' && activeGroupId) {
      const group = config.ruleGroups.find(g => g.id === activeGroupId);
      if (group) {
        const oldIndex = group.rules.findIndex(r => r.id === active.id);
        const newIndex = group.rules.findIndex(r => r.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const newOrder = [...group.rules];
          const [removed] = newOrder.splice(oldIndex, 1);
          newOrder.splice(newIndex, 0, removed);
          reorderRules(activeGroupId, newOrder);
        }
      }
    }

    setActiveId(null);
    setActiveType(null);
    setActiveGroupId(null);
  };

  const handleAddGroup = () => {
    const newGroupId = addGroup();
    setTimeout(() => {
      const input = document.querySelector(`[data-group-id="${newGroupId}"] .url-input`);
      if (input) input.focus();
    }, 50);
  };

  const getActiveGroup = () => {
    if (activeType === 'group') {
      return config.ruleGroups.find(g => g.id === activeId);
    }
    return null;
  };

  const getActiveRule = () => {
    if (activeType === 'rule') {
    for (const group of config.ruleGroups) {
        const rule = group.rules.find(r => r.id === activeId);
        if (rule) return { rule, groupId: group.id };
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>⚙️ 插件设置</h1>
      <p className="subtitle">配置不同网址的prompt</p>
      <p className="hint">提示：每个规则组包含一个prompt和多个网址规则（每个规则可选CSS选择器）；按规则组顺序匹配</p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="rules-container" id="rulesContainer">
          {customGroups.length === 0 && !defaultGroup ? (
            <div className="empty-state">暂无规则，点击下方添加</div>
          ) : (
            <SortableContext
              items={customGroups.map(g => g.id)}
              strategy={verticalListSortingStrategy}
            >
              {customGroups.map(group => (
                <RuleGroup
                  key={group.id}
                  group={group}
                  isDefault={false}
                  onUpdateGroup={updateGroup}
                  onUpdateRule={updateRule}
                  onDeleteGroup={deleteGroup}
                  onAddRule={addRule}
                  onDeleteRule={deleteRule}
                  onReorderRules={reorderRules}
                />
              ))}
            </SortableContext>
          )}
          {defaultGroup && (
            <RuleGroup
              key={defaultGroup.id}
              group={defaultGroup}
              isDefault={true}
              onUpdateGroup={updateGroup}
              onUpdateRule={updateRule}
              onDeleteGroup={deleteGroup}
              onAddRule={addRule}
              onDeleteRule={deleteRule}
              onReorderRules={reorderRules}
            />
          )}
        </div>
        <DragOverlay>
          {activeId && activeType === 'group' && getActiveGroup() && (
            <div className="prompt-group dragging">
              <div className="group-header">
                <div className="group-drag-handle">⋮⋮</div>
                <span className="group-label">规则组</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <button className="add-btn" id="addBtn" onClick={handleAddGroup}>
        + 添加规则组
      </button>

      <div className={`status ${status ? 'show' : ''}`} id="status">
        {status}
      </div>
    </div>
  );
}
