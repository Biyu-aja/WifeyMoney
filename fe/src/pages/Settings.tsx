import { useState } from 'react';
import { Save, User, Wallet, Trash2 } from 'lucide-react';
import { storage } from '../utils/storage';
import type { UserSettings } from '../types';
import { formatCurrency } from '../utils/formatters';
import CurrencyInput from '../components/CurrencyInput';

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>(storage.getSettings());

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    storage.saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (window.confirm('Yakin hapus semua data transaksi? Ini tidak bisa dibatalkan! 😱')) {
      storage.saveTransactions([]);
      window.location.reload();
    }
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
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={16} className="text-primary-light" />
            <h3 className="text-sm font-semibold">Budget Bulanan</h3>
          </div>

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
            onClick={handleClearData}
            className="w-full py-3 rounded-2xl border border-danger/30 text-danger text-sm font-medium hover:bg-danger/10 transition flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            Hapus Semua Data Transaksi
          </button>
        </div>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-dark-muted/40 text-xs">WifeyMoney v1.0.0</p>
          <p className="text-dark-muted/30 text-[10px] mt-1">Made with 💜 for your financial health</p>
        </div>
      </div>
    </div>
  );
}
