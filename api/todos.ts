declare const process: any;

const DEFAULT_GIST_ID = 'ecac7eb9e8c3ddce804fd21ec284bd21';
const FILE_NAME = 'family_todos.json';

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

  const gistId = process.env.SYNC_GIST_ID || DEFAULT_GIST_ID;
  const token = process.env.GH_SYNC_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (!gistId || !token) {
    res.status(500).json({ code: 500, msg: '未配置 GH_SYNC_TOKEN 环境变量，无法连接云端数据库' });
    return;
  }

  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FamilyAffairsApp-Serverless',
  };

  // GET: 读取云端所有事项
  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        res.status(response.status).json({ code: response.status, msg: '从云端读取失败' });
        return;
      }

      const data = await response.json();
      const file = data.files && data.files[FILE_NAME];
      if (!file || !file.content) {
        res.status(200).json({ code: 200, data: [] });
        return;
      }

      const todos = JSON.parse(file.content);
      res.status(200).json({ code: 200, data: Array.isArray(todos) ? todos : [] });
    } catch (err: any) {
      console.error('Fetch cloud todos error:', err);
      res.status(500).json({ code: 500, msg: err.message || '网络异常' });
    }
    return;
  }

  // POST / PUT: 写入保存事项到云端
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch {
          // ignore
        }
      }

      const todos = Array.isArray(bodyData) ? bodyData : bodyData?.todos;
      if (!Array.isArray(todos)) {
        res.status(400).json({ code: 400, msg: '提交的数据必须是待办事项数组' });
        return;
      }

      const patchResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `家庭事务云端持久化 (已同步 ${todos.length} 条事项)`,
          files: {
            [FILE_NAME]: {
              content: JSON.stringify(todos, null, 2),
            },
          },
        }),
      });

      if (!patchResponse.ok) {
        const errorText = await patchResponse.text();
        res.status(patchResponse.status).json({ code: patchResponse.status, msg: errorText });
        return;
      }

      res.status(200).json({ code: 200, count: todos.length, msg: '云端同步成功' });
    } catch (err: any) {
      console.error('Save cloud todos error:', err);
      res.status(500).json({ code: 500, msg: err.message || '网络异常' });
    }
    return;
  }

  res.status(405).json({ code: 405, msg: 'Method Not Allowed' });
}
