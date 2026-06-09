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

  useEffect(() => {
    let savedId = localStorage.getItem('walrus_worldcup_user_id');
    if (!savedId) {
      savedId = `user-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString().slice(-4)}`;
      localStorage.setItem('walrus_worldcup_user_id', savedId);
    }
    setUserId(savedId);
  }, []);

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

    // MemWal 操作
    if (finalDelegate && finalAccount) {
      try {
        const client = MemWal.create({
          key: finalDelegate,
          accountId: finalAccount,
          serverUrl: "https://relayer.memory.walrus.xyz",
          namespace: "worldcup-2026-agent",
        });

        // 保存记忆（修复版）
        if (input.trim().length > 5) {
          try {
            const job = await client.remember(
              `[User:${userId}] ${input}`,
              {
                tags: ["worldcup", `user-${userId}`],
                metadata: { timestamp: new Date().toISOString(), userId }
              }
            );
            await client.waitForRememberJob(job.job_id, { timeoutMs: 15000 });
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
              .map((m: any) => `- ${m.content || m.text || JSON.stringify(m)}`)
              .join("\n");
          }
        } catch (e) {
          console.error("记忆读取失败:", e);
        }
      } catch (e) {
        console.error("MemWal 初始化失败:", e);
      }
    }

    // 调用 DeepSeek
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

【Walrus 主网历史记忆】（必须主动引用并吐槽）：
${memoryContext}

回复要求：
- 必须引用历史记忆进行对比或幽默吐槽
- 风格毒舌、幽默、像老球迷
- 强调 Walrus 去中心化持久记忆`
            },
            ...newMessages
          ],
          temperature: 0.85,
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
        content: "🤖 大模型暂时连接失败，但你刚才说的话已经成功永久保存在 Walrus 主网！\n\n刷新页面后仍能回忆。" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1>⚽ World Cup Walrus Memory Agent</h1>
      <p style={{ opacity: 0.8 }}>完全运行在 Walrus Sites 上的去中心化智能体</p>

      <button 
        onClick={() => setShowConfig(!showConfig)} 
        style={{ marginBottom: '15px', padding: '8px 16px' }}
      >
        ⚙️ {showConfig ? '收起' : '展开'}配置面板
      </button>

      {showConfig && (
        <div style={{ background: '#1e2937', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
          <input type="text" placeholder="MEMWAL_DELEGATE_KEY" value={delegateKey} onChange={(e) => setDelegateKey(e.target.value)} style={{width:'100%', marginBottom:'8px', padding:'8px'}} />
          <input type="text" placeholder="MEMWAL_ACCOUNT_ID (0x开头)" value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{width:'100%', marginBottom:'8px', padding:'8px'}} />
          <input type="password" placeholder="DeepSeek API Key (sk-...)" value={deepseekKey} onChange={(e) => setDeepseekKey(e.target.value)} style={{width:'100%', padding:'8px'}} />
        </div>
      )}

      <div className="chat-box" ref={chatContainerRef} style={{ height: '65vh', overflowY: 'auto', background: '#0f172a', padding: '20px', borderRadius: '16px' }}>
        {messages.length === 0 && (
          <div className="message agent">
            👋 你好！我是你的世界杯记忆伙伴。<br/>我已连接 Walrus 主网。<br/>请先输入几条世界杯预测，我会永久记住！
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role === 'user' ? 'user' : 'agent'}`} style={{ margin: '12px 0', padding: '14px', borderRadius: '12px', maxWidth: '80%' }}>
            <strong>{m.role === 'user' ? '你' : '记忆伙伴'}:</strong><br />
            {m.content}
          </div>
        ))}

        {isLoading && <div className="message agent">思考中... Walrus 记忆已保存</div>}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入你的世界杯预测..."
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
          style={{ flex: 1, padding: '14px', borderRadius: '12px' }}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()} style={{ padding: '0 24px' }}>
          发送
        </button>
      </div>
    </div>
  );
}
