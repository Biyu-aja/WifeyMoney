import { useState, useRef, useEffect } from 'react';
import { X, Upload, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Character } from '../types/character';
import { characterStorage } from '../utils/opfs';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialData?: Character;
}

const COLOR_OPTIONS = [
  '#6c5ce7', '#e84393', '#00b894', '#fdcb6e', '#e17055',
  '#74b9ff', '#a29bfe', '#fd79a8', '#55efc4', '#f39c12',
];

const EMOJI_OPTIONS = ['🤖', '👻', '🦊', '🐉', '🧙', '👹', '🎭', '💀', '🤡', '🦹', '👽', '🧝'];

export default function CharacterForm({ isOpen, onClose, onSaved, initialData }: Props) {
  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('');
  const [promptStyle, setPromptStyle] = useState('');
  const [avatar, setAvatar] = useState('🤖');
  const [color, setColor] = useState('#6c5ce7');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [customExpressions, setCustomExpressions] = useState<{ id: string; name: string; file: File | null; preview: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setPersonality(initialData.personality);
        setPromptStyle(initialData.promptStyle.replace(/^Kamu harus merespon /, ''));
        setAvatar(initialData.avatar);
        setColor(initialData.color);
        
        if (initialData.avatar.length > 4) {
           characterStorage.loadAvatar(initialData.avatar).then(url => {
               if (url) setAvatarPreview(url);
           });
        } else {
           setAvatarPreview(null);
        }
        
        if (initialData.expressions) {
            const loadExps = async () => {
                const exps = await Promise.all(Object.entries(initialData.expressions!).map(async ([expName, fileName]) => {
                    const preview = await characterStorage.loadAvatar(fileName as string);
                    return { id: uuidv4(), name: expName, file: null, preview: preview || null };
                }));
                setCustomExpressions(exps);
            };
            loadExps();
        } else {
            setCustomExpressions([]);
        }
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File) => void, previewSetter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setter(file);
    const reader = new FileReader();
    reader.onload = () => previewSetter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name || !personality || !promptStyle) return;

    setSaving(true);
    try {
      const id = initialData ? initialData.id : uuidv4();
      let finalAvatar = avatar;
      const expressionsRecord: Record<string, string> = {};

      if (avatarFile) {
        finalAvatar = await characterStorage.saveAvatar(id, avatarFile);
      }

      for (const exp of customExpressions) {
        if (exp.name) {
          if (exp.file) {
             const fileName = await characterStorage.saveAvatar(id, exp.file, exp.name.toLowerCase().replace(/\s+/g, '-'));
             expressionsRecord[exp.name] = fileName;
          } else if (initialData && initialData.expressions && initialData.expressions[exp.name]) {
             expressionsRecord[exp.name] = initialData.expressions[exp.name];
          }
        }
      }

      const character: Character = {
        id,
        name,
        avatar: finalAvatar,
        expressions: Object.keys(expressionsRecord).length > 0 ? expressionsRecord : undefined,
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
    setCustomExpressions([]);
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
            {initialData ? 'Edit Karakter' : 'Buat Karakter Baru'}
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
                onChange={(e) => handleFileChange(e, setAvatarFile, setAvatarPreview)}
                className="hidden"
              />

              <span className="text-xs text-dark-muted">atau pilih emoji:</span>
            </div>

            {avatarPreview && (
              <div className="mb-4 bg-dark-card/30 p-4 rounded-2xl border border-dark-border/50">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs text-dark-text font-medium block">Opsional: Tambah Ekspresi Wajah</label>
                  <button 
                    onClick={() => setCustomExpressions([...customExpressions, { id: uuidv4(), name: '', file: null, preview: null }])}
                    className="text-[10px] bg-primary/20 text-primary-light px-2 py-1 rounded-lg hover:bg-primary/30 transition"
                  >
                    + Tambah Ekspresi
                  </button>
                </div>
                
                <div className="flex flex-col gap-3">
                  {customExpressions.map((exp, idx) => (
                    <div key={exp.id} className="flex gap-3 items-center bg-dark/30 p-2 rounded-xl">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          placeholder="Nama emosi (ex: marah banget)"
                          value={exp.name}
                          onChange={(e) => {
                            const newExp = [...customExpressions];
                            newExp[idx].name = e.target.value;
                            setCustomExpressions(newExp);
                          }}
                          className="w-full text-xs bg-dark-card border border-dark-border rounded-lg px-2 py-2 text-dark-text outline-none focus:border-primary/50"
                        />
                      </div>
                      <div className="relative">
                        <label className="w-10 h-10 rounded-lg border border-dashed border-dark-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition bg-dark-card overflow-hidden">
                          {exp.preview ? <img src={exp.preview} alt={exp.name} className="w-full h-full object-cover" /> : <Upload size={14} className="text-dark-muted" />}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const newExp = [...customExpressions];
                                    newExp[idx].file = file;
                                    newExp[idx].preview = reader.result as string;
                                    setCustomExpressions(newExp);
                                };
                                reader.readAsDataURL(file);
                            }} 
                           />
                        </label>
                      </div>
                      <button 
                        onClick={() => setCustomExpressions(customExpressions.filter(c => c.id !== exp.id))}
                        className="p-1.5 text-red-400 hover:bg-red-400/20 rounded-lg transition"
                      >
                         <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {customExpressions.length === 0 && (
                    <p className="text-[10px] text-dark-muted italic">Karaktermu bisa ganti muka sesuai roast (marah, sedih, girang). Klik tombol tambah!</p>
                  )}
                </div>
              </div>
            )}

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
            {saving ? '⏳ Menyimpan...' : (initialData ? '💾 Simpan Perubahan' : '✨ Buat Karakter')}
          </button>
        </div>
      </div>
    </div>
  );
}
