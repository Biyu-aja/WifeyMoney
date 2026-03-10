import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Wallet, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '../types';
import { storage } from '../utils/storage';
import {
  formatCurrency,
  getCurrentMonth,
  getMonthLabel,
  filterByMonth,
  calculateSummary,
  getDailySummaries,
  getPercentage,
} from '../utils/formatters';
import TransactionForm from '../components/TransactionForm';
import TransactionCard from '../components/TransactionCard';
import DashboardCharacter from '../components/DashboardCharacter';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [settings] = useState(storage.getSettings());
  const navigate = useNavigate();
  const { t } = useTranslation();

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    setTransactions(storage.getTransactions());
  }, []);

  const monthTransactions = filterByMonth(transactions, currentMonth);
  const { income, expense, balance } = calculateSummary(monthTransactions);
  const budgetUsed = getPercentage(expense, settings.monthlyBudget);
  const dailySummaries = getDailySummaries(transactions, 7);

  const handleSave = (transaction: Transaction) => {
    const updated = storage.addTransaction(transaction);
    setTransactions(updated);
  };

  const handleDelete = (id: string) => {
    const updated = storage.deleteTransaction(id);
    setTransactions(updated);
  };

  const recentTransactions = transactions.slice(0, 5);
  const maxDaily = Math.max(...dailySummaries.map(d => Math.max(d.income, d.expense)), 1);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-dark-muted text-sm">{t('dashboard.greeting', { name: settings.name })}</p>
        <h1 className="text-xl font-display font-bold mt-1">WifeyMoney</h1>
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

      {/* Budget Progress */}
      {settings.useBudget !== false && (
        <div className="px-5 mb-5">
          <div className="gradient-card rounded-2xl p-4 border border-dark-border/50">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-primary-light" />
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

      {/* Mini Chart */}
      <div className="px-5 mb-5">
        <div className="gradient-card rounded-2xl p-4 border border-dark-border/50">
          <h3 className="text-sm font-semibold mb-3">{t('dashboard.last7Days')}</h3>
          <div className="flex items-end gap-1.5 h-20">
            {dailySummaries.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5 items-center" style={{ height: 60 }}>
                  {day.expense > 0 && (
                    <div
                      className="w-full bg-danger/40 rounded-sm"
                      style={{ height: `${(day.expense / maxDaily) * 60}px`, minHeight: day.expense > 0 ? 3 : 0 }}
                    />
                  )}
                  {day.income > 0 && (
                    <div
                      className="w-full bg-success/40 rounded-sm"
                      style={{ height: `${(day.income / maxDaily) * 60}px`, minHeight: day.income > 0 ? 3 : 0 }}
                    />
                  )}
                </div>
                <span className="text-[9px] text-dark-muted">{day.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              <TransactionCard key={t.id} transaction={t} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-5 w-14 h-14 gradient-primary rounded-2xl shadow-lg shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform animate-pulse-glow z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      <TransactionForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />

      {settings.useQuickRoast !== false && <DashboardCharacter />}
    </div>
  );
}
