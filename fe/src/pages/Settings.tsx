import { useState } from 'react';
import { Save, User, Wallet, Trash2, X, AlertTriangle } from 'lucide-react';
import { storage } from '../utils/storage';
import { characterStorage } from '../utils/opfs';
import type { UserSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import CurrencyInput from '../components/CurrencyInput';

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>(storage.getSettings());

  const [saved, setSaved] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const handleSave = () => {
    storage.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearTransactions = () => {
    storage.saveTransactions([]);
    window.location.reload();
  };

  const handleClearCharacters = async () => {
    await characterStorage.clearAll();
    window.location.reload();
  };

  const handleClearAll = async () => {
    storage.saveTransactions([]);
    await characterStorage.clearAll();
    window.location.reload();
  };

  const budgetOptions = [1000000, 2000000, 3000000, 5000000, 7500000, 10000000, 15000000, 20000000];

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-xl font-display font-bold">Pengaturan</h1>
        <p className="text-dark-muted text-xs mt-0.5">Personalisasi aplikasi kamu</p>
      </div>

      <div className="px-5 space-y-5">
        {/* Profile */}
        <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
          <div className="flex items-center gap-2 mb-4">
            <User size={16} className="text-primary-light" />
            <h3 className="text-sm font-semibold">Profil</h3>
          </div>

          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Nama Panggilan</label>
            <input
              type="text"
              value={settings.name}
              onChange={e => setSettings({ ...settings, name: e.target.value })}
              placeholder="Nama kamu"
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>
        </div>

        {/* Budget */}
        <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-primary-light" />
              <h3 className="text-sm font-semibold">Budget Bulanan</h3>
            </div>
            <button
              onClick={() => setSettings({ ...settings, useBudget: settings.useBudget === false ? true : false })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.useBudget !== false ? 'bg-primary' : 'bg-dark-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.useBudget !== false ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {settings.useBudget !== false && (
            <>

          <div className="mb-3">
            <CurrencyInput
              label="Jumlah Budget (Rp)"
              value={settings.monthlyBudget}
              onChange={val => setSettings({ ...settings, monthlyBudget: val })}
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {budgetOptions.map(b => (
              <button
                key={b}
                onClick={() => setSettings({ ...settings, monthlyBudget: b })}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  settings.monthlyBudget === b
                    ? 'gradient-primary text-white'
                    : 'bg-dark/50 border border-dark-border text-dark-muted hover:text-dark-text'
                }`}
              >
                {formatCurrency(b)}
              </button>
            ))}
          </div>
          </>
          )}
        </div>

        {/* Display Settings */}
        <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Format Uang Singkat</h3>
              <p className="text-xs text-dark-muted mt-1">Tampilkan Rp1.000.000 sebagai Rp1M</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, useCompactCurrency: !settings.useCompactCurrency })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.useCompactCurrency ? 'bg-primary' : 'bg-dark-border'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.useCompactCurrency ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-300 ${
            saved
              ? 'bg-success shadow-lg shadow-success/30'
              : 'gradient-primary shadow-lg shadow-primary/30 hover:shadow-xl active:scale-[0.98]'
          }`}
        >
          <Save size={18} />
          {saved ? '✅ Tersimpan!' : 'Simpan Pengaturan'}
        </button>

        {/* Danger Zone */}
        <div className="gradient-card rounded-2xl p-5 border border-danger/20">
          <h3 className="text-sm font-semibold text-danger mb-3">⚠️ Zona Bahaya</h3>
          <button
            onClick={() => setShowClearModal(true)}
            className="w-full py-3 rounded-2xl border border-danger/30 text-danger text-sm font-medium hover:bg-danger/10 transition flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Hapus Data / Reset
          </button>
        </div>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-dark-muted/40 text-xs">WifeyMoney v1.0.0</p>
          <p className="text-dark-muted/30 text-[10px] mt-1">Made with 💜 for your financial health</p>
        </div>
      </div>

      {/* Clear Data Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-dark/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-card border border-dark-border shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-dark-border/50">
              <h3 className="font-display font-bold text-lg flex items-center gap-2 text-danger">
                <AlertTriangle size={20} />
                Zone Bahaya
              </h3>
              <button 
                onClick={() => setShowClearModal(false)}
                className="p-2 rounded-full text-dark-muted hover:text-white hover:bg-dark-border transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-sm text-dark-muted">
                Pilih data apa yang ingin kamu hapus secara permanen. Operasi ini tidak dapat dibatalkan!
              </p>

              <button 
                onClick={handleClearTransactions}
                className="w-full p-4 rounded-2xl border border-dark-border hover:border-warning/50 hover:bg-warning/10 transition group text-left"
              >
                <h4 className="font-semibold text-warning group-hover:text-warning-light transition">Hapus Riwayat Transaksi</h4>
                <p className="text-xs text-dark-muted mt-1">Uang masuk, pengeluaran bulanan, dan sisa budget akan direset.</p>
              </button>

              <button 
                onClick={handleClearCharacters}
                className="w-full p-4 rounded-2xl border border-dark-border hover:border-primary/50 hover:bg-primary/10 transition group text-left"
              >
                <h4 className="font-semibold text-primary-light group-hover:text-white transition">Hapus Karakter AI</h4>
                <p className="text-xs text-dark-muted mt-1">Semua karakter kustom dan file fotonya di memori akan hilang (kembali ke bawaan).</p>
              </button>

              <div className="pt-2">
                <button 
                  onClick={handleClearAll}
                  className="w-full p-4 rounded-2xl bg-danger/10 border border-danger/30 hover:bg-danger hover:text-white text-danger transition text-center font-bold"
                >
                  💣 RESET TOTAL APLIKASI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
