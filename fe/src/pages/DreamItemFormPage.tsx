import { useState, useEffect } from 'react';
import { ChevronLeft, Camera, Link as LinkIcon, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { walletStorage, dreamItemStorage } from '../utils/opfs';
import type { Wallet, DreamItem } from '../types';
import CurrencyInput from '../components/CurrencyInput';

export default function DreamItemFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [walletId, setWalletId] = useState('');
  const [link, setLink] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [existingItem, setExistingItem] = useState<DreamItem | null>(null);

  useEffect(() => {
    walletStorage.getAll().then(data => {
      setWallets(data);
      if (data.length > 0 && !walletId) {
        const main = data.find(w => w.isMain) || data[0];
        setWalletId(main.id);
      }
    });

    if (id) {
      setIsEdit(true);
      dreamItemStorage.getById(id).then(item => {
        if (item) {
          setExistingItem(item);
          setName(item.name);
          setPrice(item.price);
          setWalletId(item.walletId);
          setLink(item.link || '');
          if (item.image) {
            dreamItemStorage.loadImage(item.image).then(url => {
              if (url) setImagePreview(url);
            });
          }
        } else {
          navigate('/dream-items');
        }
      });
    }
  }, [id, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name || !price || !walletId) return;

    const item: DreamItem = {
      id: id || `dream-${Date.now()}`,
      name,
      price,
      walletId,
      link,
      image: existingItem?.image,
      createdAt: existingItem?.createdAt || new Date().toISOString(),
      isCompleted: existingItem?.isCompleted || false,
    };

    await dreamItemStorage.save(item, imageFile || undefined);
    navigate('/dream-items');
  };

  return (
    <div className="min-h-screen bg-dark pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-dark/80 backdrop-blur-md z-10 border-b border-dark-border/50">
        <button 
          onClick={() => navigate('/dream-items')}
          className="p-2 -ml-2 text-dark-muted hover:text-dark-text transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-display font-bold">
          {isEdit ? t('dream.edit', 'Edit Barang Impian') : t('dream.add', 'Tambah Barang Impian')}
        </h1>
      </div>

      <div className="p-5 max-w-lg mx-auto space-y-6">
        {/* Image Upload */}
        <div className="flex justify-center py-4">
          <div className="relative group">
            <div className="w-40 h-40 rounded-3xl bg-dark-card border-2 border-dashed border-dark-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 shadow-inner">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera size={40} className="text-dark-muted group-hover:text-primary transition-colors" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white shadow-xl">
              <Plus size={20} />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <label className="text-xs font-semibold text-dark-muted mb-2 block uppercase tracking-wider">{t('dream.name', 'Nama Barang')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="misal: PS5, Laptop Baru, Liburan"
              className="w-full bg-dark-card/50 border border-dark-border/50 p-4 rounded-2xl outline-none focus:border-primary/50 transition-all text-dark-text"
            />
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <label className="text-xs font-semibold text-dark-muted mb-2 block uppercase tracking-wider">{t('dream.price', 'Harga Target')}</label>
            <CurrencyInput
              value={price}
              onChange={setPrice}
            />
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <label className="text-xs font-semibold text-dark-muted mb-2 block uppercase tracking-wider">{t('dream.wallet', 'Dompet Tabungan')}</label>
            <div className="grid grid-cols-2 gap-3">
              {wallets.map(w => (
                <button
                  key={w.id}
                  onClick={() => setWalletId(w.id)}
                  className={`flex items-center gap-2 p-4 rounded-2xl border transition-all text-sm font-semibold shadow-sm ${
                    walletId === w.id
                      ? 'bg-primary/10 border-primary text-primary-light'
                      : 'bg-dark-card/30 border-dark-border/50 text-dark-muted hover:border-dark-border'
                  }`}
                >
                  <span className="text-lg">{w.icon}</span>
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
            <label className="text-xs font-semibold text-dark-muted mb-2 block uppercase tracking-wider">{t('dream.link', 'Link Produk (Opsional)')}</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted">
                <LinkIcon size={18} />
              </div>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://shopee.co.id/..."
                className="w-full bg-dark-card/50 border border-dark-border/50 p-4 pl-12 rounded-2xl outline-none focus:border-primary/50 transition-all text-dark-text"
              />
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button
            onClick={handleSave}
            disabled={!name || !price || !walletId}
            className="w-full py-4 rounded-2xl font-bold text-white gradient-primary shadow-lg shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2 text-base"
          >
            <Check size={24} />
            {isEdit ? t('common.save', 'Simpan Perubahan') : t('common.save', 'Tambah Impian')}
          </button>
          
          <button
            onClick={() => navigate('/dream-items')}
            className="w-full mt-3 py-4 rounded-2xl font-bold text-dark-muted hover:text-dark-text transition-all active:scale-95 text-sm"
          >
            {t('common.cancel', 'Batal')}
          </button>
        </div>
      </div>
    </div>
  );
}
