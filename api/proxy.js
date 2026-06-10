// api/proxy.js
export default async function handler(req, res) {
  // 设置 CORS 头 - 允许所有来源（解决跨域问题）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // 处理预检请求（OPTIONS 方法）
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY 环境变量未配置');
      return res.status(500).json({ error: '服务器配置错误：未设置 API Key' });
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages
      })
    });

    const data = await response.json();
    
    // 如果 DeepSeek 返回错误，透传给前端
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('代理服务错误:', error);
    res.status(500).json({ error: error.message });
  }
}
