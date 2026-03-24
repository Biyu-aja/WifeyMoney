import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { walletStorage } from '../utils/opfs';
import type { Wallet } from '../types';

export default function Wallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loadWallets = async () => {
    const data = await walletStorage.getAll();
    setWallets(data);
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleSave = async () => {
    if (!editName.trim() || !editIcon.trim()) return;

    const newWallet: Wallet = {
      id: isEditing || `wallet-${Date.now()}`,
      name: editName,
      icon: editIcon,
      isMain: isEditing ? wallets.find(w => w.id === isEditing)?.isMain : false,
    };

    await walletStorage.save(newWallet);
    setEditName('');
    setEditIcon('');
    setIsEditing(null);
    setShowForm(false);
    loadWallets();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('common.deleteConfirm', 'Are you sure you want to delete this?'))) {
      try {
        await walletStorage.delete(id);
        loadWallets();
      } catch (e: any) {
        alert(e.message);
      }
    }
  };

  const handleEdit = (wallet: Wallet) => {
    setIsEditing(wallet.id);
    setEditName(wallet.name);
    setEditIcon(wallet.icon);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-6 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-dark-card flex items-center justify-center text-dark-text border border-dark-border hover:bg-dark-border transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-display font-bold text-dark-text">{t('wallets.title', 'Manajemen Dompet')}</h1>
        </div>
        <button 
          onClick={() => {
            setIsEditing(null);
            setEditName('');
            setEditIcon('💸');
            setShowForm(true);
          }}
          className="w-10 h-10 rounded-full gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="px-5 mt-2 space-y-3">
        {wallets.map(wallet => (
          <div key={wallet.id} className="gradient-card rounded-2xl p-4 border border-dark-border/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-dark/50 border border-dark-border flex items-center justify-center text-2xl">
                {wallet.icon}
              </div>
              <div>
                <h3 className="font-semibold text-dark-text">{wallet.name}</h3>
                {wallet.isMain && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">
                    {t('wallets.main', 'Utama')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleEdit(wallet)}
                className="w-8 h-8 rounded-lg text-dark-muted hover:bg-dark-border/50 flex items-center justify-center transition-colors"
              >
                <Edit2 size={16} />
              </button>
              {!wallet.isMain && (
                <button 
                  onClick={() => handleDelete(wallet.id)}
                  className="w-8 h-8 rounded-lg text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="glass-strong w-full max-w-sm rounded-4xl p-6 animate-slide-up shadow-xl border border-dark-border" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-display px-2 text-dark-text">
                {isEditing ? t('wallets.edit', 'Edit Dompet') : t('wallets.add', 'Tambah Dompet')}
              </h2>
            </div>
            
            <div className="space-y-4 px-2">
              <div>
                <label className="text-xs font-semibold text-dark-muted mb-2 block">{t('wallets.name', 'Nama Dompet')}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Dana, GoPay"
                  className="w-full bg-dark/50 border border-dark-border px-4 py-3 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium text-dark-text"
                />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-dark-muted mb-2 block">{t('wallets.icon', 'Ikon (Emoji)')}</label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={e => setEditIcon(e.target.value)}
                  placeholder="e.g. 💳, 💰"
                  maxLength={2}
                  className="w-full bg-dark/50 border border-dark-border px-4 py-3 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-xl font-medium text-center text-dark-text"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3 px-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-dark-text bg-dark-border/50 hover:bg-dark-border transition-colors"
              >
                {t('common.cancel', 'Batal')}
              </button>
              <button
                onClick={handleSave}
                disabled={!editName.trim() || !editIcon.trim()}
                className="flex-1 py-3.5 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {t('common.save', 'Simpan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
