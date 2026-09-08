import React, { useRef } from 'react';
import { TodoItem } from '../../types';
import { StorageService } from '../../services/storageService';
import { X, Download, Upload, ShieldCheck, Database } from 'lucide-react';

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
          {/* 数据存储说明卡片 */}
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 space-y-1">
              <div className="font-semibold">本地永久安全存储</div>
              <p className="text-emerald-700/90 leading-relaxed">
                你的家庭数据保存在当前浏览器的永久本地数据库中，后续功能升级已锁定主键，绝不会被覆盖重置。
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
            {/* 导出 */}
            <button
              type="button"
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200/80 rounded-xl transition active:scale-98"
            >
              <Download className="w-4 h-4 text-zinc-600" />
              <span>导出 JSON 数据备份到本地</span>
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
          换手机或换电脑时，可导出备份后在另一端导入恢复
        </div>
      </div>
    </div>
  );
};
