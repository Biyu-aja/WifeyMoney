import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet as WalletIcon, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction, Wallet } from '../types';
import { storage } from '../utils/storage';
import { walletStorage } from '../utils/opfs';
import {
  formatCurrency,
  getCurrentMonth,
  getMonthLabel,
  filterByMonth,
  calculateSummary,
  getPercentage,
} from '../utils/formatters';
import TransactionForm from '../components/TransactionForm';
import TransactionCard from '../components/TransactionCard';
import DashboardCharacter from '../components/DashboardCharacter';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [settings] = useState(storage.getSettings());
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    setTransactions(storage.getTransactions());
    walletStorage.getAll().then(setWallets);
  }, []);

  const monthTransactions = filterByMonth(transactions, currentMonth);
  const { income, expense, balance } = calculateSummary(monthTransactions);
  const budgetUsed = getPercentage(expense, settings.monthlyBudget);

  const handleSave = (transaction: Transaction) => {
    let updated;
    if (editingTx) {
      updated = storage.updateTransaction(transaction);
    } else {
      updated = storage.addTransaction(transaction);
    }
    setTransactions(updated);
    setEditingTx(null);
    setShowForm(false);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTx(transaction);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const updated = storage.deleteTransaction(id);
    setTransactions(updated);
  };

  const recentTransactions = transactions.slice(0, 5);

  // Chart Colors for Wallets
  const COLORS = ['#818CF8', '#34D399', '#FBBF24', '#F472B6', '#A78BFA', '#60A5FA'];

  // Prepare line chart data
  const last7DaysChart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const display = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'id-ID', { weekday: 'short' }).format(d);
    
    const dayData: any = { name: display };
    wallets.forEach(w => {
      const wTxs = transactions.filter(t => (t.walletId === w.id || (!t.walletId && w.isMain)) && t.date <= dateStr);
      const { balance } = calculateSummary(wTxs);
      dayData[w.id] = balance;
    });
    return dayData;
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex justify-between items-center">
        <div>
          <p className="text-dark-muted text-sm">{t('dashboard.greeting', { name: settings.name })}</p>
          <h1 className="text-xl font-display font-bold mt-1">WifeyMoney</h1>
        </div>
        <button 
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-2xl bg-dark-card border border-dark-border flex items-center justify-center text-dark-muted hover:text-dark-text transition-colors active:scale-95"
        >
          <SettingsIcon size={20} />
        </button>
      </div>

      {/* Balance Card */}
      <div className="px-5 mb-5">
        <div className="gradient-primary rounded-3xl p-5 relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

          <p className="text-white/70 text-xs font-medium mb-1">{getMonthLabel(currentMonth)}</p>
          <p className="text-3xl font-display font-bold text-white mb-4">
            {formatCurrency(balance)}
          </p>

          <div className="flex flex-row gap-3 w-full">
            <div className="flex items-center gap-2 w-full">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-white/60">{t('dashboard.income')}</p>
                <p className="text-sm font-bold text-white">{formatCurrency(income)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingDown size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-white/60">{t('dashboard.expense')}</p>
                <p className="text-sm font-bold text-white">{formatCurrency(expense)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Breakdown */}
      {wallets.length > 0 && (
        <div className="px-5 mb-5 flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {wallets.map(w => {
            const wTxs = transactions.filter(t => t.walletId === w.id || (!t.walletId && w.isMain));
            const { balance: wBal } = calculateSummary(wTxs);
            return (
              <div key={w.id} className="min-w-[140px] bg-dark-card/50 rounded-2xl p-4 border border-dark-border/50 shrink-0 relative overflow-hidden group hover:border-primary/50 transition-colors">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-dark flex items-center justify-center text-sm shadow-inner">
                    {w.icon}
                  </div>
                  <span className="font-semibold text-sm text-dark-text truncate">{w.name}</span>
                </div>
                <p className="font-display font-bold text-dark-text text-lg tracking-tight relative z-10">{formatCurrency(wBal)}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Progress */}
      {settings.useBudget !== false && (
        <div className="px-5 mb-5">
          <div className="gradient-card rounded-2xl p-4 border border-dark-border/50">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <WalletIcon size={16} className="text-primary-light" />
                <span className="text-sm font-medium">{t('dashboard.monthlyBudget')}</span>
              </div>
              <span className={`text-xs font-bold ${budgetUsed > 80 ? 'text-danger' : budgetUsed > 50 ? 'text-warning' : 'text-success'}`}>
                {budgetUsed}%
              </span>
            </div>
            <div className="h-2 bg-dark/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  budgetUsed > 80 ? 'gradient-danger' : budgetUsed > 50 ? 'bg-warning' : 'gradient-success'
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
            <p className="text-xs text-dark-muted mt-2">
              {formatCurrency(expense)} {t('dashboard.from')} {formatCurrency(settings.monthlyBudget)}
            </p>
          </div>
        </div>
      )}

      {/* Wallet Trend Chart */}
      {wallets.length > 0 && (
        <div className="px-5 mb-5">
          <div className="gradient-card rounded-2xl p-5 border border-dark-border/50 overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-dark-text">{t('dashboard.last7Days')} - Tren Saldo</h3>
            </div>
            
            <div className="h-44 w-full -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7DaysChart}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 600, paddingBottom: '2px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    formatter={(value: any) => formatCurrency(value)}
                  />
                  {wallets.map((w, index) => (
                    <Line 
                      key={w.id}
                      type="monotone" 
                      dataKey={w.id} 
                      name={w.name}
                      stroke={COLORS[index % COLORS.length]} 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0, fill: COLORS[index % COLORS.length] }}
                      animationDuration={1500}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Custom chart legend below */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {wallets.map((w, index) => (
                <div key={w.id} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-[10px] text-dark-muted font-medium">{w.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold">{t('dashboard.recentTransactions')}</h3>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs text-primary-light flex items-center gap-1 hover:underline"
          >
            {t('dashboard.seeAll')} <ChevronRight size={14} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-dark-muted text-sm">{t('dashboard.noTransactions')}</p>
            <p className="text-dark-muted/60 text-xs mt-1">{t('dashboard.tapToAdd')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map(t => (
              <TransactionCard key={t.id} transaction={t} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditingTx(null);
          setShowForm(true);
        }}
        className="fixed bottom-24 right-5 w-14 h-14 gradient-primary rounded-2xl shadow-lg shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform animate-pulse-glow z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      <TransactionForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingTx(null); }}
        onSave={handleSave}
        initialData={editingTx}
      />

      {settings.useQuickRoast !== false && <DashboardCharacter />}
    </div>
  );
}
