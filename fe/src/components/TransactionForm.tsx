import { useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, TransactionType, Category } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
}

export default function TransactionForm({ isOpen, onClose, onSave }: Props) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = () => {
    if (!amount || !category) return;

    const transaction: Transaction = {
      id: uuidv4(),
      type,
      amount: parseFloat(amount),
      category: category as Category,
      description: description || categories.find(c => c.value === category)?.label || '',
      date,
      createdAt: new Date().toISOString(),
    };

    onSave(transaction);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDescription('');
    setType('expense');
    setDate(new Date().toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => { resetForm(); onClose(); }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-strong rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-dark-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-display font-bold text-dark-text">Transaksi Baru</h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 rounded-full hover:bg-dark-border/50 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Type Toggle */}
          <div className="flex gap-2 p-1 bg-dark/50 rounded-2xl">
            <button
              onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                type === 'expense'
                  ? 'gradient-danger text-white shadow-lg shadow-danger/30'
                  : 'text-dark-muted'
              }`}
            >
              <TrendingDown size={18} />
              Pengeluaran
            </button>
            <button
              onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                type === 'income'
                  ? 'gradient-success text-white shadow-lg shadow-success/30'
                  : 'text-dark-muted'
              }`}
            >
              <TrendingUp size={18} />
              Pemasukan
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Jumlah (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-4 text-2xl font-bold text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition scheme-dark"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Kategori</label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all duration-200 ${
                    category === cat.value
                      ? 'border-primary bg-primary/20 scale-[1.02]'
                      : 'border-dark-border hover:border-dark-muted/50'
                  }`}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[11px] font-medium text-dark-text">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Catatan (opsional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat..."
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!amount || !category}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all duration-300 ${
              amount && category
                ? 'gradient-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.98]'
                : 'bg-dark-border text-dark-muted cursor-not-allowed'
            }`}
          >
            💰 Simpan Transaksi
          </button>
        </div>
      </div>
    </div>
  );
}
