import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, ExternalLink, Trash2, ShoppingBag, CheckCircle2, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dreamItemStorage, walletStorage } from '../utils/opfs';
import { storage } from '../utils/storage';
import { formatCurrency } from '../utils/formatters';
import type { DreamItem, Wallet, Transaction } from '../types';

export default function DreamItems() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<DreamItem[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const loadItems = async () => {
    const [storedItems, storedWallets] = await Promise.all([
      dreamItemStorage.getAll(),
      walletStorage.getAll()
    ]);
    
    setItems(storedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setWallets(storedWallets);

    // Load images
    const urls: Record<string, string> = {};
    for (const item of storedItems) {
      if (item.image) {
        const url = await dreamItemStorage.loadImage(item.image);
        if (url) urls[item.id] = url;
      }
    }
    setImageUrls(urls);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm(t('common.deleteConfirm', 'Hapus barang impian ini?'))) {
      await dreamItemStorage.delete(id);
      loadItems();
    }
  };

  const handleBuy = async (item: DreamItem) => {
    if (!confirm(t('dream.buyConfirm', { 
      name: item.name, 
      amount: formatCurrency(item.price) 
    }))) return;

    // 1. Create transaction
    const transaction: Transaction = {
      id: `tx-dream-${Date.now()}`,
      type: 'expense',
      amount: item.price,
      category: 'shopping',
      description: `Beli Impian: ${item.name}`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      walletId: item.walletId,
    };
    storage.addTransaction(transaction);

    // 2. Complete item
    const updated = { ...item, isCompleted: true };
    await dreamItemStorage.save(updated);
    
    loadItems();
  };

  const getWalletName = (id: string) => {
    const w = wallets.find(w => w.id === id);
    return w ? `${w.icon} ${w.name}` : 'Unknown';
  };

  // Calculate savings for each wallet
  const walletBalances = wallets.reduce((acc, w) => {
    const txs = storage.getTransactions().filter(t => t.walletId === w.id || (!t.walletId && w.isMain));
    const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    acc[w.id] = income - expense;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen pb-24 bg-dark">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 sticky top-0 bg-dark/80 backdrop-blur-xl z-20 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-2xl bg-dark/50 border border-dark-border flex items-center justify-center text-dark-text active:scale-95 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-dark-text leading-none">Impian Saya</h1>
            <p className="text-xs text-dark-muted mt-1.5">{items.filter(i => !i.isCompleted).length} Barang sedang ditabung</p>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/dream-items/add')}
          className="w-10 h-10 rounded-2xl gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-transform"
        >
          <Plus size={22} />
        </button>
      </div>

      <div className="px-5 space-y-4 mt-2">
        {items.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center opacity-60">
            <div className="w-20 h-20 rounded-4xl bg-dark-card border border-dark-border flex items-center justify-center mb-4">
              <ShoppingBag size={32} className="text-dark-muted" />
            </div>
            <p className="text-dark-text font-medium">Belum ada barang impian</p>
            <p className="text-dark-muted text-sm mt-1">Tap + untuk menambah barang impian pertamamu!</p>
          </div>
        ) : (
          items.map(item => {
            const balance = walletBalances[item.walletId] || 0;
            const progress = Math.min((balance / item.price) * 100, 100);
            const isReady = balance >= item.price && !item.isCompleted;

            return (
              <div 
                key={item.id} 
                className={`gradient-card rounded-3xl border transition-all overflow-hidden ${
                  item.isCompleted 
                    ? 'border-success/20 bg-success/5 opacity-80' 
                    : isReady 
                      ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/5' 
                      : 'border-dark-border/50'
                }`}
              >
                <div className="p-4 flex gap-4">
                  {/* Image/Icon */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-dark/50 border border-dark-border overflow-hidden flex items-center justify-center">
                      {imageUrls[item.id] ? (
                        <img src={imageUrls[item.id]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-[10px] text-dark-muted">
                          <ShoppingBag size={24} className="mb-1" />
                        </div>
                      )}
                    </div>
                    {item.isCompleted && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-success rounded-full flex items-center justify-center text-white border-4 border-dark shadow-lg">
                        <CheckCircle2 size={12} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className={`font-bold text-dark-text truncate ${item.isCompleted ? 'line-through' : ''}`}>{item.name}</h3>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => navigate(`/dream-items/edit/${item.id}`)}
                          className="p-1.5 text-dark-muted hover:text-primary transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-xl font-display font-bold text-primary-light mb-1">
                      {formatCurrency(item.price)}
                    </p>
                    
                    <div className="flex items-center gap-2 text-[10px] font-medium text-dark-muted">
                      <span className="bg-dark/50 px-2 py-0.5 rounded-md border border-dark-border">{getWalletName(item.walletId)}</span>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-primary hover:underline">
                          Link <ExternalLink size={8} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Section */}
                {!item.isCompleted && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-[10px] text-dark-muted">
                        Terkumpul: <span className="text-dark-text font-bold">{formatCurrency(balance)}</span>
                      </p>
                      <p className={`text-xs font-bold ${isReady ? 'text-primary-light' : 'text-dark-muted'}`}>
                        {Math.floor(progress)}%
                      </p>
                    </div>
                    <div className="h-2 bg-dark/50 rounded-full overflow-hidden border border-dark-border/20">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isReady ? 'gradient-primary' : 'bg-dark-muted/30'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="pt-2 flex gap-2">
                      <button 
                        onClick={() => handleBuy(item)}
                        disabled={!isReady}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                          isReady 
                            ? 'gradient-primary text-white shadow-lg shadow-primary/20' 
                            : 'bg-dark-border/30 text-dark-muted cursor-not-allowed'
                        }`}
                      >
                        <ShoppingBag size={14} />
                        Beli Sekarang
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2.5 rounded-xl bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
                
                {item.isCompleted && (
                  <div className="px-4 pb-4 pt-1">
                    <div className="py-2.5 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center gap-2 text-success font-bold text-xs">
                      <CheckCircle2 size={14} />
                      Tercapai!
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
