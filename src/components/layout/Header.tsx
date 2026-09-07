import React from 'react';
import { Plus, Sparkles, Bell, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onOpenCreateModal: () => void;
  onOpenDigestModal: () => void;
  todayCount: number;
  overdueCount: number;
  completedTodayCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreateModal,
  onOpenDigestModal,
  todayCount,
  overdueCount,
  completedTodayCount,
}) => {
  const todayStr = new Date().toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* 左侧：Logo 与 日期概况 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl shadow-md shrink-0">
            🏡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                亲邻记事 · 家庭事务看板
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                <CalendarIcon className="w-3 h-3" />
                {todayStr}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>今日需办 <b className="text-slate-800">{todayCount}</b></span>
              {overdueCount > 0 && (
                <span className="text-red-600 font-semibold flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  逾期 {overdueCount}
                </span>
              )}
              {completedTodayCount > 0 && (
                <span className="text-emerald-600 flex items-center gap-0.5 hidden sm:inline-flex">
                  <CheckCircle2 className="w-3 h-3" />
                  今日已办 {completedTodayCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 早报按钮 */}
          <button
            type="button"
            onClick={onOpenDigestModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl shadow-2xs transition active:scale-95"
            title="查看并推送今日家庭微信早报"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">今日早报</span>
            <span className="sm:hidden">早报</span>
          </button>

          {/* 记一笔主按钮 */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>记一笔</span>
          </button>
        </div>
      </div>
    </header>
  );
};
