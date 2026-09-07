import { describe, it, expect } from 'vitest';
import { getNextRecurringDate, formatHumanDate } from '../dateUtils';
import { addDays, format } from 'date-fns';

describe('极简日期与周期性规则测试', () => {
  it('应当正确计算下周的重复日期', () => {
    const current = '2026-09-07';
    const next = getNextRecurringDate(current, 'weekly');
    expect(next).toBe('2026-09-14');
  });

  it('应当正确计算下个月的重复日期', () => {
    const current = '2026-09-07';
    const next = getNextRecurringDate(current, 'monthly');
    expect(next).toBe('2026-10-07');
  });

  it('当重复规则为 none 时应保持原日期', () => {
    const current = '2026-09-07';
    const next = getNextRecurringDate(current, 'none');
    expect(next).toBe(current);
  });

  it('能正确识别人性化自然日期（今天、明天、逾期）', () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const pastStr = '2020-01-01';

    expect(formatHumanDate(todayStr).label).toBe('今天');
    expect(formatHumanDate(tomorrowStr).label).toBe('明天');
    expect(formatHumanDate(pastStr).isOverdue).toBe(true);
  });
});
