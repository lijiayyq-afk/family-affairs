/**
 * 家庭事务系统全局配置
 * PushPlus 微信推送 Token：
 * 1. 优先读取 Vercel / 部署环境变量 VITE_PUSHPLUS_TOKEN
 * 2. 也可直接在此处写入你的 Token，全端免密自动生效
 */
export const APP_CONFIG = {
  // 可直接将你的 PushPlus Token 写入下方双引号内，例如: "f8c0xxxxxxxxxxxxxxxx"
  PUSHPLUS_TOKEN: (import.meta as any).env?.VITE_PUSHPLUS_TOKEN || '',
};
