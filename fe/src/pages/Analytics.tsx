import { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { getCategoryInfo } from '../types';
import { storage } from '../utils/storage';
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

export default function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const { t } = useTranslation();

  useEffect(() => {
    setTransactions(storage.getTransactions());
  }, []);

  const monthTx = filterByMonth(transactions, selectedMonth);
  const expenses = monthTx.filter(t => t.type === 'expense');
  const incomes = monthTx.filter(t => t.type === 'income');
  const { income, expense, balance } = calculateSummary(monthTx);
  const expenseTotals = getCategoryTotals(expenses);
  const incomeTotals = getCategoryTotals(incomes);

  // Get available months
  const months = [...new Set(transactions.map(t => t.date.substring(0, 7)))].sort((a, b) => b.localeCompare(a));
  if (!months.includes(selectedMonth)) months.unshift(selectedMonth);

  const pieColors = [
    '#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#e17055',
    '#74b9ff', '#a29bfe', '#ffeaa7', '#55efc4', '#fab1a0',
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-display font-bold">{t('analytics.title')}</h1>
        <p className="text-dark-muted text-xs mt-0.5">{t('analytics.overview')}</p>
      </div>

      {/* Month Selector */}
      <div className="px-5 mb-5">
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
      <div className="px-5 mb-5 grid grid-cols-3 gap-3">
        <div className="gradient-card rounded-2xl p-3 border border-dark-border/50 text-center">
          <p className="text-[10px] text-dark-muted mb-1">{t('dashboard.income')}</p>
          <p className="text-sm font-bold text-success">{formatCurrency(income)}</p>
        </div>
        <div className="gradient-card rounded-2xl p-3 border border-dark-border/50 text-center">
          <p className="text-[10px] text-dark-muted mb-1">{t('dashboard.expense')}</p>
          <p className="text-sm font-bold text-danger">{formatCurrency(expense)}</p>
        </div>
        <div className="gradient-card rounded-2xl p-3 border border-dark-border/50 text-center">
          <p className="text-[10px] text-dark-muted mb-1">{t('analytics.netSavings')}</p>
          <p className={`text-sm font-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Donut Chart - Expenses */}
      {expenseTotals.length > 0 && (
        <div className="px-5 mb-5">
          <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
            <h3 className="text-sm font-semibold mb-4">💸 {t('analytics.expenseByCategory')}</h3>

            {/* Visual donut */}
            <div className="flex items-center justify-center mb-5">
              <div className="relative w-36 h-36">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    return expenseTotals.map((item, i) => {
                      const pct = (item.amount / expense) * 100;
                      const dash = `${pct} ${100 - pct}`;
                      const el = (
                        <circle
                          key={item.category}
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke={pieColors[i % pieColors.length]}
                          strokeWidth="4"
                          strokeDasharray={dash}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          className="transition-all duration-700"
                        />
                      );
                      offset += pct;
                      return el;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-dark-text">{formatCurrency(expense)}</p>
                  <p className="text-[10px] text-dark-muted">Total</p>
                </div>
              </div>
            </div>

            {/* Category list */}
            <div className="space-y-2.5">
              {expenseTotals.map((item, i) => {
                const cat = getCategoryInfo(item.category as any);
                const pct = getPercentage(item.amount, expense);
                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: pieColors[i % pieColors.length] }}
                    />
                    <span className="text-sm flex-1">{cat.emoji} {t('category.' + cat.value)}</span>
                    <span className="text-xs text-dark-muted">{pct}%</span>
                    <span className="text-sm font-semibold w-28 text-right">{formatCurrency(item.amount)}</span>
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
                const pct = getPercentage(item.amount, income);
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{cat.emoji} {t('category.' + cat.value)}</span>
                      <span className="text-sm font-semibold">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 bg-dark/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pieColors[i % pieColors.length],
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
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-dark-muted text-sm">{t('transactions.noData')}</p>
        </div>
      )}
    </div>
  );
}
