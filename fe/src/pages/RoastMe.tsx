import { useState, useEffect } from 'react';
import { Flame, Sparkles, RefreshCw, TrendingDown, AlertTriangle, Heart } from 'lucide-react';
import type { Transaction } from '../types';
import { storage } from '../utils/storage';
import {
  formatCurrency,
  getCurrentMonth,
  filterByMonth,
  calculateSummary,
  getCategoryTotals,
} from '../utils/formatters';
import { getCategoryInfo } from '../types';

interface RoastResult {
  roast: string;
  tips: string[];
  score: number;
  emoji: string;
}

export default function RoastMe() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setTransactions(storage.getTransactions());
  }, []);

  const currentMonth = getCurrentMonth();
  const monthTx = filterByMonth(transactions, currentMonth);
  const expenses = monthTx.filter(t => t.type === 'expense');
  const { income, expense, balance } = calculateSummary(monthTx);
  const categoryTotals = getCategoryTotals(expenses);
  const settings = storage.getSettings();

  const handleRoast = async () => {
    if (monthTx.length === 0) {
      setError('Belum ada transaksi bulan ini. Catat dulu pengeluaranmu baru di-roast! 🔥');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const summaryData = {
        name: settings.name,
        monthlyBudget: settings.monthlyBudget,
        totalIncome: income,
        totalExpense: expense,
        balance,
        budgetUsedPercent: Math.round((expense / settings.monthlyBudget) * 100),
        topCategories: categoryTotals.slice(0, 5).map(c => ({
          category: getCategoryInfo(c.category as any).label,
          amount: c.amount,
          percent: Math.round((c.amount / expense) * 100),
        })),
        transactionCount: monthTx.length,
        avgDailyExpense: Math.round(expense / new Date().getDate()),
      };

      const response = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryData),
      });

      if (!response.ok) throw new Error('Gagal mendapatkan roast');

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Waduh, AI-nya lagi error. Coba lagi nanti ya! 😅');
      console.error(err);
    } finally {
      setLoading(false);
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
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-display font-bold flex items-center gap-2">
          <Flame className="text-accent" size={24} />
          AI Roast
        </h1>
        <p className="text-dark-muted text-xs mt-0.5">Siap mental? AI bakal nge-roast keuanganmu! 🔥</p>
      </div>

      {/* Quick Stats */}
      <div className="px-5 mb-5">
        <div className="gradient-card rounded-2xl p-4 border border-dark-border/50">
          <h3 className="text-xs text-dark-muted mb-3">📊 Data yang akan di-roast:</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark/30 rounded-xl p-3">
              <p className="text-[10px] text-dark-muted">Total Pengeluaran</p>
              <p className="text-sm font-bold text-danger">{formatCurrency(expense)}</p>
            </div>
            <div className="bg-dark/30 rounded-xl p-3">
              <p className="text-[10px] text-dark-muted">Total Pemasukan</p>
              <p className="text-sm font-bold text-success">{formatCurrency(income)}</p>
            </div>
            <div className="bg-dark/30 rounded-xl p-3">
              <p className="text-[10px] text-dark-muted">Budget Terpakai</p>
              <p className="text-sm font-bold text-warning">
                {settings.monthlyBudget > 0 ? Math.round((expense / settings.monthlyBudget) * 100) : 0}%
              </p>
            </div>
            <div className="bg-dark/30 rounded-xl p-3">
              <p className="text-[10px] text-dark-muted">Jumlah Transaksi</p>
              <p className="text-sm font-bold text-primary-light">{monthTx.length}</p>
            </div>
          </div>

          {categoryTotals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-border/30">
              <p className="text-[10px] text-dark-muted mb-2">Top Pengeluaran:</p>
              <div className="flex flex-wrap gap-1.5">
                {categoryTotals.slice(0, 4).map(c => {
                  const cat = getCategoryInfo(c.category as any);
                  return (
                    <span key={c.category} className="px-2.5 py-1 bg-dark/50 rounded-lg text-[11px]">
                      {cat.emoji} {cat.label}: {formatCurrency(c.amount)}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roast Button */}
      <div className="px-5 mb-5">
        <button
          onClick={handleRoast}
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-300 ${
            loading
              ? 'bg-dark-border text-dark-muted cursor-wait'
              : 'bg-linear-to-r from-orange-500 via-red-500 to-pink-500 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 active:scale-[0.98]'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              AI lagi mikir...
            </>
          ) : (
            <>
              <Flame size={20} />
              🔥 ROAST KEUANGANKU! 🔥
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 mb-5 animate-slide-down">
          <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
            <p className="text-sm text-dark-text">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="px-5 space-y-4 animate-slide-up">
          {/* Score */}
          <div className="gradient-card rounded-2xl p-5 border border-dark-border/50 text-center">
            <p className="text-5xl mb-2">{result.emoji}</p>
            <p className={`text-4xl font-display font-black ${getScoreColor(result.score)}`}>
              {result.score}/100
            </p>
            <p className="text-sm text-dark-muted mt-1">{getScoreLabel(result.score)}</p>
          </div>

          {/* Roast Text */}
          <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
            <div className="flex items-center gap-2 mb-3">
              <Flame size={16} className="text-accent" />
              <h3 className="text-sm font-semibold">Roast 🔥</h3>
            </div>
            <p className="text-sm text-dark-text leading-relaxed whitespace-pre-line">
              {result.roast}
            </p>
          </div>

          {/* Tips */}
          {result.tips.length > 0 && (
            <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-warning" />
                <h3 className="text-sm font-semibold">Tips Biar Gak Di-Roast Lagi</h3>
              </div>
              <div className="space-y-2.5">
                {result.tips.map((tip, i) => (
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

          {/* Roast Again */}
          <button
            onClick={handleRoast}
            className="w-full py-3 rounded-2xl border border-dark-border text-dark-muted text-sm font-medium hover:border-primary/50 hover:text-primary-light transition flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Roast Lagi dong! 🤣
          </button>
        </div>
      )}

      {/* Empty state when no result */}
      {!result && !error && !loading && (
        <div className="px-5">
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-float">🔥</div>
            <p className="text-dark-muted text-sm mb-1">AI akan menganalisis pengeluaranmu</p>
            <p className="text-dark-muted/60 text-xs">dan memberikan roast + saran keuangan</p>
            <div className="flex items-center justify-center gap-4 mt-6 text-dark-muted/40">
              <div className="flex flex-col items-center gap-1">
                <TrendingDown size={20} />
                <span className="text-[10px]">Analisa</span>
              </div>
              <span>→</span>
              <div className="flex flex-col items-center gap-1">
                <Flame size={20} />
                <span className="text-[10px]">Roast</span>
              </div>
              <span>→</span>
              <div className="flex flex-col items-center gap-1">
                <Heart size={20} />
                <span className="text-[10px]">Tips</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
