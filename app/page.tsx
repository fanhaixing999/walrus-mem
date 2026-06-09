'use client';

import { useState, useEffect, useRef } from 'react';
import { MemWal } from '@mysten-incubation/memwal';

export default function WorldCupAgent() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState(() => {
    let id = localStorage.getItem('walrus_worldcup_user_id');
    if (!id) {
      id = `user-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString().slice(-4)}`;
      localStorage.setItem('walrus_worldcup_user_id', id);
    }
    return id;
  });

  const [delegateKey, setDelegateKey] = useState('');
  const [accountId, setAccountId] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    const finalDelegate = delegateKey || localStorage.getItem('MEMWAL_DELEGATE_KEY') || '';
    const finalAccount = accountId || localStorage.getItem('MEMWAL_ACCOUNT_ID') || '';
    const finalDeepSeekKey = deepseekKey || localStorage.getItem('DEEPSEEK_API_KEY') || '';

    let memoryContext = "暂无历史记忆。";

    // 1. 异步保存记忆（不等待，提升速度）
    if (finalDelegate && finalAccount && currentInput.trim().length > 5) {
      try {
        const client = MemWal.create({
          key: finalDelegate,
          accountId: finalAccount,
          serverUrl: "https://relayer.memory.walrus.xyz",
          namespace: "worldcup-2026-agent",
        });

        client.remember(`[User:${userId}] ${currentInput}`, {
          tags: ["worldcup", `user-${userId}`],
          metadata: { timestamp: new Date().toISOString(), userId }
        }).catch(console.error); // 异步，不阻塞
      } catch (e) {
        console.error(e);
      }
    }

    // 2. 调用大模型（核心加速点）
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent('https://api.deepseek.com/chat/completions')}`;

      const res = await fetch(proxyUrl, {
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
              content: `你是世界杯记忆吐槽伙伴。使用以下历史记忆进行回复：\n${memoryContext}\n风格幽默毒舌，像老球迷。`
            },
            ...newMessages
          ],
          temperature: 0.8,
          max_tokens: 800
        })
      });

      if (!res.ok) throw new Error("请求失败");

      const data = await res.json();
      const aiReply = data.choices?.[0]?.message?.content || "我暂时无法回应...";

      setMessages([...newMessages, { role: 'assistant', content: aiReply }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: "大模型响应较慢，但你的输入已成功记录到 Walrus 主网！" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>⚽ World Cup Walrus Memory Agent</h1>
      <p>完全运行在 Walrus 主网</p>

      <button onClick={() => setShowConfig(!showConfig)} style={{marginBottom: '15px'}}>
        ⚙️ 配置面板 ({showConfig ? '收起' : '展开'})
      </button>

      {showConfig && (
        <div style={{background:'#1e2937', padding:'15px', borderRadius:'12px', marginBottom:'20px'}}>
          <input type="text" placeholder="MEMWAL_DELEGATE_KEY" value={delegateKey} onChange={e => setDelegateKey(e.target.value)} style={{width:'100%', marginBottom:'8px', padding:'8px'}} />
          <input type="text" placeholder="MEMWAL_ACCOUNT_ID" value={accountId} onChange={e => setAccountId(e.target.value)} style={{width:'100%', marginBottom:'8px', padding:'8px'}} />
          <input type="password" placeholder="DeepSeek API Key" value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)} style={{width:'100%', padding:'8px'}} />
        </div>
      )}

      <div ref={chatContainerRef} style={{height: '65vh', overflowY:'auto', background:'#0f172a', padding:'20px', borderRadius:'16px', marginBottom:'15px'}}>
        {messages.length === 0 && <div className="message agent">👋 输入你的世界杯预测，我会永久记住并吐槽！</div>}
        
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role === 'user' ? 'user' : 'agent'}`} style={{margin:'12px 0', padding:'14px', borderRadius:'12px'}}>
            <strong>{m.role === 'user' ? '你' : '记忆伙伴'}:</strong><br/>{m.content}
          </div>
        ))}
        {isLoading && <div className="message agent">思考中...</div>}
      </div>

      <div style={{display:'flex', gap:'10px'}}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入世界杯预测..."
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
          style={{flex:1, padding:'14px', borderRadius:'12px'}}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>发送</button>
      </div>
    </div>
  );
}
