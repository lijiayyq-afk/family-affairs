import React, { useRef } from 'react';
import { TodoItem } from '../../types';
import { StorageService } from '../../services/storageService';
import { SyncService } from '../../services/syncService';
import { X, Download, Upload, ShieldCheck, Database, Cloud, RefreshCw } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoItem[];
  onImportSuccess: (todos: TodoItem[]) => void;
  showToast: (text: string, error?: boolean) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  todos,
  onImportSuccess,
  showToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 导出备份
  const handleExport = () => {
    StorageService.exportBackup(todos);
    showToast('备份文件已下载到本地！');
  };

  // 导入恢复
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
        onClose();
      } else {
        showToast(res.error || '导入失败，文件格式不正确', true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-700" />
            <span className="font-semibold text-sm text-zinc-900">数据与备份</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-4">
          {/* 云端跨设备实时同步卡片 */}
          <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 flex items-start gap-3">
            <Cloud className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs text-sky-950 space-y-1">
              <div className="font-semibold flex items-center justify-between">
                <span>跨设备多端云同步</span>
                <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-normal">实时互通</span>
              </div>
              <p className="text-sky-800/90 leading-relaxed">
                手机与电脑自动实时同步，所有数据加密存放在云端仓库中，换设备或更新版本永久不丢数据。
              </p>
            </div>
          </div>

          {/* 本地与云端备份卡片 */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <div className="font-semibold">双重存储保障</div>
              <p className="text-emerald-700/90 leading-relaxed">
                同时保留本地永久数据库与云端数据库，断网也能看，联网自动同步。
              </p>
            </div>
          </div>

          {/* 当前事项数量 */}
          <div className="flex items-center justify-between text-xs text-zinc-600 bg-zinc-50 px-3.5 py-2.5 rounded-xl border border-zinc-100">
            <span>当前已保存事项</span>
            <span className="font-bold text-zinc-900">{todos.length} 条</span>
          </div>

          {/* 操作按钮组 */}
          <div className="space-y-2 pt-1">
            {/* 手动从云端重新拉取 */}
            <button
              type="button"
              onClick={async () => {
                showToast('正在从云端拉取最新数据...');
                const res = await SyncService.fetchCloudTodos();
                if (res.success && res.data) {
                  const merged = SyncService.mergeTodos(todos, res.data);
                  StorageService.saveTodos(merged);
                  onImportSuccess(merged);
                  showToast(`云端同步完成，共 ${merged.length} 条事项`);
                } else {
                  showToast(res.error || '云端同步失败', true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100/80 rounded-xl transition active:scale-98"
            >
              <RefreshCw className="w-4 h-4 text-sky-600" />
              <span>从云端立即拉取最新数据</span>
            </button>

            {/* 导出 */}
            <button
              type="button"
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition active:scale-98"
            >
              <Download className="w-4 h-4 text-zinc-600" />
              <span>导出 JSON 文件备份到本地</span>
            </button>

            {/* 导入 */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition active:scale-98"
            >
              <Upload className="w-4 h-4 text-zinc-600" />
              <span>从本地文件恢复数据</span>
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

        {/* 底部 */}
        <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-400 text-center">
          手机电脑打开同一网址即可自动跨设备同步
        </div>
      </div>
    </div>
  );
};
