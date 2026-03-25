import { useState, useEffect } from 'react';
import { 
  Flame, Sparkles, RefreshCw, 
  AlertTriangle, Plus, ChevronDown, ChevronUp, Wallet 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Transaction, Wallet as WalletType } from '../types';
import { getCategoryInfo } from '../types';
import { storage } from '../utils/storage';
import { characterStorage, walletStorage, dreamItemStorage } from '../utils/opfs';
import type { Character } from '../types/character';
import { DEFAULT_CHARACTERS } from '../types/character';
import {
  formatCurrency,
  getCurrentMonth,
  getMonthLabel,
  filterByMonth,
  calculateSummary,
  getCategoryTotals,
  getPercentage,
} from '../utils/formatters';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import CharacterCard from '../components/CharacterCard';

interface RoastResult {
  roast: string;
  tips: string[];
  score: number;
  emoji: string;
}

export default function Analytics() {
  // Analytics states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedWalletId, setSelectedWalletId] = useState<string>('all');
  
  // Roast states
  const [loadingRoast, setLoadingRoast] = useState(false);
  const [roastResult, setRoastResult] = useState<RoastResult | null>(null);
  const [roastError, setRoastError] = useState('');
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [selectedCharId, setSelectedCharId] = useState(characterStorage.getSelectedId());
  const [selectedCharAvatarUrl, setSelectedCharAvatarUrl] = useState<string | null>(null);
  const [showCharacters, setShowCharacters] = useState(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = storage.getSettings();

  useEffect(() => {
    setTransactions(storage.getTransactions());
    walletStorage.getAll().then(setWallets);
    loadCharacters();
  }, []);

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

  // Compute analytics data based on selected month & wallet
  const monthTxRaw = filterByMonth(transactions, selectedMonth);
  const monthTx = selectedWalletId === 'all' 
    ? monthTxRaw 
    : monthTxRaw.filter(t => t.walletId === selectedWalletId || (!t.walletId && wallets.find(w => w.id === selectedWalletId)?.isMain));

  const expenses = monthTx.filter(t => t.type === 'expense');
  const incomes = monthTx.filter(t => t.type === 'income');
  const { income, expense, balance } = calculateSummary(monthTx);
  const expenseTotals = getCategoryTotals(expenses);
  const incomeTotals = getCategoryTotals(incomes);

  const expenseTotalsData = expenseTotals.map(item => {
    const cat = getCategoryInfo(item.category as any);
    const nameCat = cat.value.startsWith('custom_') ? cat.label : (t(`category.${cat.value}`, { defaultValue: cat.label }) as string);
    return { ...item, name: `${cat.emoji} ${nameCat}` };
  });

  // Get available months
  const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort((a, b) => b.localeCompare(a));
  if (!months.includes(selectedMonth)) months.unshift(selectedMonth);

  const pieColors = [
    '#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#e17055',
    '#74b9ff', '#a29bfe', '#ffeaa7', '#55efc4', '#fab1a0',
  ];

  const handleSelectChar = (id: string) => {
    setSelectedCharId(id);
    characterStorage.setSelectedId(id);
  };

  const handleDeleteChar = async (id: string) => {
    await characterStorage.delete(id);
    if (selectedCharId === id) {
      setSelectedCharId('gen-z');
      characterStorage.setSelectedId('gen-z');
    }
    await loadCharacters();
  };

  const handleRoast = async () => {
    if (monthTx.length === 0) {
      setRoastError(t('roast.noTxWarning', 'Belum ada transaksi di bulan dan/atau dompet ini buat di-roast!'));
      return;
    }

    setLoadingRoast(true);
    setRoastError('');
    setRoastResult(null);

    try {
        const [allDreams] = await Promise.all([
          dreamItemStorage.getAll()
        ]);
        const wishlist = allDreams.filter(i => !i.isCompleted).map(i => ({
            name: i.name,
            price: i.price,
            savedInWallet: wallets.find(w => w.id === i.walletId)?.name || 'Unknown'
        }));

        const recentTransactions = monthTx
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
          .map(t => ({ description: t.description, amount: t.amount, type: t.type, date: t.date, category: getCategoryInfo(t.category as any).label }));

      const hasBudget = settings.useBudget !== false;
      const budgetUsedPercent = hasBudget
            ? (settings.monthlyBudget > 0 ? Math.round((expense / settings.monthlyBudget) * 100) : 0)
            : (income > 0 ? Math.round((expense / income) * 100) : 0);

      const summaryData = {
        name: settings.name,
        monthlyBudget: settings.monthlyBudget,
        totalIncome: income,
        totalExpense: expense,
        balance,
        budgetUsedPercent,
        hasBudget,
        topCategories: expenseTotals.slice(0, 5).map(c => ({
          category: getCategoryInfo(c.category as any).label,
          amount: c.amount,
          percent: Math.round((c.amount / expense) * 100),
        })),
        transactionCount: monthTx.length,
        avgDailyExpense: Math.round(expense / Math.max(new Date().getDate(), 1)),
        // Character info
        characterName: selectedChar.name,
        characterPrompt: selectedChar.promptStyle,
        recentTransactions,
        language: settings.language || 'id',
        wishlist
      };

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/roast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryData),
      });

      if (!response.ok) throw new Error('Gagal mendapatkan roast');

      const data = await response.json();
      setRoastResult(data);
    } catch (err) {
      setRoastError('Waduh, AI-nya lagi error. Coba lagi nanti ya! 😅');
      console.error(err);
    } finally {
      setLoadingRoast(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-danger';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Rajin Nabung! 👑';
    if (score >= 60) return 'Lumayan Lah 😏';
    if (score >= 40) return 'Harus Lebih Hemat 😬';
    if (score >= 20) return 'Waduh Bahaya 🚨';
    return 'Sultan Receh 💀';
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-display font-bold">{t('analytics.title')}</h1>
          <p className="text-dark-muted text-xs mt-0.5">{t('analytics.overview')}</p>
        </div>
      </div>

      {/* Wallet Tabs */}
      <div className="px-5 mb-4">
        <label className="text-xs text-dark-muted font-medium mb-2 block">{t('wallets.name', 'Pilih Dompet')}</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedWalletId('all')}
            className={`px-4 py-2.5 rounded-2xl border whitespace-nowrap transition-all duration-200 text-sm font-semibold flex items-center gap-2 ${
              selectedWalletId === 'all'
                ? 'gradient-primary text-white shadow-md border-transparent'
                : 'bg-dark-card/50 border-dark-border text-dark-muted hover:border-dark-muted/50'
            }`}
          >
            <Wallet size={16} />
            {t('common.all', 'Semua')}
          </button>
          {wallets.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWalletId(w.id)}
              className={`px-4 py-2.5 rounded-2xl border whitespace-nowrap transition-all duration-200 text-sm font-semibold flex items-center gap-2 ${
                selectedWalletId === w.id
                  ? 'gradient-primary text-white shadow-md border-transparent'
                  : 'bg-dark-card/50 border-dark-border text-dark-muted hover:border-dark-muted/50'
              }`}
            >
              <span className="text-base">{w.icon}</span>
              {w.name}
            </button>
          ))}
        </div>
      </div>

      {/* Month Selector */}
      <div className="px-5 mb-5 border-b border-dark-border/50 pb-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {months.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedMonth === m
                  ? 'gradient-primary text-white shadow-md'
                  : 'bg-dark-card border border-dark-border text-dark-muted'
              }`}
            >
              {getMonthLabel(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-5 mb-6 grid grid-cols-2 gap-3">
        <div className="gradient-card rounded-2xl p-4 border border-dark-border/50 relative overflow-hidden group hover:border-success/50 transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-success/10 rounded-full blur-2xl group-hover:bg-success/20 transition-all" />
          <p className="text-xs text-dark-muted mb-1 relative z-10">{t('dashboard.income')}</p>
          <p className="text-base font-bold text-success relative z-10">{formatCurrency(income)}</p>
        </div>
        <div className="gradient-card rounded-2xl p-4 border border-dark-border/50 relative overflow-hidden group hover:border-danger/50 transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-danger/10 rounded-full blur-2xl group-hover:bg-danger/20 transition-all" />
          <p className="text-xs text-dark-muted mb-1 relative z-10">{t('dashboard.expense')}</p>
          <p className="text-base font-bold text-danger relative z-10">{formatCurrency(expense)}</p>
        </div>
        <div className="col-span-2 gradient-card rounded-2xl p-5 border border-dark-border/50 relative overflow-hidden group hover:border-primary/50 transition-all flex items-center justify-between">
          <div className="absolute -left-6 -bottom-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
          <div className="relative z-10">
            <p className="text-[11px] text-dark-muted mb-1 uppercase tracking-wider font-semibold">{t('analytics.netSavings')}</p>
            <p className={`text-2xl font-display font-bold tracking-tight ${balance >= 0 ? 'text-primary-light' : 'text-danger'}`}>
              {formatCurrency(balance)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-full bg-dark/50 border border-dark-border flex items-center justify-center relative z-10 shadow-inner">
            <span className="text-xl">💰</span>
          </div>
        </div>
      </div>

      {/* Donut Chart - Expenses */}
      {expenseTotals.length > 0 && (
        <div className="px-5 mb-5">
          <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
            <h3 className="text-sm font-semibold mb-4">💸 {t('analytics.expenseByCategory')}</h3>

            {/* Visual donut */}
            <div className="flex items-center justify-center mb-5 relative">
              <div className="h-48 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseTotalsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="amount"
                      stroke="none"
                      animationDuration={1500}
                    >
                      {expenseTotalsData.map((entry, index) => (
                        <Cell key={entry.category} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                      itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-base font-bold text-dark-text tracking-tight">{formatCurrency(expense)}</p>
                  <p className="text-[10px] text-dark-muted font-medium uppercase tracking-wider mt-0.5">Total</p>
                </div>
              </div>
            </div>

            {/* Category list */}
            <div className="space-y-2.5">
              {expenseTotals.map((item, i) => {
                const cat = getCategoryInfo(item.category as any);
                const pct = getPercentage(item.amount, expense);
                const nameCat = cat.value.startsWith('custom_') ? cat.label : (t(`category.${cat.value}`, { defaultValue: cat.label }) as string);
                return (
                  <div key={item.category} className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-card transition-colors">
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: pieColors[i % pieColors.length] }}
                    />
                    <span className="text-sm flex-1 font-medium text-dark-text">{cat.emoji} {nameCat}</span>
                    <span className="text-xs font-bold text-dark-muted w-8 text-right">{pct}%</span>
                    <span className="text-sm font-semibold w-24 text-right">{formatCurrency(item.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Income Breakdown */}
      {incomeTotals.length > 0 && (
        <div className="px-5 mb-5">
          <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
            <h3 className="text-sm font-semibold mb-4">💰 {t('txForm.incomeBtn')} / {t('txForm.categoryLabel')}</h3>
            <div className="space-y-3">
              {incomeTotals.map((item, i) => {
                const cat = getCategoryInfo(item.category as any);
                const nameCat = cat.value.startsWith('custom_') ? cat.label : (t(`category.${cat.value}`, { defaultValue: cat.label }) as string);
                const pct = getPercentage(item.amount, income);
                return (
                  <div key={item.category} className="group cursor-default">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <span className="text-sm font-medium text-dark-text">{cat.emoji} {nameCat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-dark-muted opacity-0 group-hover:opacity-100 transition-opacity">{pct}%</span>
                        <span className="text-sm font-semibold">{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-dark/80 rounded-full overflow-hidden shadow-inner border border-dark-border/20">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pieColors[i % pieColors.length],
                          boxShadow: `0 0 10px ${pieColors[i % pieColors.length]}80`
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {monthTx.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-dark-muted text-sm">{t('transactions.noData')}</p>
        </div>
      )}

      {/* AI Roast Section */}
      <div className="px-5 mt-10 mb-8 border-t border-dark-border/50 pt-8">
        <h2 className="text-xl font-display font-bold flex items-center gap-2 mb-2">
          <Flame className="text-accent" size={24} />
          {t('roast.title')} AI
        </h2>
        <p className="text-dark-muted text-xs mb-5">Dapatkan evaluasi per dompet menggunakan karakter AI</p>
        
        {/* Character Selection */}
        <div className="gradient-card rounded-2xl p-4 border border-dark-border/50 mb-4">
          <button
            onClick={() => setShowCharacters(!showCharacters)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {selectedCharAvatarUrl ? (
                  <img src={selectedCharAvatarUrl} alt={selectedChar.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  selectedChar.avatar?.length <= 4 ? selectedChar.avatar : "🎭"
                )}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-left text-dark-text">Roaster: {selectedChar.name}</h3>
                <p className="text-[10px] text-dark-muted text-left line-clamp-1">{selectedChar.personality || "Asisten pengaturan keuangan yang pedas."}</p>
              </div>
            </div>
            {showCharacters ? <ChevronUp size={16} className="text-dark-muted" /> : <ChevronDown size={16} className="text-dark-muted" />}
          </button>

          {showCharacters && (
            <div className="space-y-2 mt-4 pt-4 border-t border-dark-border/50 animate-slide-down">
              {characters.map(char => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  isSelected={selectedCharId === char.id}
                  onSelect={handleSelectChar}
                  onDelete={!char.isDefault ? handleDeleteChar : undefined}
                />
              ))}
              <button
                onClick={() => navigate('/character-creator')}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-dark-border/50 hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-dark-muted hover:text-primary-light"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">{t('settings.createNewChar')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Roast Button */}
        <button
          onClick={handleRoast}
          disabled={loadingRoast}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-300 ${
            loadingRoast
              ? 'bg-dark-border text-dark-muted cursor-wait'
              : 'bg-linear-to-r from-orange-500 via-red-500 to-pink-500 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98]'
          }`}
        >
          {loadingRoast ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              {t('roast.analyzing')}
            </>
          ) : (
            <>
              <Flame size={20} />
              {t('roast.roastMeBtn')}
            </>
          )}
        </button>

        {/* Error */}
        {roastError && (
          <div className="mt-4 animate-slide-down">
            <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
              <p className="text-sm text-dark-text">{roastError}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {roastResult && (
          <div className="mt-5 space-y-4 animate-slide-up">
            <div className="gradient-card rounded-2xl p-5 border border-dark-border/50 text-center">
              <p className="text-5xl mb-2">{roastResult.emoji}</p>
              <p className={`text-4xl font-display font-black ${getScoreColor(roastResult.score)}`}>
                {roastResult.score}/100
              </p>
              <p className="text-sm text-dark-muted mt-1">{getScoreLabel(roastResult.score)}</p>
              <p className="text-xs mt-2" style={{ color: selectedChar.color }}>
                — di-roast berdasarkan {selectedWalletId === 'all' ? 'semua dompet' : 'dompet terpilih'}
              </p>
            </div>

            <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={16} className="text-accent" />
                <h3 className="text-sm font-semibold">Roast 🔥</h3>
              </div>
              <p className="text-sm text-dark-text leading-relaxed whitespace-pre-line">
                {roastResult.roast}
              </p>
            </div>

            {roastResult.tips.length > 0 && (
              <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-warning" />
                  <h3 className="text-sm font-semibold">Tips Spesifik</h3>
                </div>
                <div className="space-y-2.5">
                  {roastResult.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-xs bg-primary/20 text-primary-light px-2 py-0.5 rounded-full font-bold shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm text-dark-text/90">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
