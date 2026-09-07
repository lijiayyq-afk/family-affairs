import { differenceInCalendarDays, parseISO, addDays, addMonths, addYears, format } from 'date-fns';

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
