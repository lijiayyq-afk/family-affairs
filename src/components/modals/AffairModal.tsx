import React, { useState, useEffect } from 'react';
import { TodoItem, MemberItem, getMemberBadge } from '../../types';
import { getTodayStr } from '../../utils/dateUtils';
import { X, Trash2, Calendar, Check } from 'lucide-react';
import { addDays, format, parseISO, differenceInCalendarDays } from 'date-fns';

interface AffairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: TodoItem) => void;
  onDelete?: (id: string) => void;
  editingItem?: TodoItem | null;
  initialDate?: string;
  members: MemberItem[];
}

export const AffairModal: React.FC<AffairModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingItem,
  initialDate,
  members,
}) => {
  if (!isOpen) return null;

  const defaultBadge = members?.[0]?.badge || '佳';
  const todayStr = getTodayStr();
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const afterTomorrowStr = format(addDays(new Date(), 2), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([defaultBadge]);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [startDate, setStartDate] = useState(initialDate || todayStr);
  const [endDate, setEndDate] = useState(initialDate || todayStr);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      const normalized = (editingItem.members || [defaultBadge]).map((m) => getMemberBadge(m, members));
      setSelectedMembers(normalized);
      setStartDate(editingItem.date);
      const hasRange = Boolean(editingItem.endDate && editingItem.endDate > editingItem.date);
      setIsRangeMode(hasRange);
      setEndDate(editingItem.endDate || editingItem.date);
    } else {
      setTitle('');
      setSelectedMembers([defaultBadge]);
      const initD = initialDate || todayStr;
      setStartDate(initD);
      setEndDate(initD);
      setIsRangeMode(false); // 默认一天
    }
  }, [editingItem, initialDate, isOpen, todayStr, defaultBadge, members]);

  // 切换成员多选
  const handleToggleMember = (badge: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(badge)) {
        if (prev.length > 1) {
          return prev.filter((item) => item !== badge);
        }
        return prev;
      } else {
        return [...prev, badge];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const item: TodoItem = {
      id: editingItem ? editingItem.id : `todo-${Date.now()}`,
      title: title.trim(),
      members: selectedMembers,
      date: startDate,
      endDate: isRangeMode && endDate > startDate ? endDate : undefined,
      done: editingItem ? editingItem.done : false,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-zinc-200">
        {/* 头部 */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">
            {editingItem ? '管理事项' : '记一笔'}
          </h2>
          <div className="flex items-center gap-1">
            {editingItem && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`确定要删除“${editingItem.title}”吗？`)) {
                    onDelete(editingItem.id);
                    onClose();
                  }
                }}
                className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                title="删除事项"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 事项标题 */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="需要办什么事？(如: 陪爷爷去医院、小宝夏令营)"
              autoFocus
              required
              className="w-full text-base font-medium px-0 py-2 border-b border-zinc-200 focus:border-zinc-900 focus:outline-hidden transition placeholder:text-zinc-300 text-zinc-900"
            />
          </div>

          {/* 关联家人（多选） */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-zinc-400">
                谁的事情 (支持多选)
              </label>
              <span className="text-[10px] text-zinc-400">
                已选: {selectedMembers.join('、')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const selected = selectedMembers.includes(m.badge);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleMember(m.badge)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1.5 ${
                      selected
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {selected ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      <span
                        style={{ backgroundColor: m.color.dot }}
                        className="w-1.5 h-1.5 rounded-full inline-block"
                      />
                    )}
                    <span className="font-bold text-xs">{m.badge}</span>
                    <span className={`text-[10px] ${selected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {m.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 办理日期与连续多天设置 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-400">办理日期</label>
              {/* 模式选择：默认单天 vs 连续几天 */}
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg text-[11px] font-medium text-zinc-500">
                <button
                  type="button"
                  onClick={() => {
                    setIsRangeMode(false);
                    setEndDate(startDate);
                  }}
                  className={`px-2.5 py-0.5 rounded-md transition ${
                    !isRangeMode ? 'bg-white text-zinc-900 font-semibold shadow-2xs' : 'hover:text-zinc-800'
                  }`}
                >
                  单天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRangeMode(true);
                    if (endDate <= startDate) {
                      try {
                        setEndDate(format(addDays(parseISO(startDate), 2), 'yyyy-MM-dd'));
                      } catch {
                        setEndDate(startDate);
                      }
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-md transition ${
                    isRangeMode ? 'bg-white text-zinc-900 font-semibold shadow-2xs' : 'hover:text-zinc-800'
                  }`}
                >
                  连续几天
                </button>
              </div>
            </div>

            {!isRangeMode ? (
              /* 单天模式 */
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    startDate === todayStr
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  今天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(tomorrowStr);
                    setEndDate(tomorrowStr);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    startDate === tomorrowStr
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  明天
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate(afterTomorrowStr);
                    setEndDate(afterTomorrowStr);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                    startDate === afterTomorrowStr
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  后天
                </button>

                <div className="flex items-center gap-1 ml-auto">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-zinc-50 text-zinc-700"
                  />
                </div>
              </div>
            ) : (
              /* 连续几天模式 */
              <div className="space-y-2.5 bg-zinc-50/80 p-3 rounded-xl border border-zinc-200/80">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <span className="block text-[10px] text-zinc-400 mb-1">开始日期</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setStartDate(newStart);
                        if (endDate < newStart) setEndDate(newStart);
                      }}
                      className="w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-800"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-400 mb-1">结束日期</span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 bg-white text-zinc-800"
                    />
                  </div>
                </div>

                {/* 快速快捷天数 */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-zinc-400">快速持续:</span>
                  {[
                    { label: '2天', offset: 1 },
                    { label: '3天', offset: 2 },
                    { label: '5天', offset: 4 },
                    { label: '7天', offset: 6 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        try {
                          const d = parseISO(startDate);
                          setEndDate(format(addDays(d, btn.offset), 'yyyy-MM-dd'));
                        } catch {
                          // ignore
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* 概览说明 */}
                <div className="text-[11px] text-zinc-600 font-medium pt-1 flex items-center justify-between border-t border-zinc-200/60">
                  <span>
                    🗓️ 连续{' '}
                    <b className="text-zinc-900 font-bold">
                      {Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1)}
                    </b>{' '}
                    天
                  </span>
                  <span className="text-zinc-400 text-[10px]">
                    {format(parseISO(startDate), 'M月d日')} ~ {format(parseISO(endDate), 'M月d日')}
                  </span>
                </div>
              </div>
            )}
          </div>



          {/* 底部按钮 */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition"
            >
              {editingItem ? '保存修改' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
