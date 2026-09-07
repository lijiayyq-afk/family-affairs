import { TodoItem, PushPlusConfig, FamilyMember } from '../types';
import { format, addDays } from 'date-fns';

export const MEMBER_COLORS: Record<FamilyMember, { bg: string; text: string; dot: string }> = {
  我: { bg: '#f1f5f9', text: '#334155', dot: '#475569' },
  配偶: { bg: '#fdf2f8', text: '#9d174d', dot: '#db2777' },
  小宝: { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' },
  大宝: { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
  爷爷: { bg: '#eef2ff', text: '#3730a3', dot: '#4f46e5' },
  奶奶: { bg: '#fefce8', text: '#854d0e', dot: '#ca8a04' },
};

export const getInitialTodos = (): TodoItem[] => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return [
    {
      id: '1',
      title: '去医院给爷爷配慢病药',
      member: '爷爷',
      date: today,
      done: false,
      remindWechat: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: '交家里水电气费',
      member: '我',
      date: tomorrow,
      done: false,
      remindWechat: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: '买家里的米面油和抽纸',
      member: '配偶',
      date: today,
      done: false,
      remindWechat: false,
      createdAt: new Date().toISOString(),
    },
  ];
};

export const INITIAL_PUSHPLUS: PushPlusConfig = {
  token: '',
};
