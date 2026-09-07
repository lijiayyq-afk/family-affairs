import React, { useState, useMemo } from 'react';
import { AffairItem, Member } from '../../types';
import { CATEGORIES } from '../../constants/initialData';
import { Avatar } from '../common/Avatar';
import { formatHumanDate } from '../../utils/dateUtils';
import { Check, Circle, Bell, Calendar, Plus, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TodoViewProps {
  affairs: AffairItem[];
  members: Member[];
  selectedMemberId: string | 'all';
  onSelectMember: (id: string | 'all') => void;
  onToggleStatus: (id: string) => void;
  onEdit: (item: AffairItem) => void;
  onSendWechat: (item: AffairItem) => void;
  onOpenCreate: (initialDate?: string, initialMemberId?: string) => void;
}

export const TodoView: React.FC<TodoViewProps> = ({
  affairs,
  members,
  selectedMemberId,
  onSelectMember,
  onToggleStatus,
  onEdit,
  onSendWechat,
  onOpenCreate,
}) => {
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [showDone, setShowDone] = useState(false);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // 筛选事务
  const filtered = useMemo(() => {
    return affairs.filter((item) => {
      if (selectedMemberId !== 'all' && item.memberId !== selectedMemberId) return false;
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      return true;
    });
  }, [affairs, selectedMemberId, activeCategory]);

  // 拆分为：逾期、今天、接下来的日子、已完成
  const todayStr = new Date().toISOString().slice(0, 10);

  const { overdueList, todayList, upcomingList, doneList } = useMemo(() => {
    const overdueList: AffairItem[] = [];
    const todayList: AffairItem[] = [];
    const upcomingList: AffairItem[] = [];
    const doneList: AffairItem[] = [];

    filtered.forEach((item) => {
      if (item.done) {
        doneList.push(item);
      } else if (item.date < todayStr) {
        overdueList.push(item);
      } else if (item.date === todayStr) {
        todayList.push(item);
      } else {
        upcomingList.push(item);
      }
    });

    // 排序
    const sortByDate = (a: AffairItem, b: AffairItem) => a.date.localeCompare(b.date);
    overdueList.sort(sortByDate);
    todayList.sort(sortByDate);
    upcomingList.sort(sortByDate);
    doneList.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

    return { overdueList, todayList, upcomingList, doneList };
  }, [filtered, todayStr]);

  // 打勾动效
  const handleCheck = (e: React.MouseEvent, item: AffairItem) => {
    e.stopPropagation();
    if (!item.done) {
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
      });
    }
    onToggleStatus(item.id);
  };

  // 单行事项渲染
  const renderItemRow = (item: AffairItem) => {
    const member = memberMap.get(item.memberId);
    const dateInfo = formatHumanDate(item.date);

    return (
      <div
        key={item.id}
        onClick={() => onEdit(item)}
        className="group relative flex items-start gap-3 py-3 px-3.5 bg-white rounded-xl border border-stone-200/80 hover:border-stone-400/60 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
      >
        {/* 打勾圆圈 */}
        <button
          type="button"
          onClick={(e) => handleCheck(e, item)}
          className="mt-0.5 text-stone-300 hover:text-stone-700 transition shrink-0"
        >
          {item.done ? (
            <div className="w-5 h-5 rounded-full bg-stone-800 text-white flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          ) : (
            <Circle className="w-5 h-5 group-hover:text-stone-400" />
          )}
        </button>

        {/* 核心文字 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${
                item.done ? 'line-through text-stone-300' : 'text-stone-800'
              }`}
            >
              {item.title}
            </span>

            {/* 紧急标记 */}
            {item.priority === 'urgent' && !item.done && (
              <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.2 rounded-md font-medium">
                紧急
              </span>
            )}

            {/* 周期标记 */}
            {item.recurring && item.recurring !== 'none' && !item.done && (
              <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded-md">
                周期循环
              </span>
            )}
          </div>

          {item.note && (
            <p className={`text-xs mt-1 ${item.done ? 'text-stone-300 line-through' : 'text-stone-400'}`}>
              {item.note}
            </p>
          )}

          {/* 属性元信息 */}
          <div className="flex items-center gap-2.5 mt-2 text-xs text-stone-400 flex-wrap">
            {/* 成员印章 */}
            <div className="flex items-center gap-1 text-stone-600 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200/60">
              <Avatar member={member} size="sm" />
              <span className="text-[11px] font-medium">{member?.name || '全家'}</span>
            </div>

            {/* 分类 */}
            <span className="text-[11px] text-stone-500 bg-stone-100/80 px-2 py-0.5 rounded-md">
              {item.category}
            </span>

            {/* 日期自然表达 */}
            <span
              className={`text-[11px] font-medium ${
                dateInfo.isOverdue
                  ? 'text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md'
                  : dateInfo.isToday
                  ? 'text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md'
                  : 'text-stone-400'
              }`}
            >
              {dateInfo.label}
            </span>
          </div>
        </div>

        {/* 微信催办按钮 */}
        {!item.done && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSendWechat(item);
            }}
            className="opacity-0 group-hover:opacity-100 sm:opacity-80 hover:opacity-100 p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
            title="发送微信提醒"
          >
            <Bell className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 顶部极简家人选择栏 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => onSelectMember('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
            selectedMemberId === 'all'
              ? 'bg-stone-900 text-white shadow-2xs'
              : 'bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50'
          }`}
        >
          全家人
        </button>
        {members.map((m) => {
          const isSelected = selectedMemberId === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMember(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200/80 hover:bg-stone-50'
              }`}
            >
              <Avatar member={m} size="sm" />
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* 分类快捷筛选 */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-stone-500">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2.5 py-1 rounded-lg transition ${
            activeCategory === 'all' ? 'font-semibold text-stone-900 bg-stone-200/60' : 'hover:text-stone-800'
          }`}
        >
          全部类型
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeCategory === cat ? 'font-semibold text-stone-900 bg-stone-200/60' : 'hover:text-stone-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 1. 逾期待办 */}
      {overdueList.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600">
            <span>⚠️ 逾期未完成 ({overdueList.length})</span>
          </div>
          <div className="space-y-2">
            {overdueList.map(renderItemRow)}
          </div>
        </section>
      )}

      {/* 2. 今日事项 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>今天 · {todayStr}</span>
          <button
            type="button"
            onClick={() => onOpenCreate(todayStr)}
            className="text-stone-400 hover:text-stone-800 flex items-center gap-0.5 font-normal"
          >
            <Plus className="w-3.5 h-3.5" /> 记今天
          </button>
        </div>
        {todayList.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl border border-dashed border-stone-200 text-stone-400 text-xs bg-stone-50/50">
            今天暂无需要处理的家庭事务
          </div>
        ) : (
          <div className="space-y-2">
            {todayList.map(renderItemRow)}
          </div>
        )}
      </section>

      {/* 3. 接下来几天 */}
      {upcomingList.length > 0 && (
        <section className="space-y-2">
          <div className="text-xs font-semibold text-stone-600">
            <span>接下来 ({upcomingList.length})</span>
          </div>
          <div className="space-y-2">
            {upcomingList.map(renderItemRow)}
          </div>
        </section>
      )}

      {/* 4. 已办妥事项折叠 */}
      {doneList.length > 0 && (
        <section className="pt-4 border-t border-stone-200/70">
          <button
            type="button"
            onClick={() => setShowDone(!showDone)}
            className="text-xs font-medium text-stone-400 hover:text-stone-600 flex items-center gap-1.5"
          >
            <span>{showDone ? '收起已完成事项' : `查看已完成的 ${doneList.length} 项事务`}</span>
          </button>
          {showDone && (
            <div className="space-y-2 mt-3 opacity-70">
              {doneList.map(renderItemRow)}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
