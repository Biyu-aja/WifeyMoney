import { useState } from 'react';
import { Camera, Image as ImageIcon, Save, ArrowLeft, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { characterStorage } from '../utils/opfs';
import type { Character } from '../types/character';
import { useTranslation } from 'react-i18next';

// Helper to convert base64 or data url to File object
function dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(','), mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    var mime = mimeMatch[1],
        bstr = atob(arr[1]), 
        n = bstr.length, 
        u8arr = new Uint8Array(n);
        
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, {type:mime});
}

export default function CharacterCreator() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [personality, setPersonality] = useState('');
    const [promptStyle, setPromptStyle] = useState('');
    const { t } = useTranslation();
    
    const [baseImage, setBaseImage] = useState<string | null>(null);
    const [emotions, setEmotions] = useState<Record<string, string | null>>({
        senang: null,
        sedih: null,
        marah: null
    });
    
    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [newEmotionName, setNewEmotionName] = useState('');
    const [isAddingEmotion, setIsAddingEmotion] = useState(false);

    const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setBaseImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleEmotionUpload = (emotion: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setEmotions(prev => ({ ...prev, [emotion]: reader.result as string }));
            reader.readAsDataURL(file);
        }
    };

    const handleAddEmotion = () => {
        if (!newEmotionName.trim()) return;
        const formattedName = newEmotionName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (formattedName && !emotions.hasOwnProperty(formattedName)) {
            setEmotions(prev => ({ ...prev, [formattedName]: null }));
        }
        setNewEmotionName('');
        setIsAddingEmotion(false);
    };

    const handleRemoveEmotion = (emotion: string) => {
        setEmotions(prev => {
            const next = { ...prev };
            delete next[emotion];
            return next;
        });
    };

    const handleSave = async () => {
        if (!name || !baseImage) {
            alert(t('charCreator.fillNamePrompt') + ' ' + t('charCreator.avatarRequired'));
            return;
        }

        setSaveStatus('Menyimpan...');
        try {
            const id = 'custom-' + Date.now();
            
            const baseFile = dataURLtoFile(baseImage, 'avatar.png');
            let avatarFilename = 'avatar.png';
            if (baseFile) {
                avatarFilename = await characterStorage.saveAvatar(id, baseFile);
            } else if (baseImage.startsWith('http')) {
                avatarFilename = baseImage;
            }

            const expressions: Record<string, string> = {};
            for (const [emotion, imgData] of Object.entries(emotions)) {
                if (imgData) {
                    const file = dataURLtoFile(imgData, `${emotion}.png`);
                    if (file) {
                        const filename = await characterStorage.saveAvatar(id, file, emotion);
                        expressions[emotion] = filename;
                    } else if (imgData.startsWith('http') || imgData.startsWith('data:image')) {
                        expressions[emotion] = imgData;
                    }
                }
            }

            const newChar: Character = {
                id,
                name,
                avatar: avatarFilename,
                expressions,
                personality: personality || 'Karakter custom',
                promptStyle: promptStyle || `Kamu adalah ${name}.`,
                color: '#6c5ce7',
                isDefault: false
            };

            await characterStorage.save(newChar);
            setSaveStatus('Tersimpan!');
            setTimeout(() => {
                navigate('/settings');
            }, 1000);
        } catch (err) {
            console.error(err);
            setSaveStatus('Gagal menyimpan.');
        }
    };

    return (
        <div className="min-h-screen pb-24">
            <div className="px-5 pt-6 pb-4 flex items-center gap-3">
                <button onClick={() => navigate('/settings')} className="p-2 bg-dark/50 rounded-full text-white">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-xl font-display font-bold">{t('charCreator.title')}</h1>
                    <p className="text-dark-muted text-xs mt-0.5">{t('charCreator.subtitle')}</p>
                </div>
            </div>

            <div className="px-5 space-y-6">
                <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
                    <h3 className="text-sm font-semibold mb-3">{t('charCreator.avatarLabel')}</h3>
                    <div className="flex flex-col items-center gap-4">
                        <label className="w-32 h-32 rounded-2xl border-2 border-dashed border-dark-border flex flex-col items-center justify-center bg-dark/30 cursor-pointer overflow-hidden transition hover:border-primary/50 relative">
                            <input type="file" accept="image/*" onChange={handleBaseImageUpload} className="hidden" />
                            {baseImage ? (
                                <img src={baseImage} alt="Base" className="w-full h-full object-contain" />
                            ) : (
                                <>
                                    <Camera size={24} className="text-dark-muted mb-2" />
                                    <span className="text-[10px] text-dark-muted">Upload Gambar</span>
                                </>
                            )}
                        </label>
                        <p className="text-xs text-dark-muted text-center max-w-[250px]">
                            {t('charCreator.avatarHelp')}
                        </p>
                    </div>
                </div>

                <div className="gradient-card rounded-2xl p-5 border border-dark-border/50">
                    <div className="flex items-center gap-2 mb-3">
                        <ImageIcon size={16} className="text-primary-light" />
                        <h3 className="text-sm font-semibold">{t('charCreator.expressionsLabel')}</h3>
                    </div>
                    <p className="text-xs text-dark-muted mb-4">
                        {t('charCreator.expressionsHelp')}
                    </p>

                    <div className="grid grid-cols-3 gap-3 mt-5">
                        {Object.keys(emotions).map((emotion) => (
                            <div key={emotion} className="flex flex-col items-center gap-2 relative group">
                                <label className="w-full aspect-square rounded-xl border border-dashed border-dark-border flex items-center justify-center bg-dark/50 overflow-hidden cursor-pointer hover:border-primary/50 relative">
                                    <input type="file" accept="image/*" onChange={(e) => handleEmotionUpload(emotion, e)} className="hidden" />
                                    {emotions[emotion] ? (
                                        <img src={emotions[emotion]!} alt={emotion} className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-[10px] text-dark-muted text-center px-2">Upload {emotion}</span>
                                    )}
                                </label>
                                <span className="text-[10px] font-medium capitalize truncate w-full text-center">{emotion.replace(/_/g, ' ')}</span>
                                {!['senang', 'sedih', 'marah'].includes(emotion) && (
                                    <button 
                                        onClick={() => handleRemoveEmotion(emotion)}
                                        className="absolute -top-2 -right-2 bg-danger text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        
                        {/* Add new emotion button/input */}
                        {isAddingEmotion ? (
                            <div className="flex flex-col items-center gap-2 justify-center col-span-1">
                                <input
                                    type="text"
                                    value={newEmotionName}
                                    onChange={e => setNewEmotionName(e.target.value)}
                                    placeholder="Nama emosi"
                                    className="w-full bg-dark/50 border border-dark-border rounded-lg px-2 py-2 text-[10px] text-dark-text focus:outline-none focus:border-primary/50"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleAddEmotion()}
                                />
                                <div className="flex gap-1 w-full justify-between">
                                    <button onClick={() => setIsAddingEmotion(false)} className="text-[10px] text-dark-muted hover:text-white">{t('charCreator.cancel')}</button>
                                    <button onClick={handleAddEmotion} className="text-[10px] text-primary-light font-medium">{t('charCreator.add')}</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingEmotion(true)}
                                className="w-full aspect-square rounded-xl border border-dashed border-dark-border/50 flex flex-col items-center justify-center bg-dark/30 hover:border-primary/50 transition text-dark-muted hover:text-primary-light gap-1"
                            >
                                <Plus size={16} />
                                <span className="text-[10px]">{t('charCreator.addExpressionBtn')}</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="gradient-card rounded-2xl p-5 border border-dark-border/50 space-y-4">
                    <h3 className="text-sm font-semibold">{t('charCreator.basicInfoLabel')}</h3>
                    
                    <div>
                        <label className="text-xs text-dark-muted font-medium mb-1.5 block">{t('charCreator.aiName')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('charCreator.aiNamePlaceholder')}
                            className="w-full bg-dark/50 border border-dark-border rounded-xl px-4 py-3 text-sm text-dark-text focus:outline-none focus:border-primary/50 transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-dark-muted font-medium mb-1.5 block">{t('charCreator.roleplayPrompt')}</label>
                        <input
                            type="text"
                            value={personality}
                            onChange={e => setPersonality(e.target.value)}
                            className="w-full bg-dark/50 border border-dark-border rounded-xl px-4 py-3 text-sm text-dark-text focus:outline-none focus:border-primary/50 transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-dark-muted font-medium mb-1.5 block">{t('charCreator.roleplayPrompt')}</label>
                        <textarea
                            value={promptStyle}
                            onChange={e => setPromptStyle(e.target.value)}
                            placeholder={t('charCreator.roleplayPlaceholder')}
                            rows={3}
                            className="w-full bg-dark/50 border border-dark-border rounded-xl px-4 py-3 text-sm text-dark-text focus:outline-none focus:border-primary/50 transition resize-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={!!saveStatus}
                    className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-300 gradient-primary shadow-lg shadow-primary/30 disabled:opacity-80"
                >
                    <Save size={18} />
                    {saveStatus === 'Menyimpan...' ? t('charCreator.creating') : saveStatus === 'Tersimpan!' ? t('charCreator.success') : t('charCreator.saveBtn')}
                </button>
            </div>
        </div>
    );
}
