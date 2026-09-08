import React, { useState, useRef } from 'react';
import { TodoItem, FamilyMember, MEMBERS, MEMBER_CONFIG, getMemberBadge } from '../../types';
import { MEMBER_COLORS } from '../../constants/initialData';
import { StorageService } from '../../services/storageService';
import { SyncService } from '../../services/syncService';
import { PushPlusService } from '../../services/pushPlusService';
import {
  X,
  Settings,
  Users,
  Sun,
  Database,
  Download,
  Upload,
  ShieldCheck,
  Cloud,
  RefreshCw,
  Trash2,
  Bell,
  Check,
  Send,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  onImportSuccess: (todos: TodoItem[]) => void;
  showToast: (text: string, error?: boolean) => void;
}

type SettingsTab = 'members' | 'wechat' | 'backup';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  todos,
  onImportSuccess,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('members');
  const [sendingDigest, setSendingDigest] = useState(false);
  const [testingWechat, setTestingWechat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. 微信早报
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

  // 发送单条测试推送
  const handleTestWechat = async () => {
    setTestingWechat(true);
    const res = await PushPlusService.send(
      '【测试】家庭事务微信通道连通',
      '<div style="padding:15px;background:#f9f9f9;border-radius:8px;">微信通知测试成功！你的家庭事务随时为你保驾护航。</div>'
    );
    setTestingWechat(false);
    if (res.ok) {
      showToast('测试消息已发送到微信！');
    } else {
      showToast(res.msg, true);
    }
  };

  // 2. 数据导出与导入
  const handleExport = () => {
    StorageService.exportBackup(todos);
    showToast('备份文件已下载到本地！');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = StorageService.importBackup(content);
      if (res.success) {
        const freshTodos = StorageService.getTodos();
        onImportSuccess(freshTodos);
        showToast(`成功恢复 ${res.count || 0} 条事项！`);
      } else {
        showToast(res.error || '导入失败，文件格式不正确', true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 清空所有已完成事项
  const handleClearDone = () => {
    const doneCount = todos.filter((t) => t.done).length;
    if (doneCount === 0) {
      showToast('目前没有已完成的事项');
      return;
    }
    if (confirm(`确定要清空 ${doneCount} 条已完成的事项吗？`)) {
      const remaining = todos.filter((t) => !t.done);
      StorageService.saveTodos(remaining);
      onImportSuccess(remaining);
      showToast(`已清理 ${doneCount} 条已办事项`);
    }
  };

  // 统计每位成员的事项数
  const getMemberStats = (member: FamilyMember) => {
    const badge = getMemberBadge(member);
    const active = todos.filter((t) => !t.done && (t.members || ['佳']).map((m) => getMemberBadge(m)).includes(badge)).length;
    const done = todos.filter((t) => t.done && (t.members || ['佳']).map((m) => getMemberBadge(m)).includes(badge)).length;
    return { active, done, total: active + done };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-zinc-700" />
            <span className="font-semibold text-sm text-zinc-900">家庭设置与管理</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 分段导航 Tabs */}
        <div className="flex border-b border-zinc-100 bg-zinc-50/70 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition ${
              activeTab === 'members'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>人员管理</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wechat')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition ${
              activeTab === 'wechat'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            <span>微信早报</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition ${
              activeTab === 'backup'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>数据备份</span>
          </button>
        </div>

        {/* 内容展示区 */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: 人员管理 */}
          {activeTab === 'members' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="text-xs text-zinc-500 flex items-center justify-between">
                <span>核心家庭成员 (共 {MEMBERS.length} 位)</span>
                <span className="text-[10px] text-zinc-400">专属颜色 · 事项统计</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MEMBERS.map((m) => {
                  const color = MEMBER_COLORS[m];
                  const stats = getMemberStats(m);
                  const roleDesc = MEMBER_CONFIG[m]?.desc || m;
                  return (
                    <div
                      key={m}
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 bg-white transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          style={{ backgroundColor: color.bg, color: color.text }}
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-2xs"
                        >
                          {m}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                            <span>{m}</span>
                            <span className="text-[11px] text-zinc-400 font-normal">({roleDesc})</span>
                          </div>
                          <div className="text-[10px] text-zinc-400">家庭成员标志</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-zinc-900">
                          {stats.active}
                        </span>
                        <span className="text-[10px] text-zinc-400 ml-1">项待办</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
                💡 <b>提示：</b>在新增或编辑事项时，可同时勾选多个家庭成员（例如“我”和“配偶”一起办某件事）。后续可在设置中扩充更多家庭成员或自定义生活照。
              </div>
            </div>
          )}

          {/* TAB 2: 微信早报与提醒 */}
          {activeTab === 'wechat' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* 今日早报卡片 */}
              <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/60 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900">今日家庭早报</h4>
                      <p className="text-[11px] text-amber-800/80">汇总今日待办与逾期提醒，直接推送到微信</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendTodayDigest}
                  disabled={sendingDigest}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingDigest ? '正在推送到微信...' : '立即发送今日微信早报'}</span>
                </button>
              </div>

              {/* 微信通道状态 */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700">PushPlus 微信推送通道</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    已内置启用
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  你的专属 PushPlus Token 已内置托管，全端免密。事项单发与早报推送均直接到达微信。
                </p>

                <button
                  type="button"
                  onClick={handleTestWechat}
                  disabled={testingWechat}
                  className="w-full py-2 px-3 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg transition"
                >
                  {testingWechat ? '测试发送中...' : '🔔 发送一条测试微信消息'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 数据与多端备份 */}
          {activeTab === 'backup' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* 云端跨设备实时同步 */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 flex items-start gap-3">
                <Cloud className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-950 space-y-1 flex-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>多端实时云同步</span>
                    <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-normal">
                      实时互通
                    </span>
                  </div>
                  <p className="text-sky-800/90 leading-relaxed text-[11px]">
                    手机与电脑数据自动秒级同步，保存在私有云存储中，更新版本或换设备绝不丢失。
                  </p>
                </div>
              </div>

              {/* 手动从云端拉取 */}
              <button
                type="button"
                onClick={async () => {
                  showToast('正在从云端拉取最新数据...');
                  const res = await SyncService.fetchCloudTodos();
                  if (res.success && res.data) {
                    const merged = SyncService.mergeTodos(todos, res.data);
                    StorageService.saveTodos(merged);
                    onImportSuccess(merged);
                    showToast(`云端同步成功，共 ${merged.length} 条事项`);
                  } else {
                    showToast(res.error || '云端同步失败', true);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100/80 rounded-xl border border-sky-200/50 transition active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                <span>从云端立即重新拉取数据</span>
              </button>

              {/* 本地永久存储与文件备份 */}
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700">本地离线双保险</span>
                  <span className="font-bold text-zinc-900">{todos.length} 条事项</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-600" />
                    <span>导出备份</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-zinc-800 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition"
                  >
                    <Upload className="w-3.5 h-3.5 text-zinc-600" />
                    <span>导入恢复</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* 清空已完成 */}
              <button
                type="button"
                onClick={handleClearDone}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>一键清理已完成的事项</span>
              </button>
            </div>
          )}
        </div>

        {/* 底部版权/提示 */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-400 text-center flex items-center justify-between">
          <span>亲邻记事 · 家庭事务中心</span>
          <span className="text-[10px] text-zinc-400">v1.2 稳定版</span>
        </div>
      </div>
    </div>
  );
};
