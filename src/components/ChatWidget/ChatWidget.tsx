'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Bot, User, X, Flag, AlertTriangle, XCircle, HelpCircle, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
  userQuestion?: string; // Pergunta original do usuário
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: 'Olá! 👋 Sou o **Assistente Virtual da SEMEC Porto Velho**!\n\nEstou aqui para te ajudar com a consulta de atividades e serviços. 😊\n\n**Posso te ajudar com:**\n\n📋 Consulta de CNAEs\n🎯 Grau de risco fiscal  \n📌 Lista de Serviços (LC 116/2003)\n📊 Códigos NBS, IBS e CBS\n🔍 Busca por atividade\n\n**Exemplos simples:**\n• "CNAE 6920601"\n• "NBS do código 01.01"\n• "Item 17.01"\n• "CNAEs de contabilidade"\n\nQual sua dúvida? 💬',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [messageToReport, setMessageToReport] = useState<Message | null>(null);
  const [reportSent, setReportSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Adicionar mensagem
  const addMessage = (text: string, sender: 'user' | 'bot', isError = false, userQuestion?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      isError,
      userQuestion
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          question
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pergunta');
      }

      // Adicionar resposta do bot (com a pergunta original para denúncias)
      addMessage(data.response || 'Desculpe, não consegui processar sua pergunta.', 'bot', false, question);
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      addMessage(
        `Erro: ${error.message || 'Não foi possível conectar ao servidor. Tente novamente.'}`,
        'bot',
        true,
        question
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sugestões de perguntas
  const suggestions = [
    'NBS do código 01.01',
    'O que é o item 17.01?',
    'CNAE 6920601'
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  // Abrir modal de denúncia
  const handleReportClick = (message: Message) => {
    setMessageToReport(message);
    setReportModalOpen(true);
    setReportSent(false);
  };

  // Enviar denúncia para WhatsApp
  const sendReportToWhatsApp = (reason: string) => {
    if (!messageToReport) return;

    const phone = '556999425251'; // Número da SEMEC
    
    // Formatar mensagem para WhatsApp
    const timestamp = messageToReport.timestamp.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const botResponse = messageToReport.text.length > 200 
      ? messageToReport.text.substring(0, 200) + '...'
      : messageToReport.text;

    const reportMessage = `🚨 DENÚNCIA - Chat CNAE

📝 Pergunta do usuário:
"${messageToReport.userQuestion || 'Não disponível'}"

🤖 Resposta do bot:
"${botResponse}"

⚠️ Motivo da denúncia:
${reason}

🕒 Data/Hora:
${timestamp}

---
Sistema de Consulta de Risco - SEMEC Porto Velho`;

    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(reportMessage)}`;
    window.open(whatsappUrl, '_blank');

    // Mostrar confirmação
    setReportSent(true);
    
    // Fechar modal após 2 segundos
    setTimeout(() => {
      setReportModalOpen(false);
      setMessageToReport(null);
      setReportSent(false);
    }, 2000);
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
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Assistente CNAE</h3>
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded uppercase">
                    Beta
                  </span>
                </div>
                <p className="text-xs text-blue-100">Online • Sempre disponível</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full hover:bg-white/15 transition"
              aria-label="Fechar assistente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Disclaimer Beta */}
          <div className="bg-yellow-50 border-b border-yellow-200 px-3 py-2">
            <p className="text-[10px] text-yellow-800 leading-tight">
              ⚠️ <span className="font-semibold">Versão Beta:</span> Este assistente usa IA e pode cometer erros. Verifique as informações antes de decisões oficiais.
            </p>
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
                  <div className="relative group">
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
                    
                    {/* Botão de denúncia (apenas para mensagens do bot, exceto a primeira) */}
                    {message.sender === 'bot' && message.id !== '0' && (
                      <button
                        onClick={() => handleReportClick(message)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-full p-1.5 shadow-sm border border-gray-200"
                        aria-label="Denunciar mensagem"
                        title="Denunciar resposta incorreta"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      {/* Modal de Denúncia */}
      {reportModalOpen && messageToReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-[calc(100vw-2rem)] mx-4 animate-in zoom-in-95 duration-200">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Flag className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg">Denunciar Resposta</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/15 transition"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              {reportSent ? (
                // Confirmação de envio
                <div className="text-center py-8">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Denúncia Enviada!</h4>
                  <p className="text-sm text-gray-600">
                    O WhatsApp foi aberto com sua denúncia pré-formatada.
                    <br />
                    Basta enviar a mensagem.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Por que você está denunciando esta resposta? Selecione o motivo:
                  </p>

                  {/* Opções de motivo */}
                  <div className="space-y-2">
                    <button
                      onClick={() => sendReportToWhatsApp('❌ Informação incorreta ou imprecisa')}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 group-hover:bg-red-200 p-2 rounded-lg transition">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Informação incorreta</p>
                          <p className="text-xs text-gray-500">Os dados fornecidos estão errados</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => sendReportToWhatsApp('🚫 Conteúdo ofensivo ou inadequado')}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 group-hover:bg-orange-200 p-2 rounded-lg transition">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Conteúdo inadequado</p>
                          <p className="text-xs text-gray-500">Resposta ofensiva ou inapropriada</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => sendReportToWhatsApp('⚠️ Resposta fora do contexto ou não relacionada')}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-yellow-100 group-hover:bg-yellow-200 p-2 rounded-lg transition">
                          <HelpCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Fora do contexto</p>
                          <p className="text-xs text-gray-500">Não respondeu à pergunta feita</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 text-center">
                      Ao denunciar, você será redirecionado ao WhatsApp da SEMEC com uma mensagem pré-formatada.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
