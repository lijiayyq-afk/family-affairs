import React, { useState, useRef } from 'react';
import { PushPlusConfig } from '../../types';
import { PushPlusService } from '../../services/pushPlusService';
import { StorageService } from '../../services/storageService';
import { X, Download, Upload, Shield, Bell, Check, ExternalLink, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PushPlusConfig;
  onSaveConfig: (config: PushPlusConfig) => void;
  onReloadData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onReloadData,
}) => {
  if (!isOpen) return null;

  const [token, setToken] = useState(config.token);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasEnvToken = Boolean((import.meta as any).env?.VITE_PUSHPLUS_TOKEN);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({ token: token.trim() });
    setTestMsg({ ok: true, text: '已保存 Token' });
    setTimeout(() => setTestMsg(null), 2500);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg(null);
    const res = await PushPlusService.send(
      token,
      '【家庭事务】微信通道测试',
      '<p>恭喜！你的 PushPlus 微信通知通道已成功接入家庭事务看板。</p>'
    );
    setTesting(false);
    setTestMsg({ ok: res.ok, text: res.msg });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (StorageService.importBackup(text)) {
        alert('数据恢复成功！');
        onReloadData();
        onClose();
      } else {
        alert('导入失败，请检查文件格式。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-stone-200/80">
        <div className="px-5 py-4 flex items-center justify-between border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-800">设置与微信提醒</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm">
          {/* PushPlus 设置 */}
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-emerald-600" />
                PushPlus 微信通知 Token
              </label>
              <a
                href="https://www.pushplus.plus"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-0.5"
              >
                获取 Token <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {hasEnvToken ? (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>已在 Vercel 环境变量中安全托管，全家人在任何设备打开均免输免配置！</span>
              </div>
            ) : (
              <div className="text-[11px] text-stone-500">
                💡 提示：在 Vercel 环境变量设置 <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-700">PUSHPLUS_TOKEN</code> 后，所有电脑和手机端都能免配置安全推送。
              </div>
            )}

            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasEnvToken ? "（已由云端环境变量托管，无需输入）" : "输入 Token 或在 Vercel 环境变量中配置"}
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:outline-hidden focus:border-stone-800"
            />

            {testMsg && (
              <div
                className={`text-xs p-2 rounded-lg ${
                  testMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {testMsg.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg border border-stone-200"
              >
                {testing ? '发送中...' : '测试微信通知'}
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-xs"
              >
                保存
              </button>
            </div>
          </form>

          {/* 数据备份 */}
          <div className="pt-4 border-t border-stone-100 space-y-2.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              数据备份与恢复
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => StorageService.exportBackup()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl"
              >
                <Download className="w-3.5 h-3.5 text-stone-500" />
                导出数据
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl"
              >
                <Upload className="w-3.5 h-3.5 text-stone-500" />
                导入备份
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
