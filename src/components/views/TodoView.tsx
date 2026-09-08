import React, { useState } from 'react';
import { TodoItem } from '../../types';
import { MEMBER_COLORS } from '../../constants/initialData';
import { formatHumanDate } from '../../utils/dateUtils';
import { Check, Circle, Trash2, Bell, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodoViewProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (item: TodoItem) => void;
  onSendWechat: (item: TodoItem) => void;
  onOpenCreate: (date?: string) => void;
}

export const TodoView: React.FC<TodoViewProps> = ({
  todos,
  onToggle,
  onDelete,
  onEdit,
  onSendWechat,
  onOpenCreate,
}) => {
  const [showDone, setShowDone] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);

  // 区分未完成与已完成
  const activeTodos = todos.filter((t) => !t.done);
  const doneTodos = todos.filter((t) => t.done);

  // 未完成按日期分类：逾期、今天、未来
  const overdueTodos = activeTodos.filter((t) => t.date < todayStr).sort((a, b) => a.date.localeCompare(b.date));
  const todayTodos = activeTodos.filter((t) => t.date === todayStr);
  const upcomingTodos = activeTodos.filter((t) => t.date > todayStr).sort((a, b) => a.date.localeCompare(b.date));

  const handleCheck = (e: React.MouseEvent, item: TodoItem) => {
    e.stopPropagation();
    if (!item.done) {
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
      });
    }
    onToggle(item.id);
  };

  const renderTodoRow = (item: TodoItem) => {
    const dateInfo = formatHumanDate(item.date);

    return (
      <div
        key={item.id}
        onClick={() => onEdit(item)}
        className={`group relative flex items-center justify-between gap-3 py-3 px-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
          item.done
            ? 'bg-zinc-50/70 border-zinc-200/50 opacity-60'
            : 'bg-white border-zinc-200/90 hover:border-zinc-400 shadow-2xs hover:shadow-xs'
        }`}
      >
        {/* 左侧勾选与标题 */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => handleCheck(e, item)}
            className="text-zinc-300 hover:text-zinc-700 transition shrink-0"
          >
            {item.done ? (
              <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <Circle className="w-5 h-5 group-hover:text-zinc-500" />
            )}
          </button>

          <span
            className={`text-sm font-medium truncate ${
              item.done ? 'line-through text-zinc-400' : 'text-zinc-800'
            }`}
          >
            {item.title}
          </span>
        </div>

        {/* 右侧：多位家人标签、日期、操作 */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 支持展示多个关联家人 */}
          <div className="flex items-center gap-1">
            {(item.members || ['我']).map((mem) => {
              const color = MEMBER_COLORS[mem] || { bg: '#f4f4f5', text: '#52525b', dot: '#71717a' };
              return (
                <span
                  key={mem}
                  style={{ backgroundColor: color.bg, color: color.text }}
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                >
                  {mem}
                </span>
              );
            })}
          </div>

          {/* 自然日期 */}
          <span
            className={`text-[11px] ${
              dateInfo.isOverdue
                ? 'text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded-md'
                : dateInfo.isToday
                ? 'text-zinc-900 font-semibold'
                : 'text-zinc-400'
            }`}
          >
            {dateInfo.label}
          </span>

          {/* 微信催办 */}
          {!item.done && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSendWechat(item);
              }}
              className="p-1.5 text-zinc-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
              title="发送微信通知"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 醒目的删除按钮 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1.5 text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="删除事项"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* 1. 逾期提醒 */}
      {overdueTodos.length > 0 && (
        <section className="space-y-2">
          <div className="text-xs font-semibold text-rose-600 px-1">
            逾期未办 ({overdueTodos.length})
          </div>
          <div className="space-y-2">
            {overdueTodos.map(renderTodoRow)}
          </div>
        </section>
      )}

      {/* 2. 今天 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 px-1">
          <span>今天</span>
          <button
            type="button"
            onClick={() => onOpenCreate(todayStr)}
            className="text-zinc-400 hover:text-zinc-900 flex items-center gap-0.5 font-normal"
          >
            <Plus className="w-3.5 h-3.5" /> 记今天
          </button>
        </div>

        {todayTodos.length === 0 ? (
          <div className="py-5 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-white/50">
            今天没有安排的事情
          </div>
        ) : (
          <div className="space-y-2">
            {todayTodos.map(renderTodoRow)}
          </div>
        )}
      </section>

      {/* 3. 接下来 */}
      {upcomingTodos.length > 0 && (
        <section className="space-y-2">
          <div className="text-xs font-semibold text-zinc-500 px-1">接下来</div>
          <div className="space-y-2">
            {upcomingTodos.map(renderTodoRow)}
          </div>
        </section>
      )}

      {/* 4. 空白状态 */}
      {activeTodos.length === 0 && (
        <div className="py-12 text-center space-y-3 bg-white rounded-2xl border border-zinc-200/80 p-6">
          <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto text-lg">
            ✨
          </div>
          <div className="text-sm font-semibold text-zinc-800">所有事情都办妥了</div>
          <p className="text-xs text-zinc-400">目前没有待处理的家庭事项</p>
          <button
            type="button"
            onClick={() => onOpenCreate()}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> 记一笔
          </button>
        </div>
      )}

      {/* 5. 已完成事项 */}
      {doneTodos.length > 0 && (
        <section className="pt-4 border-t border-zinc-200/80">
          <button
            type="button"
            onClick={() => setShowDone(!showDone)}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-600 transition px-1"
          >
            {showDone ? '收起已完成事项' : `已完成 (${doneTodos.length})`}
          </button>
          {showDone && (
            <div className="space-y-2 mt-3">
              {doneTodos.map(renderTodoRow)}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
