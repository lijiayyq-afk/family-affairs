import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TodoItem, MemberItem, DeletedTodoItem, ActiveTab, DEFAULT_MEMBERS } from './types';
import { StorageService } from './services/storageService';
import { SyncService, SyncStatus } from './services/syncService';
import { PushPlusService } from './services/pushPlusService';
import { TodoView } from './components/views/TodoView';
import { CalendarView } from './components/views/CalendarView';
import { AffairModal } from './components/modals/AffairModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { Plus, Check, AlertCircle, Cloud, RefreshCw, Settings } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// 防白屏全局错误边界：捕获任何意外运行时异常，保障数据完整
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] 捕获渲染异常:', error, errorInfo);
  }

  handleReset = () => {
    // 自动清洗成员配置与本地数据
    StorageService.saveMembers(DEFAULT_MEMBERS);
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full p-6 rounded-3xl border border-zinc-200 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
              🛡️
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-zinc-900 text-sm">页面遇到了一个小插曲</h3>
              <p className="text-xs text-zinc-400">已启用防白屏安全保护，你的所有待办数据完好无损。</p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition shadow-xs"
            >
              🔄 一键修复并刷新
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  const [todos, setTodos] = useState<TodoItem[]>(() => StorageService.getTodos());
  const [members, setMembers] = useState<MemberItem[]>(() => StorageService.getMembers());
  const [deletedTodos, setDeletedTodos] = useState<DeletedTodoItem[]>(() => StorageService.getDeletedTodos());
  const [activeTab, setActiveTab] = useState<ActiveTab>('todos');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const isInitialLoadCompleted = React.useRef(false);

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

  // 核心拉取函数：从云端静默拉取最新事项与成员并智能合并
  const pullLatestFromCloud = useCallback(async (isManual = false) => {
    setSyncStatus('syncing');
    try {
      const res = await SyncService.fetchCloudData();
      if (res.success && res.data) {
        setTodos((localTodos) => {
          const currentDeleted = StorageService.getDeletedTodos();
          const merged = SyncService.mergeTodos(localTodos, res.data!.todos, currentDeleted);
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
        if (isManual) {
          showToast(`已从云端同步最新数据 (共 ${res.data.todos.length} 条待办)`);
        }
      } else {
        setSyncStatus(isManual ? 'error' : 'idle');
        if (isManual) {
          showToast(res.error || '云端拉取失败', true);
        }
      }
    } catch {
      setSyncStatus(isManual ? 'error' : 'idle');
    } finally {
      isInitialLoadCompleted.current = true;
    }
  }, [showToast]);

  // 触点1：首屏挂载自动从云端静默拉取
  useEffect(() => {
    pullLatestFromCloud();
  }, [pullLatestFromCloud]);

  // 触点2：多设备实时感知（窗口聚焦、页面可见性改变、15秒心跳轮询）
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        pullLatestFromCloud();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // 页面在前台激活时，每 15 秒自动静默轮询一次云端，手机端刚记的事项电脑端秒同步
    const intervalTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullLatestFromCloud();
      }
    }, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(intervalTimer);
    };
  }, [pullLatestFromCloud]);

  // 本地与云端持久化双写（待办与家庭成员）
  useEffect(() => {
    // 本地始终实时保存
    StorageService.saveTodos(todos);
    StorageService.saveMembers(members);

    // 关键防覆盖守卫：只有在首屏从云端拉取完成之后，后续的数据变更才上推云端，绝不拿本地旧数据回冲云端
    if (isInitialLoadCompleted.current) {
      SyncService.triggerCloudSync(todos, members, setSyncStatus);
    }
  }, [todos, members]);

  // 回收站数据本地持久化
  useEffect(() => {
    StorageService.saveDeletedTodos(deletedTodos);
  }, [deletedTodos]);

  const activeCount = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  // 保存事项（新增或修改）
  const handleSaveItem = (item: TodoItem) => {
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
  };

  // 打勾切换
  const handleToggle = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  // 防误删：删除事项（移入回收站，不在待办和日历显示，但可随时还原）
  const handleDelete = (id: string) => {
    const target = todos.find((t) => t.id === id);
    if (target) {
      // 从待办列表中移除
      setTodos((prev) => prev.filter((t) => t.id !== id));
      // 移入回收站并记录当前时间
      setDeletedTodos((prev) => [
        { ...target, deletedAt: new Date().toISOString() },
        ...prev.filter((t) => t.id !== id),
      ]);
      showToast('已移入回收站，可在设置中还原');
    }
  };

  // 一键还原已删事项
  const handleRestoreTodo = (item: DeletedTodoItem) => {
    const { deletedAt, ...todoData } = item;
    // 从回收站移除
    setDeletedTodos((prev) => prev.filter((t) => t.id !== item.id));
    // 恢复到待办列表
    setTodos((prev) => {
      const exists = prev.some((t) => t.id === todoData.id);
      if (exists) {
        return prev.map((t) => (t.id === todoData.id ? todoData : t));
      }
      return [todoData, ...prev];
    });
  };

  // 清空回收站
  const handleClearRecycleBin = () => {
    setDeletedTodos([]);
    StorageService.clearRecycleBin();
  };

  // 从回收站彻底永久删除单条
  const handlePermanentDelete = (id: string) => {
    setDeletedTodos((prev) => prev.filter((t) => t.id !== id));
    StorageService.deletePermanently(id);
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
            {/* 可点击的一键云同步刷新按钮 */}
            <button
              type="button"
              onClick={() => pullLatestFromCloud(true)}
              className={`flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5 rounded-full border transition active:scale-95 cursor-pointer ${
                syncStatus === 'syncing'
                  ? 'text-sky-700 bg-sky-50 border-sky-200'
                  : syncStatus === 'error'
                  ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="点击立即从云端刷新最新事项（跨设备实时互通）"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-600" />
                  <span className="hidden sm:inline">同步中</span>
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 text-rose-600" />
                  <span>同步重试</span>
                </>
              ) : (
                <>
                  <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                  <span className="hidden sm:inline">已云同步</span>
                </>
              )}
            </button>
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
          />
        )}
      </main>

      {/* 记事/编辑弹窗 */}
      {isModalOpen && (
        <AffairModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveItem}
          onDelete={handleDelete}
          editingItem={editingItem}
          initialDate={modalDate}
          members={members}
        />
      )}

      {/* 家庭设置与管理弹窗 (数据备份、微信早报、人员管理、防误删回收站) */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          todos={todos}
          members={members}
          deletedTodos={deletedTodos}
          onUpdateMembers={(newMembers) => setMembers(newMembers)}
          onImportSuccess={(newTodos, newMembers) => {
            setTodos(newTodos);
            if (newMembers && newMembers.length > 0) {
              setMembers(newMembers);
            }
            setDeletedTodos(StorageService.getDeletedTodos());
          }}
          onRestoreTodo={handleRestoreTodo}
          onClearRecycleBin={handleClearRecycleBin}
          onPermanentDelete={handlePermanentDelete}
          showToast={showToast}
        />
      )}

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

export default function SafeApp() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
