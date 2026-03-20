import { useState, useEffect, useRef } from 'react';
import { Send, AlertTriangle, Trash2, MessageCircle, Menu, Plus, X, List, RefreshCw, MoreVertical } from 'lucide-react';
import type { Transaction } from '../types';
import type { Character } from '../types/character';
import { DEFAULT_CHARACTERS } from '../types/character';
import { storage } from '../utils/storage';
import { characterStorage } from '../utils/opfs';
import { chatStorage, type ChatSession, type ChatMessage } from '../utils/chatStorage';
import {
  getCurrentMonth,
  filterByMonth,
  calculateSummary,
  getCategoryTotals,
} from '../utils/formatters';
import { getCategoryInfo } from '../types';
import { useTranslation } from 'react-i18next';

export default function Chat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [selectedCharId] = useState(characterStorage.getSelectedId());
  const [selectedCharAvatarUrl, setSelectedCharAvatarUrl] = useState<string | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const settings = storage.getSettings();
  const lang = settings.language || 'id';
  const { t } = useTranslation();

  useEffect(() => {
    loadSessions();
    setTransactions(storage.getTransactions());
    loadCharacters();

    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const loadSessions = async () => {
    const allSessions = await chatStorage.getAllSessions();
    setSessions(allSessions);
    if (allSessions.length > 0 && !activeSessionId) {
      setActiveSessionId(allSessions[0].id);
      setMessages(allSessions[0].messages);
    }
  };

  const loadCharacters = async () => {
    const all = await characterStorage.getAll();
    setCharacters(all);
  };

  const fallbackChar: Character = { id: 'fallback', name: 'Wifey AI', avatar: '🤖', promptStyle: 'Kamu adalah asisten pengatur keuangan.', color: '#000', isDefault: true, personality: '' };
  const selectedChar = characters.find(c => c.id === selectedCharId) || characters[0] || fallbackChar;

  useEffect(() => {
    if (selectedChar?.avatar && selectedChar.avatar.length > 4 && selectedChar.avatar.includes('.')) {
      characterStorage.loadAvatar(selectedChar.avatar).then(url => {
        if (url) setSelectedCharAvatarUrl(url);
      });
    } else {
      setSelectedCharAvatarUrl(null);
    }
  }, [selectedChar]);

  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        setMessages(session.messages);
      }
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    } else {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // ensure no implicit window scroll
    window.scrollTo(0, 0);
  }, [messages]);

  const currentMonth = getCurrentMonth();
  const monthTx = filterByMonth(transactions, currentMonth);
  const expenses = monthTx.filter(t => t.type === 'expense');
  const { income, expense, balance } = calculateSummary(monthTx);
  const categoryTotals = getCategoryTotals(expenses);

  const handleNewChat = async (isBudgeting: boolean = false) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: isBudgeting ? t('chat.budgetPlan') : t('chat.newChat'),
      updatedAt: Date.now(),
      messages: []
    };
    
    await chatStorage.saveSession(newSession);
    await loadSessions();
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);

    if (isBudgeting) {
      handleSendCore(t('chat.defaultPlanMessage') || 'Tolong buatkan budget plan', newSession.id, []);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('chat.deleteConfirm'))) {
      await chatStorage.deleteSession(id);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    let currentSessionId = activeSessionId;
    let currentMessages = messages;

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: input.trim().substring(0, 30) + (input.length > 30 ? '...' : ''),
        updatedAt: Date.now(),
        messages: []
      };
      await chatStorage.saveSession(newSession);
      currentSessionId = newSession.id;
      setActiveSessionId(currentSessionId);
      currentMessages = [];
    }

    const userInput = input.trim();
    setInput('');
    await handleSendCore(userInput, currentSessionId, currentMessages);
  };

  const handleSendCore = async (userInput: string, sessionId: string, currentMessages: ChatMessage[]) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput
    };

    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);

    // Save user message immediately
    const sessionToUpdate = sessions.find(s => s.id === sessionId) || {
      id: sessionId,
      title: userInput.substring(0, 30),
      updatedAt: Date.now(),
      messages: []
    };
    sessionToUpdate.messages = updatedMessages;
    sessionToUpdate.updatedAt = Date.now();
    await chatStorage.saveSession(sessionToUpdate);
    await loadSessions();

    await callApi(updatedMessages, sessionId);
  };

  const callApi = async (messagesToSend: ChatMessage[], sessionId: string) => {
    setLoading(true);
    setError('');

    try {
      const recentTransactions = monthTx
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(t => ({ description: t.description, amount: t.amount, type: t.type, date: t.date, category: getCategoryInfo(t.category as any).label }));

      const hasBudget = settings.useBudget !== false;
      const budgetUsedPercent = hasBudget
            ? (settings.monthlyBudget > 0 ? Math.round((expense / settings.monthlyBudget) * 100) : 0)
            : (income > 0 ? Math.round((expense / income) * 100) : 0);

      const financialData = {
        name: settings.name,
        monthlyBudget: settings.monthlyBudget,
        totalIncome: income,
        totalExpense: expense,
        balance,
        budgetUsedPercent,
        hasBudget,
        topCategories: categoryTotals.slice(0, 5).map(c => ({
          category: getCategoryInfo(c.category as any).label,
          amount: c.amount,
          percent: Math.round((c.amount / expense) * 100),
        })),
        transactionCount: monthTx.length,
        avgDailyExpense: Math.round(expense / new Date().getDate()),
        characterName: selectedChar.name,
        characterPrompt: selectedChar.promptStyle,
        recentTransactions,
        language: lang,
      };

      const payload = {
        messages: messagesToSend.map(m => ({ role: m.role, content: m.content })),
        financialData
      };

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to call AI');

      const data = await response.json();
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply
      };
      
      setMessages(prev => {
        const finalMessages = [...prev, aiMsg];
        const sessionToUpdate = sessions.find(s => s.id === sessionId);
        if (sessionToUpdate) {
          sessionToUpdate.messages = finalMessages;
          sessionToUpdate.updatedAt = Date.now();
          chatStorage.saveSession(sessionToUpdate).then(() => {
            loadSessions();
          });
        }
        return finalMessages;
      });

    } catch (err) {
      console.error(err);
      setError(t('chat.aiBusy') || 'AI was unable to reply. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeSessionId) return;
    if (!window.confirm(t('chat.deleteMessageConfirm') || 'Hapus pesan ini?')) return;
    
    const updatedMessages = messages.filter(m => m.id !== msgId);
    setMessages(updatedMessages);

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);
    if (sessionToUpdate) {
      sessionToUpdate.messages = updatedMessages;
      await chatStorage.saveSession(sessionToUpdate);
      await loadSessions();
    }
  };

  const handleRegenerate = async (msgIndex: number) => {
    if (!activeSessionId || loading) return;
    
    const currentMessages = messages.slice(0, msgIndex);
    setMessages(currentMessages);

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);
    if (sessionToUpdate) {
      sessionToUpdate.messages = currentMessages;
      await chatStorage.saveSession(sessionToUpdate);
      await loadSessions();
    }

    await callApi(currentMessages, activeSessionId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 w-full flex flex-col h-[100dvh] max-w-lg mx-auto bg-dark pb-[max(env(safe-area-inset-bottom),70px)] z-10 overflow-hidden">
      
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar / Drawer */}
      <div className={`absolute top-0 bottom-[max(env(safe-area-inset-bottom),70px)] left-0 w-3/4 max-w-[280px] bg-dark-card border-r border-dark-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-dark-border/50 flex items-center justify-between">
            <h2 className="font-bold text-sm">{t('chat.history')}</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-dark-muted hover:text-white">
                <X size={18} />
            </button>
        </div>
        
        <div className="p-4 space-y-3">
            <button 
                onClick={() => handleNewChat(false)}
                className="w-full flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary-light hover:bg-primary/20 transition-colors text-sm font-medium border border-primary/20"
            >
                <Plus size={16} /> {t('chat.newChat')}
            </button>
            <button 
                onClick={() => handleNewChat(true)}
                className="w-full flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors text-sm font-medium border border-success/20"
            >
                <List size={16} /> {t('chat.budgetPlan')}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
            {sessions.map(session => (
                <div 
                    key={session.id}
                    onClick={() => {
                        setActiveSessionId(session.id);
                        setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between group cursor-pointer transition-colors ${
                        activeSessionId === session.id ? 'bg-dark-border/60' : 'hover:bg-dark-border/30'
                    }`}
                >
                    <div className="truncate flex-1 pr-2">
                        <p className="text-sm text-dark-text truncate">{session.title}</p>
                        <p className="text-[10px] text-dark-muted mt-0.5">
                            {new Date(session.updatedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                    <button 
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="p-1.5 text-dark-muted hover:text-danger hover:bg-danger/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
      </div>

      {/* Header */}
      <div className="px-3 py-3 border-b border-dark-border/50 flex items-center justify-between bg-dark/80 backdrop-blur-md sticky top-0 z-10 glass-strong">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-dark-text hover:bg-dark-border/50 rounded-xl transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="w-10 h-10 rounded-full bg-dark-border flex items-center justify-center overflow-hidden border border-primary/20 shrink-0">
              {selectedCharAvatarUrl ? (
                <img src={selectedCharAvatarUrl} alt={selectedChar.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{selectedChar.avatar?.length <= 4 ? selectedChar.avatar : '🤖'}</span>
              )}
          </div>
          <div className="truncate">
            <h1 className="text-base font-bold flex items-center gap-1.5 truncate">
              {selectedChar.name}
              <div className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"></div>
            </h1>
            <p className="text-[10px] text-dark-muted truncate">{t('chat.onlineStatus')}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary-light mb-2">
              <MessageCircle size={32} />
            </div>
            <p className="text-sm font-medium">{t('chat.emptyChat')}</p>
            <p className="text-xs text-dark-muted max-w-[250px]">
              {t('chat.emptyChatDesc')}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} relative`}
            >
              <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 shrink-0 rounded-full bg-dark-border flex items-center justify-center text-sm border border-primary/20 overflow-hidden mt-1">
                    {selectedCharAvatarUrl ? (
                      <img src={selectedCharAvatarUrl} alt={selectedChar.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedChar.avatar?.length <= 4 ? selectedChar.avatar : '🤖'
                    )}
                  </div>
                )}
                
                <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`p-3 rounded-2xl text-sm leading-relaxed relative ${
                      msg.role === 'user' 
                        ? 'bg-primary-light text-dark font-medium rounded-tr-sm' 
                        : 'bg-dark-border/60 text-dark-text rounded-tl-sm border border-dark-border'
                    }`}
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {msg.content}
                  </div>

                  <div className={`relative flex items-center ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                      <button
                        onClick={(e) => {
                           e.stopPropagation();
                           setOpenMenuId(openMenuId === msg.id ? null : msg.id);
                        }}
                        className="p-1 text-dark-muted hover:text-white hover:bg-dark-border/50 rounded-full transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {openMenuId === msg.id && (
                         <div className={`absolute bottom-full mb-1 ${msg.role === 'user' ? 'right-0' : 'left-0'} flex items-center gap-1 bg-dark/90 backdrop-blur border border-dark-border rounded-lg p-1 shadow-lg z-10`}>
                            {msg.role === 'assistant' && (
                               <button 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegenerate(index);
                                 }} 
                                 className="flex items-center gap-1.5 p-1.5 text-dark-muted hover:text-primary transition-colors rounded-md hover:bg-dark-border/50 whitespace-nowrap text-xs"
                                 title="Regenerate"
                               >
                                 <RefreshCw size={13} /> Regenerate
                               </button>
                            )}
                            <button 
                              onClick={(e) => {
                                 e.stopPropagation();
                                 handleDeleteMessage(msg.id);
                              }} 
                              className="flex items-center gap-1.5 p-1.5 text-dark-muted hover:text-danger transition-colors rounded-md hover:bg-dark-border/50 whitespace-nowrap text-xs"
                              title="Delete"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                         </div>
                      )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] gap-2 flex-row">
              <div className="w-8 h-8 shrink-0 rounded-full bg-dark-border flex items-center justify-center text-sm border border-primary/20 overflow-hidden">
                  {selectedCharAvatarUrl ? (
                    <img src={selectedCharAvatarUrl} alt={selectedChar.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedChar.avatar?.length <= 4 ? selectedChar.avatar : '🤖'
                  )}
              </div>
              <div className="p-4 rounded-2xl bg-dark-border/60 rounded-tl-sm border border-dark-border flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 flex items-start gap-2.5 my-2">
            <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        <div ref={endOfMessagesRef} className="h-32 shrink-0 w-full" />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 bg-dark/80 backdrop-blur-md border-t border-dark-border/50 pb-[max(env(safe-area-inset-bottom),20px)] mt-auto fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto z-40" style={{ bottom: '70px' }}>
        <div className="flex items-end gap-2 bg-dark-border/40 rounded-3xl p-1.5 border border-dark-border/60 focus-within:border-primary/50 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t('chat.inputPlaceholder')}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:ring-transparent text-sm text-dark-text p-2.5 max-h-32 min-h-[44px] resize-none"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`p-3 rounded-full shrink-0 transition-all ${
              !input.trim() || loading
                ? 'bg-dark-border text-dark-muted'
                : 'bg-primary text-dark hover:bg-primary-light hover:scale-105 active:scale-95'
            }`}
          >
            <Send size={18} className={input.trim() && !loading ? 'translate-x-px -translate-y-px' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
}
