declare const process: any;

const DEFAULT_GIST_ID = 'ecac7eb9e8c3ddce804fd21ec284bd21';
const FILE_NAME = 'family_todos.json';
const MEMBERS_FILE_NAME = 'family_members.json';

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

  if (!gistId) {
    res.status(500).json({ code: 500, msg: '未配置云端 Gist ID' });
    return;
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FamilyAffairsApp-Serverless',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  // GET: 读取云端所有事项与成员（公开 Gist 免鉴权读取）
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
      const membersFile = data.files && data.files[MEMBERS_FILE_NAME];

      let todos = [];
      if (file && file.content) {
        try {
          todos = JSON.parse(file.content);
        } catch {}
      }

      // 彻底清洗过滤 mock 数据
      const MOCK_TITLES = new Set([
        '陪爷爷去医院配慢病药',
        '交家里水电气费',
        '买家里的米面油和抽纸',
      ]);
      const MOCK_IDS = new Set(['1', '2', '3']);
      const cleanTodos = (Array.isArray(todos) ? todos : []).filter((t: any) => {
        if (!t) return false;
        const title = (t.title || '').trim();
        const id = String(t.id || '');
        return !(MOCK_IDS.has(id) && MOCK_TITLES.has(title)) && !MOCK_TITLES.has(title);
      });

      let members = null;
      if (membersFile && membersFile.content) {
        try {
          members = JSON.parse(membersFile.content);
        } catch {}
      }

      res.status(200).json({
        code: 200,
        data: {
          todos: cleanTodos,
          members: Array.isArray(members) ? members : null,
        },
      });
    } catch (err: any) {
      console.error('Fetch cloud todos error:', err);
      res.status(500).json({ code: 500, msg: err.message || '网络异常' });
    }
    return;
  }

  // POST / PUT: 写入保存事项与成员到云端
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!token) {
      res.status(500).json({ code: 500, msg: '云端写入需配置 GH_SYNC_TOKEN 环境变量' });
      return;
    }
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
      const members = bodyData?.members;

      if (!Array.isArray(todos)) {
        res.status(400).json({ code: 400, msg: '提交的数据必须包含待办事项数组' });
        return;
      }

      const filesPayload: any = {
        [FILE_NAME]: {
          content: JSON.stringify(todos, null, 2),
        },
      };

      if (Array.isArray(members) && members.length > 0) {
        filesPayload[MEMBERS_FILE_NAME] = {
          content: JSON.stringify(members, null, 2),
        };
      }

      const patchResponse = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: `家庭事务云端持久化 (已同步 ${todos.length} 条事项${Array.isArray(members) ? `，${members.length} 位成员` : ''})`,
          files: filesPayload,
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
