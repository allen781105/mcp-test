'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // 添加用户消息
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 发送请求到后端
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      // 添加助手回复
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      console.error('发送消息时出错:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `出错了: ${error instanceof Error ? error.message : '未知错误'}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理按键按下事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f7fb]">
      <header className="bg-[#4d5ef6] shadow-md p-4 text-white">
        <h1 className="text-xl font-bold text-center">Deepseek + MCP MySQL 查询助手</h1>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-lg shadow-sm my-8 text-gray-600">
              <p className="mb-4 text-lg font-medium">欢迎使用 Deepseek + MCP MySQL 查询助手</p>
              <p>您可以进行普通对话，或者询问数据库相关问题</p>
              <p className="mt-4 text-sm">例如: "查询数据库中的所有表" 或 "查询用户表中的前10条记录"</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-[#e6f7ff] text-gray-800 ml-auto mr-0 max-w-[80%]' 
                    : 'bg-white text-gray-800 mr-auto ml-0 max-w-[80%] shadow-sm'
                }`}
              >
                <div className={`font-medium mb-1 ${message.role === 'user' ? 'text-[#1890ff]' : 'text-[#722ed1]'}`}>
                  {message.role === 'user' ? '你' : 'Deepseek'}
                </div>
                <div className="whitespace-pre-wrap text-gray-800">{message.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 p-4 shadow-md">
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            className="flex-1 resize-none border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#4d5ef6] focus:border-[#4d5ef6] text-gray-800"
            rows={2}
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className={`px-6 py-2 rounded-lg text-white font-medium shadow-sm ${
              isLoading || !input.trim() 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#4d5ef6] hover:bg-[#3e4de0] transition-colors'
            }`}
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? '发送中...' : '发送'}
          </button>
        </div>
      </footer>
    </div>
  );
}
