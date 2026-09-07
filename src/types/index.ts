// 预置 6 位核心家庭成员
export const MEMBERS = ['我', '配偶', '小宝', '大宝', '爷爷', '奶奶'] as const;
export type FamilyMember = typeof MEMBERS[number];

// 极简待办事项（无冗余周期、无冗余分类，只有纯粹的生活待办）
export interface TodoItem {
  id: string;
  title: string;
  member: FamilyMember;
  date: string; // YYYY-MM-DD
  done: boolean;
  remindWechat?: boolean;
  createdAt: string;
}

// PushPlus 微信推送配置
export interface PushPlusConfig {
  token: string;
}

// 主视图：待办列表 | 日历视图
export type ActiveTab = 'todos' | 'calendar';
