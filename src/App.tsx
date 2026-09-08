import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TodoItem, MemberItem, ActiveTab } from './types';
import { StorageService } from './services/storageService';
import { SyncService, SyncStatus } from './services/syncService';
import { PushPlusService } from './services/pushPlusService';
import { TodoView } from './components/views/TodoView';
import { CalendarView } from './components/views/CalendarView';
import { AffairModal } from './components/modals/AffairModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { Plus, Check, AlertCircle, Cloud, RefreshCw, Settings } from 'lucide-react';

export function App() {
  const [todos, setTodos] = useState<TodoItem[]>(() => StorageService.getTodos());
  const [members, setMembers] = useState<MemberItem[]>(() => StorageService.getMembers());
  const [activeTab, setActiveTab] = useState<ActiveTab>('todos');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // 首屏挂载：静默自动拉取云端数据，多端智能合并待办与家庭成员
  useEffect(() => {
    let isMounted = true;
    setSyncStatus('syncing');

    SyncService.fetchCloudData().then((res) => {
      if (!isMounted) return;
      if (res.success && res.data) {
        setTodos((localTodos) => {
          const merged = SyncService.mergeTodos(localTodos, res.data!.todos);
          StorageService.saveTodos(merged);
          return merged;
        });

        if (res.data.members && res.data.members.length > 0) {
          setMembers((localMembers) => {
            const merged = SyncService.mergeMembers(localMembers, res.data!.members);
            StorageService.saveMembers(merged);
            return merged;
          });
        }

        setSyncStatus('synced');
      } else {
        setSyncStatus('idle');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 本地与云端持久化双写（待办与家庭成员）
  useEffect(() => {
    StorageService.saveTodos(todos);
    StorageService.saveMembers(members);
    SyncService.triggerCloudSync(todos, members, setSyncStatus);
  }, [todos, members]);

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

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans text-zinc-900 selection:bg-zinc-200">
      {/* 顶部固定导航栏 */}
      <header className="sticky top-0 z-30 bg-[#faf9f6]/95 backdrop-blur-md border-b border-zinc-200/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* 标题与云同步状态 */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🏡</span>
            <span className="font-bold text-zinc-900 text-sm tracking-tight">
              家庭事务
            </span>
            {syncStatus === 'syncing' && (
              <span className="flex items-center gap-0.5 text-[10px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full animate-pulse" title="正在与云端多设备同步">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span className="hidden sm:inline">同步中</span>
              </span>
            )}
            {syncStatus === 'synced' && (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full" title="已与云端实时同步，跨设备互通">
                <Cloud className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">已云同步</span>
              </span>
            )}
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

          {/* 右侧操作：家庭设置与管理 + 记一笔 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1.5 rounded-xl transition"
              title="家庭设置与管理（数据备份、微信早报、人员管理）"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">设置</span>
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
            members={members}
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
            members={members}
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
        members={members}
      />

      {/* 家庭设置与管理弹窗 (数据备份、微信早报、人员管理) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        todos={todos}
        members={members}
        onUpdateMembers={(newMembers) => setMembers(newMembers)}
        onImportSuccess={(newTodos, newMembers) => {
          setTodos(newTodos);
          if (newMembers && newMembers.length > 0) {
            setMembers(newMembers);
          }
        }}
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
