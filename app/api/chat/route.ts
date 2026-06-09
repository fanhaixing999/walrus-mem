// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    // 从环境变量读取密钥（安全）
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY 未配置');
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 如果要用V4模型，改成 'deepseek-v4-flash'（需开通权限）
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepSeek API 错误 (${response.status}):`, errorText);
      return NextResponse.json({ error: `API调用失败: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API路由内部错误:', error);
    return NextResponse.json({ error: error.message || '内部服务器错误' }, { status: 500 });
  }
}
