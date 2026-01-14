'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Olá! 👋 Prazer, sou o **Assistente Virtual da SEMEC Porto Velho**!\n\nEstou aqui para te ajudar com questões fiscais e tributárias. Pode conversar comigo naturalmente, como se estivesse falando com um especialista! 😊\n\n**Posso te ajudar com:**\n\n📋 Consulta de CNAEs\n🎯 Grau de risco fiscal  \n📌 Lista de Serviços (LC 116/2003)\n📊 Códigos NBS, IBS e CBS\n🔍 Busca por atividade\n\n**Exemplos:**\n• "Qual o grau de risco do CNAE 6920601?"\n• "CNAEs de contabilidade"\n• "Me fale sobre o item 17.01"\n\nQual sua dúvida? Estou aqui para ajudar! 💬',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Adicionar mensagem
  const addMessage = (text: string, sender: 'user' | 'bot', isError = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      isError
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Enviar pergunta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const question = inputText.trim();
    if (!question || isLoading) return;

    // Adicionar mensagem do usuário
    addMessage(question, 'user');
    setInputText('');
    setIsLoading(true);

    try {
      // Pegar últimas 3 mensagens para contexto (excluindo a mensagem inicial)
      const recentMessages = messages
        .filter(m => m.id !== '0') // Remove mensagem de boas-vindas
        .slice(-3) // Últimas 3 mensagens
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          question,
          history: recentMessages // Adicionar histórico
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pergunta');
      }

      // Adicionar resposta do bot
      addMessage(data.response || 'Desculpe, não consegui processar sua pergunta.', 'bot');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      addMessage(
        `Erro: ${error.message || 'Não foi possível conectar ao servidor. Tente novamente.'}`,
        'bot',
        true
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sugestões de perguntas
  const suggestions = [
    'Qual o grau de risco do CNAE 6920601?',
    'Me fale sobre o item 17.12',
    'CNAEs de contabilidade e auditoria'
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full p-4 shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 z-50 group"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            1
          </span>
        </button>
      )}

      {/* Widget do chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Assistente CNAE</h3>
                <p className="text-xs text-blue-100">Online • Sempre disponível</p>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                    : message.isError
                    ? 'bg-red-100'
                    : 'bg-blue-100'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className={`w-4 h-4 ${message.isError ? 'text-red-600' : 'text-blue-600'}`} />
                  )}
                </div>

                {/* Mensagem */}
                <div className={`flex flex-col max-w-[75%] ${
                  message.sender === 'user' ? 'items-end' : 'items-start'
                }`}>
                  <div className={`rounded-2xl px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-tr-sm'
                      : message.isError
                      ? 'bg-red-50 text-red-900 border border-red-200 rounded-tl-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {message.text}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-600" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões (mostrar apenas no início) */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Sugestões:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs bg-white hover:bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full border border-blue-200 transition-colors"
                  >
                    {suggestion.substring(0, 30)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                maxLength={500}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full p-3 hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Enviar mensagem"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            {inputText.length > 400 && (
              <p className="text-xs text-gray-500 mt-2">
                {inputText.length}/500 caracteres
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
}
