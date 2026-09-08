import { differenceInCalendarDays, parseISO, addDays, addMonths, addYears, format, eachDayOfInterval } from 'date-fns';

/**
 * 自然人说话般的日期描述：如“今天”、“明天”、“已逾期 2 天”、“周四 9月10日”
 */
export function formatHumanDate(dateStr: string): { label: string; isOverdue: boolean; isToday: boolean } {
  if (!dateStr) return { label: '', isOverdue: false, isToday: false };

  try {
    const target = parseISO(dateStr);
    const today = new Date();
    const diffDays = differenceInCalendarDays(target, today);

    if (diffDays === 0) {
      return { label: '今天', isOverdue: false, isToday: true };
    }
    if (diffDays === 1) {
      return { label: '明天', isOverdue: false, isToday: false };
    }
    if (diffDays === 2) {
      return { label: '后天', isOverdue: false, isToday: false };
    }
    if (diffDays < 0) {
      return { label: `逾期 ${Math.abs(diffDays)} 天`, isOverdue: true, isToday: false };
    }

    // 周几中文化
    const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdayMap[target.getDay()];
    const monthDay = format(target, 'M月d日');

    return { label: `${weekday} (${monthDay})`, isOverdue: false, isToday: false };
  } catch {
    return { label: dateStr, isOverdue: false, isToday: false };
  }
}

/**
 * 获取日期时间段内的所有日期列表 [start, ... , end]
 */
export function getDateRangeDays(startDateStr: string, endDateStr?: string): string[] {
  if (!startDateStr) return [];
  if (!endDateStr || endDateStr === startDateStr) return [startDateStr];

  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    if (end < start) return [startDateStr];

    const days = eachDayOfInterval({ start, end });
    return days.map((d) => format(d, 'yyyy-MM-dd'));
  } catch {
    return [startDateStr];
  }
}

/**
 * 格式化待办事项的日期或时间段展示
 */
export function formatTodoDateRange(startDateStr: string, endDateStr?: string): {
  label: string;
  isOverdue: boolean;
  isToday: boolean;
  isRange: boolean;
  totalDays: number;
} {
  if (!startDateStr) {
    return { label: '', isOverdue: false, isToday: false, isRange: false, totalDays: 1 };
  }

  // 单日模式
  if (!endDateStr || endDateStr === startDateStr) {
    const single = formatHumanDate(startDateStr);
    return { ...single, isRange: false, totalDays: 1 };
  }

  try {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const isOverdue = format(end, 'yyyy-MM-dd') < todayStr;
    const isOngoingToday = startDateStr <= todayStr && todayStr <= endDateStr;

    const startLabel = format(start, 'M月d日');
    const endLabel = format(end, 'M月d日');

    if (isOverdue) {
      const diffDays = Math.abs(differenceInCalendarDays(end, today));
      return {
        label: `逾期 ${diffDays} 天 (${startLabel} ~ ${endLabel})`,
        isOverdue: true,
        isToday: false,
        isRange: true,
        totalDays,
      };
    }

    if (isOngoingToday) {
      const currentDayIndex = differenceInCalendarDays(today, start) + 1;
      return {
        label: `进行中 · 第${currentDayIndex}天/共${totalDays}天 (至${endLabel})`,
        isOverdue: false,
        isToday: true,
        isRange: true,
        totalDays,
      };
    }

    // 未来的多天
    return {
      label: `${startLabel} ~ ${endLabel} (共${totalDays}天)`,
      isOverdue: false,
      isToday: false,
      isRange: true,
      totalDays,
    };
  } catch {
    return { label: `${startDateStr} ~ ${endDateStr}`, isOverdue: false, isToday: false, isRange: true, totalDays: 1 };
  }
}

/**
 * 周期性事务自动滚动到下一个日期
 */
export function getNextRecurringDate(dateStr: string, recurring: 'none' | 'weekly' | 'monthly' | 'yearly'): string {
  if (recurring === 'none') return dateStr;

  try {
    const d = parseISO(dateStr);
    let next = d;

    if (recurring === 'weekly') {
      next = addDays(d, 7);
    } else if (recurring === 'monthly') {
      next = addMonths(d, 1);
    } else if (recurring === 'yearly') {
      next = addYears(d, 1);
    }

    return format(next, 'yyyy-MM-dd');
  } catch {
    return dateStr;
  }
}

/**
 * 获取今天 YYYY-MM-DD
 */
export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

