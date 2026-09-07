import { describe, it, expect } from 'vitest';
import { formatHumanDate } from '../dateUtils';
import { addDays, format } from 'date-fns';

describe('日期格式化测试', () => {
  it('能正确识别今天与明天', () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const pastStr = '2020-01-01';

    expect(formatHumanDate(todayStr).label).toBe('今天');
    expect(formatHumanDate(tomorrowStr).label).toBe('明天');
    expect(formatHumanDate(pastStr).isOverdue).toBe(true);
  });
});
