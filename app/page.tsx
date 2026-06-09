// app/page.tsx (完整替换)
'use client';

import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 构建历史消息（保留最近10条，避免超出模型限制）
      const historyToSend = [...messages, userMessage].slice(-10);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyToSend })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();
      const assistantReply = data.choices?.[0]?.message?.content;

      if (assistantReply) {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);
      } else {
        throw new Error('返回数据格式异常');
      }
    } catch (error) {
      console.error('调用出错:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ 大模型连线受阻，但你的消息已安全保存。（请检查控制台错误信息）' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Walrus 记忆智能体</h1>
      <div style={{ border: '1px solid #ccc', padding: '1rem', minHeight: '400px', marginBottom: '1rem' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '0.5rem' }}>
            <strong>{msg.role === 'user' ? '你' : 'AI'}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div>AI 正在思考...</div>}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入消息..."
          style={{ flex: 1, padding: '0.5rem' }}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          发送
        </button>
      </div>
    </main>
  );
}
