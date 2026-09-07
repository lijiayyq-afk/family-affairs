import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AffairItem, Member, PushPlusConfig, ViewTab } from './types';
import { StorageService } from './services/storageService';
import { PushPlusService } from './services/pushPlusService';
import { getNextRecurringDate } from './utils/dateUtils';
import { TodoView } from './components/views/TodoView';
import { CalendarView } from './components/views/CalendarView';
import { MemberView } from './components/views/MemberView';
import { AffairModal } from './components/modals/AffairModal';
import { MemberEditModal } from './components/modals/MemberEditModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { Plus, Settings, Sun, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  const [affairs, setAffairs] = useState<AffairItem[]>(() => StorageService.getAffairs());
  const [members, setMembers] = useState<Member[]>(() => StorageService.getMembers());
  const [pushPlusConfig, setPushPlusConfig] = useState<PushPlusConfig>(() =>
    StorageService.getPushPlusConfig()
  );

  // 视图 Tab：待办 | 日历 | 家人
  const [currentTab, setCurrentTab] = useState<ViewTab>('todos');
  const [selectedMemberId, setSelectedMemberId] = useState<string | 'all'>('all');

  // 弹窗
  const [isAffairModalOpen, setIsAffairModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AffairItem | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>();
  const [modalInitialMemberId, setModalInitialMemberId] = useState<string | undefined>();

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 轻量 Toast 提示
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const showToast = useCallback((text: string, error?: boolean) => {
    setToast({ text, error });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  // 持久化
  useEffect(() => {
    StorageService.saveAffairs(affairs);
  }, [affairs]);

  useEffect(() => {
    StorageService.saveMembers(members);
  }, [members]);

  useEffect(() => {
    StorageService.savePushPlusConfig(pushPlusConfig);
  }, [pushPlusConfig]);

  // 未完成事务统计
  const todoCount = useMemo(() => affairs.filter((a) => !a.done).length, [affairs]);

  // 1. 保存事项（新增/编辑）
  const handleSaveAffair = async (item: AffairItem, sendWechatNow: boolean) => {
    setAffairs((prev) => {
      const idx = prev.findIndex((a) => a.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });

    showToast(editingItem ? '已修改' : '已记下');

    if (sendWechatNow) {
      if (!pushPlusConfig.token) {
        showToast('已保存，但未配置微信 Token', true);
      } else {
        const m = members.find((x) => x.id === item.memberId);
        const res = await PushPlusService.sendItemReminder(item, m, pushPlusConfig.token);
        if (res.ok) {
          showToast('已推送到微信');
        } else {
          showToast(res.msg, true);
        }
      }
    }
  };

  // 2. 打勾/取消打勾，周期性自动滚入下期
  const handleToggleStatus = (id: string) => {
    setAffairs((prev) => {
      return prev.map((item) => {
        if (item.id !== id) return item;
        const willBeDone = !item.done;

        // 周期性事务完成时，自动生成下一期
        if (willBeDone && item.recurring && item.recurring !== 'none') {
          const nextDate = getNextRecurringDate(item.date, item.recurring);
          const nextItem: AffairItem = {
            ...item,
            id: `affair-${Date.now()}`,
            date: nextDate,
            done: false,
            completedAt: undefined,
            createdAt: new Date().toISOString(),
          };

          setTimeout(() => {
            setAffairs((p) => [nextItem, ...p]);
            showToast(`已完成，下期已排入 ${nextDate}`);
          }, 300);
        }

        return {
          ...item,
          done: willBeDone,
          completedAt: willBeDone ? new Date().toISOString() : undefined,
        };
      });
    });
  };

  // 3. 删除
  const handleDeleteAffair = (id: string) => {
    setAffairs((prev) => prev.filter((a) => a.id !== id));
    showToast('已删除事项');
  };

  // 4. 单项微信提醒
  const handleSendWechat = async (item: AffairItem) => {
    if (!pushPlusConfig.token) {
      showToast('请先在右上角「设置」中填入 Token', true);
      setIsSettingsOpen(true);
      return;
    }
    const m = members.find((x) => x.id === item.memberId);
    const res = await PushPlusService.sendItemReminder(item, m, pushPlusConfig.token);
    if (res.ok) {
      showToast('已发送微信提醒');
    } else {
      showToast(res.msg, true);
    }
  };

  // 5. 快速发送今日早报
  const [sendingDigest, setSendingDigest] = useState(false);
  const handleSendDigest = async () => {
    if (!pushPlusConfig.token) {
      showToast('请先在右上角「设置」中填入 Token', true);
      setIsSettingsOpen(true);
      return;
    }
    setSendingDigest(true);
    const res = await PushPlusService.sendDailyDigest(affairs, members, pushPlusConfig.token);
    setSendingDigest(false);

    if (res.ok) {
      confetti({ particleCount: 30, spread: 50 });
      showToast('今日早报已成功推送到微信！');
    } else {
      showToast(res.msg, true);
    }
  };

  // 6. 保存成员资料与头像
  const handleSaveMember = (updatedMember: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    showToast(`已更新【${updatedMember.name}】的资料与头像`);
  };

  // 打开记一笔
  const handleOpenCreate = (date?: string, memberId?: string) => {
    setEditingItem(null);
    setModalInitialDate(date);
    setModalInitialMemberId(memberId);
    setIsAffairModalOpen(true);
  };

  // 打开编辑
  const handleOpenEdit = (item: AffairItem) => {
    setEditingItem(item);
    setModalInitialDate(undefined);
    setModalInitialMemberId(undefined);
    setIsAffairModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col font-sans text-stone-800 selection:bg-stone-200">
      {/* 顶部极简导航栏（统一且固定在顶部） */}
      <header className="sticky top-0 z-30 bg-[#F7F6F2]/90 backdrop-blur-md border-b border-stone-200/80 px-4 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          {/* 左侧标题 */}
          <div className="flex items-center gap-2">
            <span className="text-lg">🏡</span>
            <span className="font-bold text-stone-900 text-sm sm:text-base tracking-tight hidden xs:inline">
              亲邻记事
            </span>
          </div>

          {/* 中间分段控制器（切换：待办 / 日历 / 家人） */}
          <div className="flex items-center bg-stone-200/70 p-0.5 rounded-xl text-xs font-medium text-stone-600">
            <button
              onClick={() => setCurrentTab('todos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                currentTab === 'todos' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              <span>待办</span>
              {todoCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 text-stone-700 font-bold">
                  {todoCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('calendar')}
              className={`px-3 py-1.5 rounded-lg transition ${
                currentTab === 'calendar' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              日历
            </button>
            <button
              onClick={() => setCurrentTab('family')}
              className={`px-3 py-1.5 rounded-lg transition ${
                currentTab === 'family' ? 'bg-white text-stone-900 font-semibold shadow-2xs' : 'hover:text-stone-900'
              }`}
            >
              家人
            </button>
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-1.5">
            {/* 早报微信推送 */}
            <button
              type="button"
              onClick={handleSendDigest}
              disabled={sendingDigest}
              className="p-2 text-stone-500 hover:text-amber-700 hover:bg-stone-200/60 rounded-xl transition"
              title="发送今日家庭早报至微信"
            >
              <Sun className="w-4 h-4" />
            </button>

            {/* 设置 */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition"
              title="设置与微信绑定"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* 记一笔主按钮 */}
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>记一笔</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主视图 */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'todos' && (
          <TodoView
            affairs={affairs}
            members={members}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            onToggleStatus={handleToggleStatus}
            onEdit={handleOpenEdit}
            onSendWechat={handleSendWechat}
            onOpenCreate={handleOpenCreate}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            affairs={affairs}
            members={members}
            onSelectDate={(dateStr) => handleOpenCreate(dateStr)}
            onSelectEvent={handleOpenEdit}
          />
        )}

        {currentTab === 'family' && (
          <MemberView
            members={members}
            affairs={affairs}
            onEditMember={(m) => {
              setEditingMember(m);
              setIsMemberModalOpen(true);
            }}
            onAddForMember={(mId) => handleOpenCreate(undefined, mId)}
            onFilterMember={(mId) => {
              setSelectedMemberId(mId);
              setCurrentTab('todos');
            }}
          />
        )}
      </main>

      {/* 弹窗 */}
      {/* 1. 记事弹窗 */}
      <AffairModal
        isOpen={isAffairModalOpen}
        onClose={() => setIsAffairModalOpen(false)}
        onSave={handleSaveAffair}
        onDelete={handleDeleteAffair}
        editingItem={editingItem}
        members={members}
        initialDate={modalInitialDate}
        initialMemberId={modalInitialMemberId}
      />

      {/* 2. 成员自定义头像弹窗 */}
      <MemberEditModal
        isOpen={isMemberModalOpen}
        member={editingMember}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
      />

      {/* 3. 设置弹窗 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={pushPlusConfig}
        onSaveConfig={setPushPlusConfig}
        onReloadData={() => {
          setAffairs(StorageService.getAffairs());
          setMembers(StorageService.getMembers());
          setPushPlusConfig(StorageService.getPushPlusConfig());
        }}
      />

      {/* 浮动轻提示 Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-3.5 py-2 rounded-xl text-xs font-medium shadow-md flex items-center gap-1.5 animate-in slide-in-from-bottom duration-150 ${
            toast.error ? 'bg-rose-600 text-white' : 'bg-stone-900 text-white'
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
