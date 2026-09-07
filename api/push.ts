declare const process: any;

export default async function handler(req: any, res: any) {
  // 允许跨域与预检
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ code: 405, msg: 'Method Not Allowed' });
    return;
  }

  try {
    const { title, content, token: clientToken } = req.body || {};
    // 优先使用 Vercel 环境变量中配置的 PUSHPLUS_TOKEN，无需在客户端明文保存
    const token = process.env.PUSHPLUS_TOKEN || process.env.VITE_PUSHPLUS_TOKEN || clientToken;

    if (!token) {
      res.status(400).json({ code: 400, msg: '未配置 PUSHPLUS_TOKEN 环境变量或 Token' });
      return;
    }

    const pushRes = await fetch('https://www.pushplus.plus/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title: title || '家庭事务提醒',
        content: content || '',
        template: 'html',
      }),
    });

    const data = await pushRes.json();
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ code: 500, msg: err.message || 'Server Error' });
  }
}
