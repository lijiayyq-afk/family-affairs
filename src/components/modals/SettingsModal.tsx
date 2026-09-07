import React, { useState } from 'react';
import { PushPlusConfig } from '../../types';
import { PushPlusService } from '../../services/pushPlusService';
import { StorageService } from '../../services/storageService';
import { X, Bell, ExternalLink, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PushPlusConfig;
  onSaveConfig: (config: PushPlusConfig) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetData,
}) => {
  if (!isOpen) return null;

  const [token, setToken] = useState(config.token);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-zinc-200">
        <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">设置与微信提醒</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* PushPlus 设置 */}
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-700 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-zinc-800" />
                PushPlus 微信通知 Token
              </label>
              <a
                href="https://www.pushplus.plus"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-400 hover:text-zinc-800 flex items-center gap-0.5"
              >
                获取 Token <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            {hasEnvToken && (
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                已通过 Vercel 环境变量配置，全端免密自动生效中。
              </div>
            )}

            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="输入 Token 即可绑定微信提醒"
              className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-zinc-50 focus:bg-white focus:outline-hidden focus:border-zinc-900 transition"
            />

            {testMsg && (
              <div
                className={`p-2 rounded-lg ${
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
                className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition"
              >
                {testing ? '发送中...' : '测试微信通知'}
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg shadow-xs transition"
              >
                保存
              </button>
            </div>
          </form>

          {/* 清理与重置样例 */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-zinc-400">数据管理</span>
            <button
              type="button"
              onClick={() => {
                if (confirm('确定要清空并重置为初始状态吗？')) {
                  onResetData();
                  onClose();
                }
              }}
              className="flex items-center gap-1 text-rose-600 hover:text-rose-700"
            >
              <RefreshCw className="w-3 h-3" />
              <span>清空重置数据</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
