import { useState, useEffect, useRef } from 'react';
import { Send, AlertTriangle, Trash2, MessageCircle, Menu, Plus, X, List, RefreshCw, MoreVertical, Wallet as WalletIcon, StopCircle, Edit2, ShoppingBag } from 'lucide-react';
import type { Transaction, Wallet, DreamItem } from '../types';
import type { Character } from '../types/character';
import { DEFAULT_CHARACTERS } from '../types/character';
import { storage } from '../utils/storage';
import { characterStorage, walletStorage, dreamItemStorage } from '../utils/opfs';
import { chatStorage, type ChatSession, type ChatMessage } from '../utils/chatStorage';
import {
  getCurrentMonth,
  filterByMonth,
  calculateSummary,
  getCategoryTotals,
} from '../utils/formatters';
import { getCategoryInfo } from '../types';
import { useTranslation } from 'react-i18next';
import markdownit from 'markdown-it';
import DOMPurify from 'dompurify';

const md = markdownit({
  html: false,
  breaks: true,
  linkify: true,
});

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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [selectedCharId] = useState(characterStorage.getSelectedId());
  const [selectedCharAvatarUrl, setSelectedCharAvatarUrl] = useState<string | null>(null);
  const [expressionUrls, setExpressionUrls] = useState<Record<string, string>>({});

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [wishlistMentionQuery, setWishlistMentionQuery] = useState<string | null>(null);
  const [dreamItems, setDreamItems] = useState<DreamItem[]>([]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const settings = storage.getSettings();
  const lang = settings.language || 'id';
  const { t } = useTranslation();

  useEffect(() => {
    loadSessions();
    setTransactions(storage.getTransactions());
    walletStorage.getAll().then(setWallets);
    dreamItemStorage.getAll().then(items => setDreamItems(items.filter(i => !i.isCompleted)));
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

    if (selectedChar?.expressions) {
      const loadExpressions = async () => {
         const loaded: Record<string, string> = {};
         for (const [key, val] of Object.entries(selectedChar.expressions || {})) {
           if (val.length > 4 && val.includes('.')) {
             const url = await characterStorage.loadAvatar(val);
             if (url) loaded[key] = url;
             else loaded[key] = val; // fallback for absolute URLs
           } else {
             loaded[key] = val; 
           }
         }
         setExpressionUrls(loaded);
      };
      loadExpressions();
    } else {
      setExpressionUrls({});
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
    window.scrollTo(0, 0);
  }, [messages]);

  const currentMonth = getCurrentMonth();
  const monthTxRaw = filterByMonth(transactions, currentMonth);

  const handleNewChat = async (isBudgeting: boolean = false) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: isBudgeting ? t('chat.budgetPlan') : t('chat.newChat'),
      updatedAt: Date.now(),
      messages: [],
      affection: 50,
      trust: 50,
      latestMood: 'Biasa'
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursorPosition);
    
    // Match only if @ is at start of string or after a space
    // Match wallet @
    const walletMatch = textBeforeCursor.match(/(?:^|\s)@(\w*)$/);
    if (walletMatch) {
       setMentionQuery(walletMatch[1].toLowerCase());
       setWishlistMentionQuery(null);
    } else {
       setMentionQuery(null);
       
       // Match wishlist #
       const wishlistMatch = textBeforeCursor.match(/(?:^|\s)#(\w*)$/);
       if (wishlistMatch) {
          setWishlistMentionQuery(wishlistMatch[1].toLowerCase());
       } else {
          setWishlistMentionQuery(null);
       }
    }
  };

  const handleMentionSelect = (walletTag: string) => {
    if (mentionQuery === null) return;
    
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const cursorPosition = textarea?.selectionStart || 0;
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    
    const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@${walletTag} `);
    const newValue = newTextBefore + textAfterCursor;
    
    setInput(newValue);
    setMentionQuery(null);
    
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = newTextBefore.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const handleWishlistSelect = (dreamName: string) => {
    if (wishlistMentionQuery === null) return;
    
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    const cursorPosition = textarea?.selectionStart || 0;
    const textBeforeCursor = input.substring(0, cursorPosition);
    const textAfterCursor = input.substring(cursorPosition);
    
    const tag = dreamName.replace(/\s+/g, '').toLowerCase();
    const newTextBefore = textBeforeCursor.replace(/#\w*$/, `#${tag} `);
    const newValue = newTextBefore + textAfterCursor;
    
    setInput(newValue);
    setWishlistMentionQuery(null);
    
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = newTextBefore.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const combinedWallets = [
    { id: 'all', name: 'Semua Dompet', icon: '🌍', isMain: false, tag: 'semua', type: 'Sistem' },
    ...wallets.map(w => ({ ...w, tag: w.name.replace(/\s+/g, '').toLowerCase(), type: 'Dompet' }))
  ];

  const suggestedWallets = mentionQuery !== null 
    ? combinedWallets.filter(w => w.tag.includes(mentionQuery) || ('main'.includes(mentionQuery) && w.isMain))
    : [];

  const suggestedDreams = wishlistMentionQuery !== null
    ? dreamItems.map(d => ({ ...d, tag: d.name.replace(/\s+/g, '').toLowerCase() }))
                .filter(d => d.tag.includes(wishlistMentionQuery))
    : [];

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    let currentSessionId = activeSessionId;
    let currentMessages = messages;

    if (!currentSessionId) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: input.trim().substring(0, 30) + (input.length > 30 ? '...' : ''),
        updatedAt: Date.now(),
        messages: [],
        affection: 50,
        trust: 50,
        latestMood: 'Biasa'
      };
      await chatStorage.saveSession(newSession);
      currentSessionId = newSession.id;
      setActiveSessionId(currentSessionId);
      currentMessages = [];
    }

    const userInput = input.trim();
    setInput('');
    setMentionQuery(null);
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
      messages: [],
      affection: 50,
      trust: 50,
      latestMood: 'Biasa'
    };
    sessionToUpdate.messages = updatedMessages;
    sessionToUpdate.updatedAt = Date.now();
    await chatStorage.saveSession(sessionToUpdate);
    await loadSessions();

    await callApi(updatedMessages, sessionId);
  };

    const renderMessageContent = (content: string) => {
        // Highlight @mentions and #wishlist tags
        const tagRegex = /((?:@|#)\w+)/g;
        const parts = content.split(tagRegex);
        return parts.map((part, i) => {
            if (part.match(tagRegex)) {
                return <span key={i} className="text-primary font-bold">{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

  const callApi = async (messagesToSend: ChatMessage[], sessionId: string) => {
    setLoading(true);
    setError('');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const [allDreams] = await Promise.all([
        dreamItemStorage.getAll()
      ]);
      const wishlistContext = allDreams.filter(i => !i.isCompleted).map(i => ({
          name: i.name,
          price: i.price,
          savedInWallet: wallets.find(w => w.id === i.walletId)?.name || 'Unknown'
      }));

      const latestUserMsg = [...messagesToSend].reverse().find(m => m.role === 'user')?.content || '';
      const mentionMatch = latestUserMsg.match(/@(\w+)/);
      const wishlistTagMatch = latestUserMsg.match(/#(\w+)/);
      
      let filteredTx = monthTxRaw;
      let walletContextName = 'Semua Dompet';
      let taggedWishlistItem = null;

      if (mentionMatch) {
         const mention = mentionMatch[1].toLowerCase();
         if (mention === 'semua' || mention === 'all') {
             // Keep filtering raw (all wallets)
             filteredTx = monthTxRaw;
             walletContextName = 'Semua Dompet';
         } else {
             const matchedWallet = wallets.find(w => w.name.toLowerCase().replace(/\s+/g, '') === mention || (mention === 'main' && w.isMain));
             if (matchedWallet) {
                 filteredTx = monthTxRaw.filter(t => t.walletId === matchedWallet.id || (!t.walletId && matchedWallet.isMain));
                 walletContextName = matchedWallet.name;
             }
         }
      }

      if (wishlistTagMatch) {
          const tag = wishlistTagMatch[1].toLowerCase();
          const matchedDream = allDreams.find(d => d.name.toLowerCase().replace(/\s+/g, '') === tag);
          if (matchedDream) {
              taggedWishlistItem = {
                  name: matchedDream.name,
                  price: matchedDream.price,
                  savedInWallet: wallets.find(w => w.id === matchedDream.walletId)?.name || 'Unknown'
              };
          }
      }

      const expenses = filteredTx.filter(t => t.type === 'expense');
      const { income, expense, balance } = calculateSummary(filteredTx);
      const categoryTotals = getCategoryTotals(expenses);

      const recentTransactions = filteredTx
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
        walletContextName,
        topCategories: categoryTotals.slice(0, 5).map(c => ({
          category: getCategoryInfo(c.category as any).label,
          amount: c.amount,
          percent: Math.round((c.amount / expense) * 100),
        })),
        transactionCount: filteredTx.length,
        avgDailyExpense: Math.round(expense / new Date().getDate()),
        characterName: selectedChar.name,
        characterPrompt: selectedChar.promptStyle,
        recentTransactions,
        language: lang,
        availableExpressions: selectedChar.expressions ? Object.keys(selectedChar.expressions) : ['normal'],
        currentAffection: sessions.find(s => s.id === sessionId)?.affection ?? 50,
        currentTrust: sessions.find(s => s.id === sessionId)?.trust ?? 50,
        currentMood: sessions.find(s => s.id === sessionId)?.latestMood ?? 'Biasa',
        wishlist: wishlistContext,
        taggedWishlistItem
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
        signal: controller.signal
      });

      if (!response.ok) throw new Error('Failed to call AI');

      const data = await response.json();
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        expression: data.expression,
        parameters: data.parameters
      };
      
      setMessages(prev => {
        const finalMessages = [...prev, aiMsg];
        const sessionToUpdate = sessions.find(s => s.id === sessionId);
        if (sessionToUpdate) {
          sessionToUpdate.messages = finalMessages;
          if (data.parameters) {
             sessionToUpdate.affection = Math.min(100, Math.max(0, (sessionToUpdate.affection || 50) + (data.parameters.affectionDelta || 0)));
             sessionToUpdate.trust = Math.min(100, Math.max(0, (sessionToUpdate.trust || 50) + (data.parameters.trustDelta || 0)));
             if (data.parameters.mood) {
                sessionToUpdate.latestMood = data.parameters.mood;
             }
          }
          sessionToUpdate.updatedAt = Date.now();
          chatStorage.saveSession(sessionToUpdate).then(() => {
            loadSessions();
          });
        }
        return finalMessages;
      });

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.error(err);
        setError(t('chat.aiBusy') || 'AI was unable to reply. Please try again.');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleStopGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleEditMessage = async (msgIndex: number, content: string) => {
    if (!activeSessionId || loading) return;
    
    // Set text input to what the user wrote
    setInput(content);
    
    // Delete this message and everything after it
    const currentMessages = messages.slice(0, msgIndex);
    setMessages(currentMessages);

    const sessionToUpdate = sessions.find(s => s.id === activeSessionId);
    if (sessionToUpdate) {
      sessionToUpdate.messages = currentMessages;
      await chatStorage.saveSession(sessionToUpdate);
      await loadSessions();
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
      <div className="px-3 py-3 border-b border-dark-border/50 flex flex-col bg-dark/80 backdrop-blur-md sticky top-0 z-10 glass-strong">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-dark-text hover:bg-dark-border/50 rounded-xl transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className={`w-10 h-10 rounded-full bg-dark-border flex items-center justify-center overflow-hidden border-2 shrink-0 ${
               activeSessionId && sessions.find(s => s.id === activeSessionId)?.latestMood === 'Senang' ? 'border-green-500/50' :
               activeSessionId && sessions.find(s => s.id === activeSessionId)?.latestMood === 'Marah' ? 'border-red-500/50' : 'border-primary/20'
            }`}>
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

        {/* Parameters Badge Row */}
        {activeSessionId && sessions.find(s => s.id === activeSessionId) && (
          <div className="flex items-center gap-2 mt-2 px-1 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-1.5 bg-pink-500/10 text-pink-500 px-2.5 py-1 rounded-full text-[10px] font-medium border border-pink-500/20 whitespace-nowrap">
              <span>💖</span> <span>{t('chat.affection', 'Afeksi')}: {sessions.find(s => s.id === activeSessionId)?.affection}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-medium border border-blue-500/20 whitespace-nowrap">
              <span>🎭</span> <span>{t('chat.mood', 'Mood')}: {sessions.find(s => s.id === activeSessionId)?.latestMood}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[10px] font-medium border border-amber-500/20 whitespace-nowrap">
              <span>⭐</span> <span>{t('chat.trust', 'Kepercayaan')}: {sessions.find(s => s.id === activeSessionId)?.trust}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary-light mb-2">
              <MessageCircle size={32} />
            </div>
            <p className="text-sm font-medium">{t('chat.emptyChat')}</p>
            <p className="text-xs text-dark-muted max-w-[250px]">
              {t('chat.emptyChatDesc')} <br />
              💡 *Hint: Coba ketik @ buat mention dompet khusus!*
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
                  <div className="w-8 h-8 shrink-0 rounded-full bg-dark-border flex items-center justify-center text-sm border border-primary/20 overflow-hidden mt-1 relative group">
                    {(msg.expression && msg.expression !== 'normal' && expressionUrls[msg.expression]) ? (
                      <img src={expressionUrls[msg.expression]} alt={selectedChar.name} className="w-full h-full object-cover" />
                    ) : selectedCharAvatarUrl ? (
                      <img src={selectedCharAvatarUrl} alt={selectedChar.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedChar.avatar?.length <= 4 ? selectedChar.avatar : '🤖'
                    )}
                    {msg.parameters && Object.keys(msg.parameters).length > 0 && (
                      <div className="absolute top-10 left-0 bg-dark-border/90 backdrop-blur-md rounded px-2 py-1 text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition shadow-lg pointer-events-none z-50">
                        {msg.parameters.affectionDelta ? `${t('chat.affection', 'Afeksi')}: ${msg.parameters.affectionDelta > 0 ? '+' : ''}${msg.parameters.affectionDelta}` : ''}
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`p-3 rounded-2xl text-[13px] leading-relaxed relative ${
                      msg.role === 'user' 
                        ? 'bg-primary-light text-dark font-medium rounded-tr-sm' 
                        : 'bg-dark-border/60 text-dark-text rounded-tl-sm border border-dark-border'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div 
                        className="markdown-body [&>p]:mb-2 last:[&>p]:mb-0 [&_em]:italic [&_em]:text-primary-light/90 [&_strong]:font-bold"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(md.render(msg.content)) }} 
                      />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>
                          {renderMessageContent(msg.content)}
                      </div>
                    )}
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
                            {msg.role === 'assistant' ? (
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
                            ) : (
                               <button 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditMessage(index, msg.content);
                                    setOpenMenuId(null);
                                 }} 
                                 className="flex items-center gap-1.5 p-1.5 text-dark-muted hover:text-primary transition-colors rounded-md hover:bg-dark-border/50 whitespace-nowrap text-xs"
                                 title="Edit"
                               >
                                 <Edit2 size={13} /> Edit
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
      <div className="px-4 py-3 bg-dark/80 backdrop-blur-md border-t border-dark-border/50 pb-[max(env(safe-area-inset-bottom),20px)] mt-auto fixed bottom-[70px] left-0 right-0 w-full max-w-lg mx-auto z-40">
        
        {/* Wallet Suggestion Box - VSCode Style */}
        {mentionQuery !== null && suggestedWallets.length > 0 && (
           <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1e1e1e] border border-[#333333] shadow-2xl rounded-xl overflow-hidden py-1.5 z-50 animate-fade-in flex flex-col max-h-[250px] overflow-y-auto no-scrollbar">
             <div className="px-3 py-1.5 text-[10px] font-semibold text-dark-muted uppercase tracking-wider bg-[#1e1e1e]">
               Pilih konteks AI
             </div>
             {suggestedWallets.map(w => (
                <button
                   key={w.id}
                   onClick={() => handleMentionSelect(w.tag)}
                   className="w-full text-left px-3 py-2 text-sm text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors flex items-center justify-between group"
                >
                   <div className="flex items-center gap-2.5">
                       <span className="text-base group-hover:scale-110 transition-transform">{w.icon || <WalletIcon size={14} />}</span>
                       <span className="font-medium text-[13px]">@{w.tag}</span>
                   </div>
                   <div className="flex flex-col items-end">
                       <span className="text-[10px] text-dark-muted group-hover:text-white/70">{w.type}</span>
                       <span className="text-[11px] text-dark-muted group-hover:text-white/90">{w.name}</span>
                   </div>
                </button>
             ))}
           </div>
        )}

         {wishlistMentionQuery !== null && suggestedDreams.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#1e1e1e] border border-[#333333] shadow-2xl rounded-xl overflow-hidden py-1.5 z-50 animate-fade-in flex flex-col max-h-[250px] overflow-y-auto no-scrollbar">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-dark-muted uppercase tracking-wider bg-[#1e1e1e] flex items-center gap-2">
                <ShoppingBag size={10} className="text-primary-light" />
                Pilih Barang Impian
              </div>
              {suggestedDreams.map(d => (
                 <button
                    key={d.id}
                    onClick={() => handleWishlistSelect(d.name)}
                    className="w-full text-left px-3 py-2 text-sm text-[#cccccc] hover:bg-[#094771] hover:text-white transition-colors flex items-center justify-between group"
                 >
                    <div className="flex items-center gap-2.5">
                        <ShoppingBag size={14} className="group-hover:scale-110 transition-transform text-primary-light" />
                        <span className="font-medium text-[13px]">#{d.tag}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-dark-muted group-hover:text-white/70">WISH LIST</span>
                        <span className="text-[11px] text-dark-muted group-hover:text-white/90">{d.name}</span>
                    </div>
                 </button>
              ))}
            </div>
         )}

        <div className="flex items-end gap-2 bg-dark-border/40 rounded-3xl p-1.5 border border-dark-border/60 focus-within:border-primary/50 transition-colors relative">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder={t('chat.inputPlaceholder', 'Ada pertanyaan? Ketik @ dompet atau # impian')}
            className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:ring-transparent text-sm text-dark-text p-2.5 max-h-32 min-h-[44px] resize-none"
            rows={1}
            disabled={loading}
          />
          {loading ? (
            <button
              onClick={handleStopGenerate}
              className="p-3 rounded-full shrink-0 transition-all bg-danger text-white hover:bg-danger/80 hover:scale-105 active:scale-95"
            >
              <StopCircle size={18} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-3 rounded-full shrink-0 transition-all ${
                !input.trim()
                  ? 'bg-dark-border text-dark-muted'
                  : 'bg-primary text-dark hover:bg-primary-light hover:scale-105 active:scale-95'
              }`}
            >
              <Send size={18} className={input.trim() ? 'translate-x-px -translate-y-px' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
