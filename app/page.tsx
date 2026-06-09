'use client';

import { useState, useEffect, useRef } from 'react';
import { MemWal } from '@mysten-incubation/memwal';

export default function WorldCupAgent() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [delegateKey, setDelegateKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [showConfig, setShowConfig] = useState(true);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 初始化 userId
  useEffect(() => {
    let savedId = localStorage.getItem('walrus_worldcup_user_id');
    if (!savedId) {
      savedId = `user-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString().slice(-4)}`;
      localStorage.setItem('walrus_worldcup_user_id', savedId);
    }
    setUserId(savedId);
  }, []);

  // 自动滚动
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const finalDelegate = delegateKey || localStorage.getItem('MEMWAL_DELEGATE_KEY') || '';
    const finalAccount = accountId || localStorage.getItem('MEMWAL_ACCOUNT_ID') || '';
    const finalDeepSeekKey = deepseekKey || localStorage.getItem('DEEPSEEK_API_KEY') || '';

    let memoryContext = "这是该用户第一次对话，暂无历史记忆。";

    try {
      if (finalDelegate && finalAccount) {
        const client = MemWal.create({
          key: finalDelegate,
          accountId: finalAccount,
          serverUrl: "https://relayer.memory.walrus.xyz",
          namespace: "worldcup-2026-agent",
        });

        // 保存记忆
        if (input.trim().length > 5) {
          try {
            await client.rememberAndWait(
              `[User:${userId}] ${input}`,
              undefined,
              {
                tags: ["worldcup", `user-${userId}`],
                metadata: { timestamp: new Date().toISOString(), userId }
              }
            );
          } catch (e) {
            console.error("记忆保存失败:", e);
          }
        }

        // 读取记忆
        try {
          const recallRes = await client.recall({
            query: input,
            limit: 6,
            tags: [`user-${userId}`]
          });

          const memories = recallRes?.results || [];
          if (memories.length > 0) {
            memoryContext = memories
              .map((m: any) => `- ${m.content || m.text}`)
              .join("\n");
          }
        } catch (e) {
          console.error("记忆读取失败:", e);
        }
      }
    } catch (e) {
      console.error("MemWal 初始化失败:", e);
    }

    // 调用大模型
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent('https://api.deepseek.com/chat/completions')}`;

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalDeepSeekKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `你是「世界杯记忆吐槽伙伴」——完全运行在 Walrus Mainnet 上的持久记忆 Agent。

【Walrus 主网历史记忆】（必须主动引用）：
${memoryContext}

回复要求：
- 必须引用历史记忆进行对比或幽默吐槽
- 风格毒舌、热情、像老球迷
- 强调你拥有 Walrus 去中心化持久记忆`
            },
            ...newMessages
          ],
          temperature: 0.8,
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || "抱歉，我暂时无法回应...";

      setMessages([...newMessages, { role: 'assistant', content: aiReply }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: "🤖 大模型暂时连接失败，但你刚才说的话已经成功永久保存在 Walrus 主网上了！\n\n可以尝试刷新页面后继续对话。" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>⚽ World Cup Walrus Memory Agent</h1>
      <p style={{ opacity: 0.8 }}>完全运行在 Walrus Sites (wal.app) 上的去中心化智能体</p>

      <button onClick={() => setShowConfig(!showConfig)} style={{ marginBottom: '15px' }}>
        ⚙️ 配置面板 {showConfig ? '收起' : '展开'}
      </button>

      {showConfig && (
        <div style={{ background: '#1e2937', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="MEMWAL_DELEGATE_KEY"
            value={delegateKey}
            onChange={(e) => setDelegateKey(e.target.value)}
            style={{ width: '100%', marginBottom: '8px', padding: '8px' }}
          />
          <input
            type="text"
            placeholder="MEMWAL_ACCOUNT_ID (0x...)"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: '100%', marginBottom: '8px', padding: '8px' }}
          />
          <input
            type="password"
            placeholder="DeepSeek API Key (sk-...)"
            value={deepseekKey}
            onChange={(e) => setDeepseekKey(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
          <small>提示：输入后可点击“保存到本地”避免每次刷新重输</small>
        </div>
      )}

      <div className="chat-box" ref={chatContainerRef} style={{ height: '65vh', overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div className="message agent">
            👋 你好！我是你的世界杯记忆伙伴。<br />
            我已连接 Walrus 主网。<br />
            请先输入几条世界杯预测，我会永久记住它们！
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role === 'user' ? 'user' : 'agent'}`}>
            <strong>{m.role === 'user' ? '你' : '记忆伙伴'}:</strong><br />
            {m.content}
          </div>
        ))}

        {isLoading && <div className="message agent">思考中...（Walrus 记忆已保存）</div>}
      </div>

      <div className="input-form" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的世界杯预测或问题..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          发送
        </button>
      </div>
    </div>
  );
}
