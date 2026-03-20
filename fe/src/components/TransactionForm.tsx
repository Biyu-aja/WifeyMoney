import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Plus, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, TransactionType, Category } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
import CurrencyInput from './CurrencyInput';
import { storage } from '../utils/storage';
import { useTranslation } from 'react-i18next';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  initialData?: Transaction | null;
}

export default function TransactionForm({ isOpen, onClose, onSave, initialData }: Props) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<Category | ''>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('✨');
  const [customCategories, setCustomCategories] = useState<any[]>([]);

  const { t } = useTranslation();

  const baseCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const activeCustomCategories = customCategories.filter(c => c.type === type);
  const displayedCategories = [...baseCategories, ...activeCustomCategories];

  useEffect(() => {
    if (isOpen) {
      setCustomCategories(storage.getCustomCategories());
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount);
        setCategory(initialData.category);
        setDescription(initialData.description);
        setDate(initialData.date);
      } else {
        setType('expense');
        setAmount(0);
        setCategory('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsAddingCategory(false);
        setNewCatName('');
      }
    }
  }, [isOpen, initialData]);

  const handleSaveNewCategory = () => {
    if (!newCatName.trim()) return;
    const newCat = {
      value: `custom_${Date.now()}`,
      label: newCatName.trim(),
      emoji: newCatEmoji || '✨',
      type
    };
    storage.saveCustomCategory(newCat);
    setCustomCategories(prev => [...prev, newCat]);
    setCategory(newCat.value);
    setIsAddingCategory(false);
    setNewCatName('');
  };

  const handleSubmit = () => {
    if (!amount || !category) return;

    const transaction: Transaction = {
      id: initialData?.id || uuidv4(),
      type,
      amount,
      category: category as Category,
      description: description || displayedCategories.find(c => c.value === category)?.label || '',
      date,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    onSave(transaction);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setAmount(0);
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
          <h2 className="text-lg font-display font-bold text-dark-text">
            {initialData 
              ? (type === 'expense' ? 'Edit Pengeluaran' : 'Edit Pemasukan') 
              : (type === 'expense' ? t('txForm.titleExpense') : t('txForm.titleIncome'))}
          </h2>
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
              {t('txForm.expenseBtn')}
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
              {t('txForm.incomeBtn')}
            </button>
          </div>

          {/* Amount */}
          <CurrencyInput
            label={t('txForm.amountLabel')}
            value={amount}
            onChange={setAmount}
            className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-4 text-2xl font-bold text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
          />

          {/* Date */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">{t('txForm.dateLabel')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition scheme-dark"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">{t('txForm.categoryLabel')}</label>
            <div className="grid grid-cols-3 gap-2">
              {displayedCategories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border transition-all duration-200 h-20 ${
                    category === cat.value
                      ? 'border-primary bg-primary/20 scale-[1.02]'
                      : 'border-dark-border hover:border-dark-muted/50 bg-dark-card/50'
                  }`}
                >
                  <span className="text-2xl mt-1 leading-none">{cat.emoji}</span>
                  <span className="text-[11px] font-medium text-dark-text mt-auto text-center line-clamp-1 break-all w-full px-1">
                    {cat.value.startsWith('custom_') ? cat.label : (t(`category.${cat.value}`, { defaultValue: cat.label }) as string)}
                  </span>
                </button>
              ))}
              <button
                onClick={() => setIsAddingCategory(true)}
                className="flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border border-dark-border border-dashed hover:border-primary/50 text-dark-muted hover:text-primary transition-all duration-200 h-20 bg-dark-card/30"
              >
                <span className="text-xl mt-1"><Plus size={20} /></span>
                <span className="text-[11px] font-medium mt-auto">Tambah</span>
              </button>
            </div>
            {isAddingCategory && (
              <div className="mt-3 p-3 bg-dark-card rounded-2xl border border-dark-border flex gap-2 items-center animate-fade-in shadow-xl shadow-black/20">
                <input
                  type="text"
                  value={newCatEmoji}
                  onChange={e => setNewCatEmoji(e.target.value)}
                  className="w-12 h-10 bg-dark/80 border border-dark-border rounded-xl text-center text-xl focus:outline-none focus:border-primary/50 shrink-0"
                  placeholder="✨"
                  maxLength={2}
                />
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 h-10 bg-dark/80 border border-dark-border rounded-xl px-3 text-sm text-dark-text focus:outline-none focus:border-primary/50 min-w-0"
                  placeholder="Nama Kategori"
                />
                <div className="flex gap-1 shrink-0">
                  <button 
                    onClick={handleSaveNewCategory}
                    className="w-10 h-10 flex items-center justify-center bg-primary text-dark rounded-xl hover:bg-primary-light transition-colors"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    onClick={() => setIsAddingCategory(false)}
                    className="w-10 h-10 flex items-center justify-center bg-dark border border-dark-border text-dark-muted rounded-xl hover:text-danger hover:bg-danger/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">{t('txForm.descLabel')}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('txForm.descPlaceholder')}
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
            💰 {t('txForm.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
