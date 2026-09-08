import React, { useState, useMemo } from 'react';
import { TodoItem } from '../../types';
import { MEMBER_COLORS } from '../../constants/initialData';
import { formatHumanDate, getDateRangeDays, formatTodoDateRange } from '../../utils/dateUtils';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Check, Circle, Trash2, Bell, Calendar as CalendarIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CalendarViewProps {
  todos: TodoItem[];
  onSelectDate: (dateStr: string) => void;
  onSelectEvent: (item: TodoItem) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
  onSendWechat: (item: TodoItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  todos,
  onSelectDate,
  onSelectEvent,
  onToggleStatus,
  onDelete,
  onSendWechat,
}) => {
  // 当前浏览的年月
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // 当前选中的日期（默认今天）
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // 计算当前月份的日历网格天数（从周一开始）
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // 按日期建立映射，支持单日与连续多天时间段（每天均显示对应事项）
  const todosByDate = useMemo(() => {
    const map: Record<string, TodoItem[]> = {};
    todos.forEach((t) => {
      const daysInRange = getDateRangeDays(t.date, t.endDate);
      daysInRange.forEach((dayStr) => {
        if (!map[dayStr]) map[dayStr] = [];
        // 避免重复
        if (!map[dayStr].some((item) => item.id === t.id)) {
          map[dayStr].push(t);
        }
      });
    });
    return map;
  }, [todos]);

  // 当前选中日期的事项列表
  const selectedDayTodos = todosByDate[selectedDate] || [];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(format(now, 'yyyy-MM-dd'));
  };

  const handleCheck = (e: React.MouseEvent, item: TodoItem) => {
    e.stopPropagation();
    if (!item.done) {
      confetti({ particleCount: 20, spread: 40 });
    }
    onToggleStatus(item.id);
  };

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* 1. 移动端/全端统一的极简手帐日历主体卡片 */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs">
        {/* 月份导航栏 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900">
              {format(currentMonth, 'yyyy年 M月')}
            </h2>
            <button
              type="button"
              onClick={handleToday}
              className="text-xs px-2 py-0.5 rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
            >
              今天
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition"
              title="上个月"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition"
              title="下个月"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 星期行 */}
        <div className="grid grid-cols-7 text-center mb-1">
          {weekdays.map((w, idx) => (
            <div
              key={w}
              className={`text-[11px] font-medium py-1.5 ${
                idx >= 5 ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日期数字网格（告别拥挤文字，采用精致小圆点标记） */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {days.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTodos = todosByDate[dateKey] || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate === dateKey;
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl cursor-pointer transition select-none ${
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-xs font-semibold scale-102'
                    : 'hover:bg-zinc-100'
                }`}
              >
                {/* 日期数字 */}
                <span
                  className={`text-xs ${
                    !isCurrentMonth
                      ? isSelected
                        ? 'text-zinc-300'
                        : 'text-zinc-300'
                      : isSelected
                      ? 'text-white font-bold'
                      : isCurrentDay
                      ? 'text-zinc-900 font-bold underline underline-offset-4 decoration-2 decoration-amber-500'
                      : 'text-zinc-700'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {/* 事项小圆点（彻底解决文字拥挤问题） */}
                <div className="h-1.5 flex items-center justify-center gap-0.5 mt-0.5">
                  {dayTodos.slice(0, 3).map((t, idx) => {
                    const firstMember = t.members?.[0] || '我';
                    const color = MEMBER_COLORS[firstMember]?.dot || '#71717a';
                    return (
                      <span
                        key={idx}
                        style={{ backgroundColor: isSelected ? '#ffffff' : color }}
                        className={`w-1 h-1 rounded-full ${t.done ? 'opacity-40' : ''}`}
                      />
                    );
                  })}
                  {dayTodos.length > 3 && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-zinc-400'
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 选中日期的当日事项详情清单（大字呈现、完整操作、绝不挤压） */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">
              {formatHumanDate(selectedDate).label}
              <span className="text-xs font-normal text-zinc-400 ml-1.5">
                ({selectedDate})
              </span>
            </h3>
          </div>

          <button
            type="button"
            onClick={() => onSelectDate(selectedDate)}
            className="flex items-center gap-1 text-xs font-medium text-zinc-800 hover:text-black bg-zinc-100 hover:bg-zinc-200/80 px-2.5 py-1 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>记在这天</span>
          </button>
        </div>

        {/* 事项条目 */}
        {selectedDayTodos.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            当天暂无安排的家庭事务
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayTodos.map((item) => {
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectEvent(item)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    item.done
                      ? 'bg-zinc-50 border-zinc-200/50 opacity-60'
                      : 'bg-white border-zinc-200 hover:border-zinc-400 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => handleCheck(e, item)}
                      className="text-zinc-300 hover:text-zinc-800 transition shrink-0"
                    >
                      {item.done ? (
                        <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className={`text-sm font-medium truncate ${
                          item.done ? 'line-through text-zinc-400' : 'text-zinc-800'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.endDate && item.endDate > item.date && (
                        <span className="text-[10px] text-zinc-400 font-normal mt-0.5">
                          🗓️ 连续跨期 ({item.date.slice(5)} ~ {item.endDate.slice(5)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      {(item.members || ['我']).map((mem) => {
                        const color = MEMBER_COLORS[mem] || { bg: '#f4f4f5', text: '#52525b' };
                        return (
                          <span
                            key={mem}
                            style={{ backgroundColor: color.bg, color: color.text }}
                            className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
                          >
                            {mem}
                          </span>
                        );
                      })}
                    </div>

                    {!item.done && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendWechat(item);
                        }}
                        className="p-1.5 text-zinc-300 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                        title="发送微信通知"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      className="p-1.5 text-zinc-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="删除事项"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
