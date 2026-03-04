import { useState, useEffect } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import type { Transaction, TransactionType } from '../types';
import { storage } from '../utils/storage';
import { formatDate } from '../utils/formatters';
import TransactionCard from '../components/TransactionCard';
import TransactionForm from '../components/TransactionForm';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setTransactions(storage.getTransactions());
  }, []);

  const handleSave = (transaction: Transaction) => {
    const updated = storage.addTransaction(transaction);
    setTransactions(updated);
  };

  const handleDelete = (id: string) => {
    const updated = storage.deleteTransaction(id);
    setTransactions(updated);
  };

  const filtered = transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.type === filterType;
    return matchSearch && matchType;
  });

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const dateKey = t.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-display font-bold">Transaksi</h1>
        <p className="text-dark-muted text-xs mt-0.5">{transactions.length} total transaksi</p>
      </div>

      {/* Search & Filter */}
      <div className="px-5 mb-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari transaksi..."
            className="w-full bg-dark-card border border-dark-border rounded-2xl pl-10 pr-4 py-3 text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'expense', 'income'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                filterType === type
                  ? 'gradient-primary text-white shadow-md shadow-primary/20'
                  : 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'
              }`}
            >
              <Filter size={12} />
              {type === 'all' ? 'Semua' : type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-5">
        {sortedDates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-dark-muted text-sm">Tidak ada transaksi ditemukan</p>
          </div>
        ) : (
          sortedDates.map(date => (
            <div key={date} className="mb-4">
              <p className="text-xs text-dark-muted font-medium mb-2 px-1">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {grouped[date].map(t => (
                  <TransactionCard key={t.id} transaction={t} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-24 right-5 w-14 h-14 gradient-primary rounded-2xl shadow-lg shadow-primary/40 flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <Plus size={24} className="text-white" />
      </button>

      <TransactionForm isOpen={showForm} onClose={() => setShowForm(false)} onSave={handleSave} />
    </div>
  );
}
