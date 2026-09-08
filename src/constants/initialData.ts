import { TodoItem, FamilyMember } from '../types';
import { format, addDays } from 'date-fns';

export const MEMBER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  佳: { bg: '#f1f5f9', text: '#334155', dot: '#475569' },
  我: { bg: '#f1f5f9', text: '#334155', dot: '#475569' },
  娟: { bg: '#fdf2f8', text: '#9d174d', dot: '#db2777' },
  配偶: { bg: '#fdf2f8', text: '#9d174d', dot: '#db2777' },
  线: { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' },
  小宝: { bg: '#fff7ed', text: '#9a3412', dot: '#ea580c' },
  笑: { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
  大宝: { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
  爷: { bg: '#eef2ff', text: '#3730a3', dot: '#4f46e5' },
  爷爷: { bg: '#eef2ff', text: '#3730a3', dot: '#4f46e5' },
  奶: { bg: '#fefce8', text: '#854d0e', dot: '#ca8a04' },
  奶奶: { bg: '#fefce8', text: '#854d0e', dot: '#ca8a04' },
};

export const getInitialTodos = (): TodoItem[] => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  return [
    {
      id: '1',
      title: '陪爷爷去医院配慢病药',
      members: ['佳', '爷'], // 支持多成员
      date: today,
      done: false,
      remindWechat: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: '交家里水电气费',
      members: ['佳'],
      date: tomorrow,
      done: false,
      remindWechat: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: '买家里的米面油和抽纸',
      members: ['佳', '娟'], // 支持多成员
      date: today,
      done: false,
      remindWechat: false,
      createdAt: new Date().toISOString(),
    },
  ];
};

