import { useState, useRef } from 'react';
import { X, Upload, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Character } from '../types/character';
import { characterStorage } from '../utils/opfs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const COLOR_OPTIONS = [
  '#6c5ce7', '#e84393', '#00b894', '#fdcb6e', '#e17055',
  '#74b9ff', '#a29bfe', '#fd79a8', '#55efc4', '#f39c12',
];

const EMOJI_OPTIONS = ['🤖', '👻', '🦊', '🐉', '🧙', '👹', '🎭', '💀', '🤡', '🦹', '👽', '🧝'];

export default function CharacterForm({ isOpen, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [promptStyle, setPromptStyle] = useState('');
  const [avatar, setAvatar] = useState('🤖');
  const [color, setColor] = useState('#6c5ce7');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name || !personality || !promptStyle) return;

    setSaving(true);
    try {
      const id = uuidv4();
      let finalAvatar = avatar;

      if (avatarFile) {
        finalAvatar = await characterStorage.saveAvatar(id, avatarFile);
      }

      const character: Character = {
        id,
        name,
        avatar: finalAvatar,
        personality,
        promptStyle: `Kamu harus merespon ${promptStyle}`,
        color,
        isDefault: false,
      };

      await characterStorage.save(character);
      onSaved();
      resetForm();
      onClose();
    } catch (err) {
      console.error('Failed to save character:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPersonality('');
    setPromptStyle('');
    setAvatar('🤖');
    setColor('#6c5ce7');
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => { resetForm(); onClose(); }}
      />

      <div className="relative w-full max-w-lg glass-strong rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-dark-border rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-display font-bold text-dark-text flex items-center gap-2">
            <Sparkles size={18} className="text-primary-light" />
            Buat Karakter Baru
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 rounded-full hover:bg-dark-border/50 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-5">
          {/* Avatar Section */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-3 block">Avatar</label>

            {/* Image upload */}
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-dark-border flex flex-col items-center justify-center hover:border-primary/50 transition"
                style={{ backgroundColor: avatarPreview ? undefined : color + '15' }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <>
                    <Upload size={16} className="text-dark-muted" />
                    <span className="text-[8px] text-dark-muted mt-0.5">Upload</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <span className="text-xs text-dark-muted">atau pilih emoji:</span>
            </div>

            {/* Emoji picker */}
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  onClick={() => { setAvatar(e); setAvatarFile(null); setAvatarPreview(null); }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                    avatar === e && !avatarFile
                      ? 'bg-primary/20 border-2 border-primary scale-110'
                      : 'bg-dark/30 border border-dark-border/50 hover:border-dark-border'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Warna Aksen</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Nama Karakter</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Si Pelit Abis"
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Personality */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Deskripsi Singkat</label>
            <input
              type="text"
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              placeholder="Contoh: Teman yang super pelit dan suka ngitung uang receh"
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Prompt Style */}
          <div>
            <label className="text-xs text-dark-muted font-medium mb-2 block">Gaya Ngomong / Prompt</label>
            <textarea
              value={promptStyle}
              onChange={e => setPromptStyle(e.target.value)}
              placeholder="Jelaskan cara karakter ini nge-roast. Contoh: bicara pakai bahasa Jawa campur, suka bilang 'rek' dan 'tolong iki gak usah boros'..."
              rows={3}
              className="w-full bg-dark/50 border border-dark-border rounded-2xl px-4 py-3 text-dark-text placeholder:text-dark-muted/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition resize-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSave}
            disabled={!name || !personality || !promptStyle || saving}
            className={`w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-300 ${
              name && personality && promptStyle && !saving
                ? 'gradient-primary shadow-lg shadow-primary/30 hover:shadow-xl active:scale-[0.98]'
                : 'bg-dark-border text-dark-muted cursor-not-allowed'
            }`}
          >
            {saving ? '⏳ Menyimpan...' : '✨ Buat Karakter'}
          </button>
        </div>
      </div>
    </div>
  );
}
