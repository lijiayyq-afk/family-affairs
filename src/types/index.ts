// 预置 6 位核心家庭成员
export const MEMBERS = ['我', '配偶', '小宝', '大宝', '爷爷', '奶奶'] as const;
export type FamilyMember = typeof MEMBERS[number];

// 核心待办事项（支持关联多个人、单日或跨多天时间段）
export interface TodoItem {
  id: string;
  title: string;
  members: FamilyMember[]; // 支持关联多个人（多选）
  date: string;            // 开始日期：YYYY-MM-DD
  endDate?: string;        // 连续多天时的结束日期：YYYY-MM-DD (可选)
  done: boolean;
  remindWechat?: boolean;
  createdAt: string;
}

// 主视图：待办列表 | 日历视图
export type ActiveTab = 'todos' | 'calendar';
