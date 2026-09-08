import React, { useState, useRef } from 'react';
import { TodoItem, MemberItem, MemberColor, DeletedTodoItem, PRESET_COLORS, getMemberBadge, getMemberColor } from '../../types';
import { StorageService } from '../../services/storageService';
import { SyncService } from '../../services/syncService';
import { PushPlusService } from '../../services/pushPlusService';
import { formatTodoDateRange } from '../../utils/dateUtils';
import {
  X,
  Settings,
  Users,
  Sun,
  Database,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  Trash2,
  Edit2,
  Plus,
  Check,
  Send,
  Eye,
  Clock,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  members: MemberItem[];
  deletedTodos: DeletedTodoItem[];
  onUpdateMembers: (members: MemberItem[]) => void;
  onImportSuccess: (todos: TodoItem[], members?: MemberItem[]) => void;
  onRestoreTodo: (todo: DeletedTodoItem) => void;
  onClearRecycleBin: () => void;
  onPermanentDelete: (id: string) => void;
  showToast: (text: string, error?: boolean) => void;
}

type SettingsTab = 'members' | 'wechat' | 'backup' | 'trash';

// 相对删除时间格式化
function formatRelativeTime(isoStr: string): string {
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return '刚刚删除';
    if (diffMinutes < 60) return `${diffMinutes} 分钟前删除`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} 小时前删除`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} 天前删除`;
    return isoStr.slice(5, 10);
  } catch {
    return '已删除';
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  todos,
  members,
  deletedTodos,
  onUpdateMembers,
  onImportSuccess,
  onRestoreTodo,
  onClearRecycleBin,
  onPermanentDelete,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('members');
  const [sendingDigest, setSendingDigest] = useState(false);
  const [testingWechat, setTestingWechat] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 成员编辑/新增状态
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null); // 'new' 或具体 id
  const [formBadge, setFormBadge] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formColor, setFormColor] = useState<MemberColor>(PRESET_COLORS[0].color);

  if (!isOpen) return null;

  // 开启新增成员表单
  const handleOpenAddMember = () => {
    setEditingMemberId('new');
    setFormBadge('');
    setFormRole('');
    // 自动轮换预设颜色，避免每个人都一个颜色
    const nextColor = (members && members.length > 0)
      ? (PRESET_COLORS[members.length % PRESET_COLORS.length]?.color || PRESET_COLORS[0].color)
      : PRESET_COLORS[0].color;
    setFormColor(nextColor);
    setIsEditingMember(true);
  };

  // 开启修改成员表单
  const handleOpenEditMember = (m: MemberItem) => {
    setEditingMemberId(m.id);
    setFormBadge(m.badge || '');
    setFormRole(m.role || '');
    const color = (m?.color && m.color.bg) ? m.color : getMemberColor(m?.badge || '', members);
    setFormColor(color);
    setIsEditingMember(true);
  };

  // 保存成员（新增或编辑）
  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBadge = formBadge.trim();
    const cleanRole = formRole.trim();

    if (!cleanBadge) {
      showToast('请输入1-2个字的标志', true);
      return;
    }
    if (!cleanRole) {
      showToast('请输入称谓关系（如：配偶、外公、阿姨等）', true);
      return;
    }

    if (editingMemberId === 'new') {
      // 检查标志是否已重复
      const exist = members.find((m) => m.badge === cleanBadge);
      if (exist) {
        showToast(`标志“${cleanBadge}”已存在，请换一个单字`, true);
        return;
      }
      const newMember: MemberItem = {
        id: `m_${Date.now()}`,
        badge: cleanBadge.slice(0, 2),
        role: cleanRole,
        color: formColor,
      };
      const updated = [...members, newMember];
      onUpdateMembers(updated);
      showToast(`已成功添加成员 ${cleanRole} (${cleanBadge})`);
    } else {
      // 编辑已有成员
      const updated = members.map((m) =>
        m.id === editingMemberId
          ? { ...m, badge: cleanBadge.slice(0, 2), role: cleanRole, color: formColor }
          : m
      );
      onUpdateMembers(updated);
      showToast(`已更新成员 ${cleanRole} 信息`);
    }

    setIsEditingMember(false);
    setEditingMemberId(null);
  };

  // 删除成员
  const handleDeleteMember = (m: MemberItem) => {
    if (members.length <= 1) {
      showToast('家庭中至少需要保留 1 位成员', true);
      return;
    }

    if (confirm(`确定要删除家庭成员“${m.role} (${m.badge})”吗？\n（历史事项仍会保留其文字标记）`)) {
      const updated = members.filter((item) => item.id !== m.id);
      onUpdateMembers(updated);
      showToast(`已删除成员 ${m.role}`);
    }
  };

  // 1. 微信早报
  const handleSendTodayDigest = async () => {
    setSendingDigest(true);
    const res = await PushPlusService.sendTodayDigest(todos, members);
    setSendingDigest(false);

    if (res.ok) {
      confetti({ particleCount: 30, spread: 50 });
      showToast('未来两周家庭早报已推送到微信！');
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
    StorageService.exportBackup(todos, members);
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
        const freshMembers = StorageService.getMembers();
        onImportSuccess(freshTodos, freshMembers);
        showToast(`成功恢复 ${res.count || 0} 条事项${res.membersCount ? `与 ${res.membersCount} 位成员` : ''}！`);
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
  const getMemberStats = (member: MemberItem) => {
    if (!member || !member.badge) return { active: 0, done: 0, total: 0 };
    const b = member.badge;
    const active = todos.filter((t) => !t.done && (t.members || ['佳']).map((m) => getMemberBadge(m, members)).includes(b)).length;
    const done = todos.filter((t) => t.done && (t.members || ['佳']).map((m) => getMemberBadge(m, members)).includes(b)).length;
    return { active, done, total: active + done };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[88vh]">
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

          <button
            type="button"
            onClick={() => setActiveTab('trash')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition ${
              activeTab === 'trash'
                ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-600" />
            <span>回收站</span>
            {deletedTodos.length > 0 && (
              <span className="text-[9px] bg-zinc-200 text-zinc-700 font-bold px-1.5 py-0.2 rounded-full">
                {deletedTodos.length}
              </span>
            )}
          </button>
        </div>

        {/* 内容展示区 */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: 人员管理 (新增、修改、删除) */}
          {activeTab === 'members' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* 顶部标题与新增按钮 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-900">家庭成员列表</div>
                  <div className="text-[10px] text-zinc-400">共 {members.length} 位 · 点击修改或新增</div>
                </div>

                {!isEditingMember && (
                  <button
                    type="button"
                    onClick={handleOpenAddMember}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-2xs active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增成员</span>
                  </button>
                )}
              </div>

              {/* 新增 / 修改成员表单面板 */}
              {isEditingMember && (
                <form
                  onSubmit={handleSaveMember}
                  className="bg-zinc-50/90 border border-zinc-200/90 rounded-2xl p-4 space-y-3.5 animate-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60">
                    <span className="text-xs font-bold text-zinc-900">
                      {editingMemberId === 'new' ? '新增家庭成员' : '修改成员信息'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingMember(false)}
                      className="text-zinc-400 hover:text-zinc-600 text-xs"
                    >
                      取消
                    </button>
                  </div>

                  {/* 预览徽章与单字输入 */}
                  <div className="flex items-center gap-3">
                    <div
                      style={{ 
                        backgroundColor: formColor?.bg || '#f1f5f9', 
                        color: formColor?.text || '#334155' 
                      }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-2xs shrink-0 transition-colors"
                    >
                      {formBadge.trim() || '字'}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 mb-0.5">
                          标志 (1~2个字)
                        </label>
                        <input
                          type="text"
                          maxLength={2}
                          value={formBadge}
                          onChange={(e) => setFormBadge(e.target.value)}
                          placeholder="例如: 佳、娟、姨、猫"
                          required
                          className="w-full text-xs px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-500 mb-0.5">
                          称谓 / 关系
                        </label>
                        <input
                          type="text"
                          value={formRole}
                          onChange={(e) => setFormRole(e.target.value)}
                          placeholder="例如: 我、配偶、阿姨、外婆"
                          required
                          className="w-full text-xs px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:outline-hidden focus:border-zinc-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 专属调色盘 */}
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1.5">
                      选择手帐专属色
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((item, idx) => {
                        const isSelected = formColor?.dot === item.color.dot;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setFormColor(item.color)}
                            title={item.name}
                            style={{ backgroundColor: item.color.dot }}
                            className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                              isSelected
                                ? 'scale-115 ring-2 ring-zinc-900 ring-offset-2'
                                : 'hover:scale-110 opacity-80 hover:opacity-100'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingMember(false)}
                      className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-200/60 rounded-xl transition"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                    >
                      保存成员
                    </button>
                  </div>
                </form>
              )}

              {/* 成员列表卡片 */}
              <div className="grid grid-cols-1 gap-2">
                {members.map((m, idx) => {
                  const stats = getMemberStats(m);
                  const mColor = (m?.color && m.color.bg) ? m.color : getMemberColor(m?.badge || '', members);
                  const badge = m?.badge || '佳';
                  const role = m?.role || '家人';
                  return (
                    <div
                      key={m.id || `m_${idx}`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          style={{ backgroundColor: mColor.bg, color: mColor.text }}
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-2xs shrink-0"
                        >
                          {badge}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                            <span>{role}</span>
                            <span className="text-[11px] text-zinc-400 font-normal">({badge})</span>
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {stats.active > 0 ? (
                              <span className="text-zinc-600 font-medium">{stats.active} 项进行中待办</span>
                            ) : (
                              <span>暂无待办事项</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 卡片右侧：操作按钮 */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMember(m)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition"
                          title="修改成员信息"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(m)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="删除成员"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
                💡 <b>温馨提示：</b>新增或修改成员后，日历圆点、记事弹窗多选胶囊与待办徽章将全自动同步适配。
              </div>
            </div>
          )}

          {/* TAB 2: 微信早报与提醒 */}
          {activeTab === 'wechat' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* 今日/两周家庭早报卡片 */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-100" />
                    <div>
                      <h4 className="text-xs font-bold text-white">家庭事务晨报（未来两周日程）</h4>
                      <p className="text-[11px] text-orange-100/90">汇总逾期未办、今日需办与接下来两周日程，手帐精美排版</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendTodayDigest}
                    disabled={sendingDigest}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-orange-50 text-orange-900 font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-orange-600" />
                    <span>{sendingDigest ? '正在推送到微信...' : '🚀 立即发送两周早报'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="py-2 px-3 rounded-xl bg-black/20 hover:bg-black/30 text-white font-medium text-xs transition flex items-center justify-center gap-1 active:scale-98"
                    title="在网页中预览微信推送排版"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>预览排版</span>
                  </button>
                </div>
              </div>

              {/* 每日 08:00 定时任务自动化托管 */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>每日 08:00 定时自动推送 (云端托管)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    已生效
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed">
                  已配置 Vercel Cron 与 GitHub Actions 双通道定时引擎。无需保持网页开启，每天北京时间早晨 8:00 自动读取云端最新日程，将整理好的两周手帐早报准时送达您的微信！
                </p>
              </div>

              {/* 微信推送通道 */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700">PushPlus 微信推送通道</span>
                  <span className="text-[10px] bg-zinc-200 text-zinc-700 font-semibold px-2 py-0.5 rounded-full">
                    内置托管
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  已内置托管你的专属 Token，所有事项单发与两周早报均直通微信公众号与模板卡片。
                </p>

                <button
                  type="button"
                  onClick={handleTestWechat}
                  disabled={testingWechat}
                  className="w-full py-2 px-3 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-xl transition"
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
                  const res = await SyncService.fetchCloudData();
                  if (res.success && res.data) {
                    const mergedTodos = SyncService.mergeTodos(todos, res.data.todos);
                    StorageService.saveTodos(mergedTodos);

                    let mergedMembers = members;
                    if (res.data.members && res.data.members.length > 0) {
                      mergedMembers = SyncService.mergeMembers(members, res.data.members);
                      StorageService.saveMembers(mergedMembers);
                      onUpdateMembers(mergedMembers);
                    }

                    onImportSuccess(mergedTodos, mergedMembers);
                    showToast(`云端同步成功，共 ${mergedTodos.length} 条事项`);
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
                  <span className="font-bold text-zinc-900">{todos.length} 条事项 · {members.length} 位成员</span>
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

          {/* TAB 4: 防误删回收站（可随时一键还原） */}
          {activeTab === 'trash' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              {/* 顶部统计与清空操作栏 */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <div className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                    <span>防误删回收站</span>
                    {deletedTodos.length > 0 && (
                      <span className="text-[10px] bg-zinc-200/80 text-zinc-700 px-1.5 py-0.2 rounded-full font-bold">
                        {deletedTodos.length}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    平时删除的事项自动暂存，随时可一键还原
                  </div>
                </div>

                {deletedTodos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`确定要清空回收站全部 ${deletedTodos.length} 条已删事项吗？\n清空后将无法再次找回。`)) {
                        onClearRecycleBin();
                        showToast('已清空回收站');
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition"
                  >
                    清空回收站
                  </button>
                )}
              </div>

              {/* 回收站为空时的友好提示 */}
              {deletedTodos.length === 0 ? (
                <div className="py-12 text-center space-y-2.5 bg-zinc-50/70 rounded-2xl border border-dashed border-zinc-200">
                  <div className="w-10 h-10 rounded-full bg-white text-zinc-400 flex items-center justify-center mx-auto shadow-2xs">
                    <RotateCcw className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="text-xs font-semibold text-zinc-700">回收站空空如也</div>
                  <p className="text-[11px] text-zinc-400 max-w-xs mx-auto px-4 leading-relaxed">
                    在待办清单或日历中误删的任何事项，都会安全存放在这里，随时可以一键恢复~
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
                  {deletedTodos.map((item) => {
                    const dateInfo = formatTodoDateRange(item.date, item.endDate);
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-white border border-zinc-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-zinc-300 transition"
                      >
                        {/* 事项信息 */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-medium text-zinc-800 truncate">
                            {item.title}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 flex-wrap">
                            {/* 关联成员徽章 */}
                            <div className="flex items-center gap-1">
                              {(item.members || ['佳']).map((rawMem) => {
                                const badge = getMemberBadge(rawMem, members);
                                const color = getMemberColor(rawMem, members);
                                return (
                                  <span
                                    key={rawMem}
                                    style={{ backgroundColor: color.bg, color: color.text }}
                                    className="px-1.5 py-0.2 rounded font-bold text-[9px] shadow-2xs"
                                  >
                                    {badge}
                                  </span>
                                );
                              })}
                            </div>

                            <span>·</span>
                            <span>原定: {dateInfo.label}</span>
                            <span>·</span>
                            <span className="text-zinc-400">{formatRelativeTime(item.deletedAt)}</span>
                          </div>
                        </div>

                        {/* 右侧：还原与彻底删除 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onRestoreTodo(item);
                              showToast(`已成功还原【${item.title}】`);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition shadow-2xs active:scale-95"
                            title="恢复到待办列表"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-400" />
                            <span>还原</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`确定要彻底删除“${item.title}”吗？此操作无法撤销。`)) {
                                onPermanentDelete(item.id);
                                showToast('已彻底删除');
                              }
                            }}
                            className="p-1.5 text-zinc-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="彻底删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
                🛡️ <b>防误删机制已生效：</b>被删除的事项会保留原有的时间段、已完成状态以及所属家庭成员信息，还原后即可直接在待办与日历中照常显示。
              </div>
            </div>
          )}
        </div>

        {/* 底部版权/提示 */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-400 text-center flex items-center justify-between">
          <span>亲邻记事 · 家庭事务中心</span>
          <span className="text-[10px] text-zinc-400">v1.4 两周定时早报版</span>
        </div>
      </div>

      {/* 微信排版效果真机预览浮层 */}
      {showPreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-zinc-300 flex flex-col h-[85vh] animate-in zoom-in-95 duration-150">
            {/* 模拟微信导航栏 */}
            <div className="bg-[#ededed] px-4 py-3 flex items-center justify-between border-b border-zinc-200">
              <span className="text-xs font-semibold text-zinc-800">微信推送效果预览 (PushPlus)</span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-zinc-500 hover:text-zinc-800 p-1 rounded-full hover:bg-zinc-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 真实 HTML 预览 iframe */}
            <iframe
              title="Digest Preview"
              srcDoc={PushPlusService.getDigestPreviewHtml(todos, members)}
              className="flex-1 w-full border-none bg-[#f7f6f2]"
            />

            {/* 底部操作 */}
            <div className="p-3 bg-white border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">这就是在微信中打开阅读的效果</span>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-1.5 bg-zinc-900 text-white text-xs font-medium rounded-xl hover:bg-zinc-800 transition"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
