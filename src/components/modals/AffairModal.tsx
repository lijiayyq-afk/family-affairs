import React, { useState, useEffect } from 'react';
import { AffairItem, Member } from '../../types';
import { CATEGORIES } from '../../constants/initialData';
import { Avatar } from '../common/Avatar';
import { getTodayStr } from '../../utils/dateUtils';
import { X, Bell, Trash2, Calendar } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface AffairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: AffairItem, sendWechatNow: boolean) => void;
  onDelete?: (id: string) => void;
  editingItem?: AffairItem | null;
  members: Member[];
  initialDate?: string;
  initialMemberId?: string;
}

export const AffairModal: React.FC<AffairModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingItem,
  members,
  initialDate,
  initialMemberId,
}) => {
  if (!isOpen) return null;

  const todayStr = getTodayStr();
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const dayAfterTomorrowStr = format(addDays(new Date(), 2), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [memberId, setMemberId] = useState(initialMemberId || members[0]?.id || 'me');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [date, setDate] = useState(initialDate || todayStr);
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [sendWechat, setSendWechat] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setNote(editingItem.note || '');
      setMemberId(editingItem.memberId);
      setCategory(editingItem.category);
      setDate(editingItem.date);
      setPriority(editingItem.priority || 'normal');
      setRecurring(editingItem.recurring || 'none');
      setSendWechat(false);
    } else {
      setTitle('');
      setNote('');
      setMemberId(initialMemberId || members[0]?.id || 'me');
      setCategory(CATEGORIES[0]);
      setDate(initialDate || todayStr);
      setPriority('normal');
      setRecurring('none');
      setSendWechat(false);
    }
  }, [editingItem, initialDate, initialMemberId, isOpen, members, todayStr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const item: AffairItem = {
      id: editingItem ? editingItem.id : `affair-${Date.now()}`,
      title: title.trim(),
      note: note.trim() || undefined,
      memberId,
      category,
      date,
      priority,
      recurring,
      remindWechat: sendWechat || (editingItem?.remindWechat ?? false),
      done: editingItem ? editingItem.done : false,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    onSave(item, sendWechat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-stone-200/80">
        {/* 头部 */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-800">
            {editingItem ? '编辑事项' : '记一笔'}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md hover:bg-stone-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm overflow-y-auto max-h-[80vh]">
          {/* 标题 */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="需要处理什么事情？(如：陪爷爷去医院、交水费)"
              autoFocus
              required
              className="w-full text-base font-medium px-0 py-1.5 border-b border-stone-200 focus:border-stone-800 focus:outline-hidden transition placeholder:text-stone-300 text-stone-900"
            />
          </div>

          {/* 责任人选择（一排头像直接点选） */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-2">责任家人</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {members.map((m) => {
                const selected = memberId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMemberId(m.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition shrink-0 ${
                      selected
                        ? 'border-stone-800 bg-stone-900 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Avatar member={m} size="sm" />
                    <span className="text-xs font-medium">{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 日期快捷选择（只到天） */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-2">办理日期</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`px-3 py-1 text-xs rounded-lg border transition ${
                  date === todayStr
                    ? 'bg-stone-900 text-white border-stone-900 font-medium'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => setDate(tomorrowStr)}
                className={`px-3 py-1 text-xs rounded-lg border transition ${
                  date === tomorrowStr
                    ? 'bg-stone-900 text-white border-stone-900 font-medium'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                明天
              </button>
              <button
                type="button"
                onClick={() => setDate(dayAfterTomorrowStr)}
                className={`px-3 py-1 text-xs rounded-lg border transition ${
                  date === dayAfterTomorrowStr
                    ? 'bg-stone-900 text-white border-stone-900 font-medium'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                后天
              </button>

              <div className="flex items-center gap-1.5 ml-auto">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-stone-50 text-stone-700"
                />
              </div>
            </div>
          </div>

          {/* 分类点选 */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-2">分类</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                      active
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-medium'
                        : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 选项行：紧急程度与循环周期 */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-stone-100 text-xs">
            <div>
              <label className="block text-stone-400 mb-1">重复提醒</label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as any)}
                className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 bg-stone-50 text-stone-700"
              >
                <option value="none">不重复 (单次)</option>
                <option value="weekly">每周重复</option>
                <option value="monthly">每月重复</option>
                <option value="yearly">每年重复</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-400 mb-1">优先程度</label>
              <button
                type="button"
                onClick={() => setPriority((prev) => (prev === 'urgent' ? 'normal' : 'urgent'))}
                className={`w-full py-1.5 px-2 rounded-lg border text-center transition ${
                  priority === 'urgent'
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-medium'
                    : 'bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                {priority === 'urgent' ? '🚨 标为紧急' : '常规事项'}
              </button>
            </div>
          </div>

          {/* 微信提醒开关 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              <div className="text-xs">
                <div className="font-medium text-stone-800">保存时发送微信提醒</div>
                <div className="text-[11px] text-stone-400">通过 PushPlus 推送通知</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sendWechat}
              onChange={(e) => setSendWechat(e.target.checked)}
              className="w-4 h-4 accent-stone-900 rounded-sm"
            />
          </div>

          {/* 备忘 */}
          <div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="添加备注（如：带好医保卡、门诊2楼等...）"
              rows={2}
              className="w-full text-xs p-2.5 border border-stone-200 rounded-xl bg-stone-50/50 focus:bg-white focus:border-stone-400 focus:outline-hidden transition"
            />
          </div>

          {/* 底部操作 */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-100">
            {editingItem && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('确定删除此事项吗？')) {
                    onDelete(editingItem.id);
                    onClose();
                  }
                }}
                className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg transition"
                title="删除事项"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition"
              >
                {editingItem ? '保存' : '记下了'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
