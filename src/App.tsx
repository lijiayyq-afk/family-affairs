import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TodoItem, ActiveTab } from './types';
import { StorageService } from './services/storageService';
import { PushPlusService } from './services/pushPlusService';
import { TodoView } from './components/views/TodoView';
import { CalendarView } from './components/views/CalendarView';
import { AffairModal } from './components/modals/AffairModal';
import { BackupModal } from './components/modals/BackupModal';
import { Plus, Sun, Check, AlertCircle, Database } from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  const [todos, setTodos] = useState<TodoItem[]>(() => StorageService.getTodos());
  const [activeTab, setActiveTab] = useState<ActiveTab>('todos');

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [modalDate, setModalDate] = useState<string | undefined>();

  // 轻量 Toast 提示
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const showToast = useCallback((text: string, error?: boolean) => {
    setToast({ text, error });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 2500);
  }, []);

  // 持久化
  useEffect(() => {
    StorageService.saveTodos(todos);
  }, [todos]);

  const activeCount = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  // 保存事项（新增或修改）
  const handleSaveItem = async (item: TodoItem, sendWechatNow: boolean) => {
    setTodos((prev) => {
      const idx = prev.findIndex((t) => t.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });

    showToast(editingItem ? '已修改' : '已记下');

    if (sendWechatNow) {
      const res = await PushPlusService.sendItem(item);
      if (res.ok) {
        showToast('已推送到微信');
      } else {
        showToast(res.msg, true);
      }
    }
  };

  // 打勾切换
  const handleToggle = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // 删除事项
  const handleDelete = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    showToast('已删除事项');
  };

  // 发送单条微信
  const handleSendWechat = async (item: TodoItem) => {
    const res = await PushPlusService.sendItem(item);
    if (res.ok) {
      showToast('已推送到微信');
    } else {
      showToast(res.msg, true);
    }
  };

  // 发送今日微信早报
  const [sendingDigest, setSendingDigest] = useState(false);
  const handleSendTodayDigest = async () => {
    setSendingDigest(true);
    const res = await PushPlusService.sendTodayDigest(todos);
    setSendingDigest(false);

    if (res.ok) {
      confetti({ particleCount: 30, spread: 50 });
      showToast('今日早报已推送到微信！');
    } else {
      showToast(res.msg, true);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans text-zinc-900 selection:bg-zinc-200">
      {/* 顶部固定导航栏 */}
      <header className="sticky top-0 z-30 bg-[#faf9f6]/95 backdrop-blur-md border-b border-zinc-200/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* 标题 */}
          <div className="flex items-center gap-2">
            <span className="text-lg">🏡</span>
            <span className="font-bold text-zinc-900 text-sm tracking-tight hidden sm:inline">
              家庭事务
            </span>
          </div>

          {/* 中间分段视图切换：待办清单 | 日历 */}
          <div className="flex items-center bg-zinc-200/70 p-0.5 rounded-xl text-xs font-medium text-zinc-600">
            <button
              onClick={() => setActiveTab('todos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'todos' ? 'bg-white text-zinc-900 font-semibold shadow-2xs' : 'hover:text-zinc-900'
              }`}
            >
              <span>待办</span>
              {activeCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200 text-zinc-700 font-bold">
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'calendar' ? 'bg-white text-zinc-900 font-semibold shadow-2xs' : 'hover:text-zinc-900'
              }`}
            >
              日历
            </button>
          </div>

          {/* 右侧操作：数据备份 + 发微信早报 + 记一笔 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsBackupOpen(true)}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2 py-1.5 sm:px-2.5 rounded-xl transition"
              title="数据备份与恢复"
            >
              <Database className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">备份</span>
            </button>

            <button
              type="button"
              onClick={handleSendTodayDigest}
              disabled={sendingDigest}
              className="flex items-center gap-1 text-xs text-zinc-600 hover:text-amber-800 bg-zinc-100 hover:bg-zinc-200/80 px-2 py-1.5 sm:px-2.5 rounded-xl transition"
              title="发送今日早报至微信"
            >
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">微信早报</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setModalDate(undefined);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>记一笔</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主界面内容区 */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'todos' && (
          <TodoView
            todos={todos}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={(item) => {
              setEditingItem(item);
              setModalDate(undefined);
              setIsModalOpen(true);
            }}
            onSendWechat={handleSendWechat}
            onOpenCreate={(date) => {
              setEditingItem(null);
              setModalDate(date);
              setIsModalOpen(true);
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            todos={todos}
            onSelectDate={(dateStr) => {
              setEditingItem(null);
              setModalDate(dateStr);
              setIsModalOpen(true);
            }}
            onSelectEvent={(item) => {
              setEditingItem(item);
              setModalDate(undefined);
              setIsModalOpen(true);
            }}
            onToggleStatus={handleToggle}
            onDelete={handleDelete}
            onSendWechat={handleSendWechat}
          />
        )}
      </main>

      {/* 记事/编辑弹窗 */}
      <AffairModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        onDelete={handleDelete}
        editingItem={editingItem}
        initialDate={modalDate}
      />

      {/* 数据与备份弹窗 */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        todos={todos}
        onImportSuccess={(newTodos) => setTodos(newTodos)}
        showToast={showToast}
      />

      {/* 底部轻量 Toast 提示 */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-xl text-xs font-medium shadow-md flex items-center gap-1.5 animate-in slide-in-from-bottom duration-150 ${
            toast.error ? 'bg-rose-600 text-white' : 'bg-zinc-900 text-white'
          }`}
        >
          {toast.error ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}

export default App;
