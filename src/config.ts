/**
 * 家庭事务系统全局配置
 * PushPlus 微信推送 Token：
 * 1. 优先读取 Vercel / 部署环境变量 VITE_PUSHPLUS_TOKEN
 * 2. 默认使用内置的专属 Token，全端免密自动生效
 */
export const APP_CONFIG = {
  PUSHPLUS_TOKEN: (import.meta as any).env?.VITE_PUSHPLUS_TOKEN || '033a9f6a4ccf4c47ba595de163d37c14',
};
