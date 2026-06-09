// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1. 从请求中获取前端发来的消息
    const { messages } = await req.json();

    // 2. (重要) 你的 DeepSeek API Key 只在这个服务器端的文件里使用，不会暴露给浏览器
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('错误: 请在 .env.local 文件中设置 DEEPSEEK_API_KEY');
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    // 3. 由你的服务器向 DeepSeek API 发起请求
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // API Key 在这里安全地使用
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 你可以根据需要修改模型
        messages: messages,
        stream: false
      })
    });

    // 4. 将 DeepSeek API 返回的结果原封不动地转发回你的网站前端
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('API 路由出错:', error);
    return NextResponse.json({ error: error.message || '内部服务器错误' }, { status: 500 });
  }
}
