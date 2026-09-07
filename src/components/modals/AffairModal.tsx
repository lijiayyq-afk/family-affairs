import React, { useState, useEffect } from 'react';
import { TodoItem, FamilyMember, MEMBERS } from '../../types';
import { getTodayStr } from '../../utils/dateUtils';
import { X, Trash2, Calendar, Bell } from 'lucide-react';
import { addDays, format } from 'date-fns';

interface AffairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: TodoItem, sendWechatNow: boolean) => void;
  onDelete?: (id: string) => void;
  editingItem?: TodoItem | null;
  initialDate?: string;
}

export const AffairModal: React.FC<AffairModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingItem,
  initialDate,
}) => {
  if (!isOpen) return null;

  const todayStr = getTodayStr();
  const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const afterTomorrowStr = format(addDays(new Date(), 2), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [member, setMember] = useState<FamilyMember>('我');
  const [date, setDate] = useState(initialDate || todayStr);
  const [remindWechat, setRemindWechat] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setMember(editingItem.member);
      setDate(editingItem.date);
      setRemindWechat(editingItem.remindWechat || false);
    } else {
      setTitle('');
      setMember('我');
      setDate(initialDate || todayStr);
      setRemindWechat(false);
    }
  }, [editingItem, initialDate, isOpen, todayStr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const item: TodoItem = {
      id: editingItem ? editingItem.id : `todo-${Date.now()}`,
      title: title.trim(),
      member,
      date,
      done: editingItem ? editingItem.done : false,
      remindWechat,
      createdAt: editingItem ? editingItem.createdAt : new Date().toISOString(),
    };

    onSave(item, remindWechat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
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
          {/* 输入标题 */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="需要办什么事？(如: 去医院配药、交水费)"
              autoFocus
              required
              className="w-full text-base font-medium px-0 py-2 border-b border-zinc-200 focus:border-zinc-900 focus:outline-hidden transition placeholder:text-zinc-300 text-zinc-900"
            />
          </div>

          {/* 关联家人 */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-2">谁的事情</label>
            <div className="flex flex-wrap gap-1.5">
              {MEMBERS.map((m) => {
                const selected = member === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMember(m)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      selected
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 办理日期 */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-2">哪天办理</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                  date === todayStr
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => setDate(tomorrowStr)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                  date === tomorrowStr
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                明天
              </button>
              <button
                type="button"
                onClick={() => setDate(afterTomorrowStr)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                  date === afterTomorrowStr
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-zinc-50 text-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* 微信通知开关 */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-zinc-700" />
              <span className="font-medium text-zinc-700">发送微信消息提醒</span>
            </div>
            <input
              type="checkbox"
              checked={remindWechat}
              onChange={(e) => setRemindWechat(e.target.checked)}
              className="w-4 h-4 accent-zinc-900 rounded-sm"
            />
          </div>

          {/* 提交按钮 */}
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
