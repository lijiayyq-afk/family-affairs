import { Member, AffairItem, PushPlusConfig } from '../types';

export const CATEGORIES = [
  '去医院',
  '家庭缴费',
  '买家里东西',
  '孩子教育',
  '生活杂事',
] as const;

export const INITIAL_MEMBERS: Member[] = [
  { id: 'me', name: '我', relation: '自己', color: '#2563eb', avatarType: 'emoji', avatarValue: '👨' },
  { id: 'spouse', name: '我的配偶', relation: '爱人', color: '#db2777', avatarType: 'emoji', avatarValue: '👩' },
  { id: 'younger', name: '小宝', relation: '二宝', color: '#ea580c', avatarType: 'emoji', avatarValue: '👶' },
  { id: 'elder', name: '大宝', relation: '大宝', color: '#059669', avatarType: 'emoji', avatarValue: '👦' },
  { id: 'grandpa', name: '爷爷', relation: '长辈', color: '#4f46e5', avatarType: 'emoji', avatarValue: '👴' },
  { id: 'grandma', name: '奶奶', relation: '长辈', color: '#b45309', avatarType: 'emoji', avatarValue: '👵' },
  { id: 'family', name: '全家公用', relation: '公共', color: '#7c3aed', avatarType: 'emoji', avatarValue: '🏡' },
];

export const getInitialAffairs = (): AffairItem[] => {
  const getOffsetDate = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: 'affair-1',
      title: '陪爷爷去医院开降压药与心血管复查',
      note: '带医保卡、近期血压记录本，华山医院门诊',
      memberId: 'grandpa',
      category: '去医院',
      date: getOffsetDate(0), // 今天
      priority: 'urgent',
      recurring: 'monthly',
      remindWechat: true,
      done: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'affair-2',
      title: '缴纳本月水电气与物业管理费',
      note: '国家电网与微信生活缴费',
      memberId: 'me',
      category: '家庭缴费',
      date: getOffsetDate(1), // 明天
      priority: 'normal',
      recurring: 'monthly',
      remindWechat: false,
      done: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'affair-3',
      title: '买家里的日用消耗品与小宝拉拉裤',
      note: '抽纸2箱、全脂鲜奶、小宝L号拉拉裤',
      memberId: 'spouse',
      category: '买家里东西',
      date: getOffsetDate(0), // 今天
      priority: 'normal',
      recurring: 'none',
      remindWechat: false,
      done: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'affair-4',
      title: '大宝周末围棋考级集训班接送',
      note: '少年宫203室，带好水壶',
      memberId: 'elder',
      category: '孩子教育',
      date: getOffsetDate(3),
      priority: 'normal',
      recurring: 'weekly',
      remindWechat: true,
      done: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'affair-5',
      title: '小宝社区卫生中心疫苗接种',
      note: '带绿色接种本',
      memberId: 'younger',
      category: '去医院',
      date: getOffsetDate(4),
      priority: 'urgent',
      recurring: 'none',
      remindWechat: true,
      done: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'affair-6',
      title: '预约奶奶年度健康体检',
      note: '前一日晚8点后空腹',
      memberId: 'grandma',
      category: '去医院',
      date: getOffsetDate(7),
      priority: 'normal',
      recurring: 'yearly',
      remindWechat: false,
      done: false,
      createdAt: new Date().toISOString(),
    },
  ];
};

export const INITIAL_PUSHPLUS: PushPlusConfig = {
  token: '',
};
