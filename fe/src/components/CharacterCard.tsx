import { useState, useEffect } from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { Character } from '../types/character';
import { characterStorage } from '../utils/opfs';

interface Props {
  character: Character;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (character: Character) => void;
}

export default function CharacterCard({ character, isSelected, onSelect, onDelete, onEdit }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    // If avatar is not an emoji (starts with a letter or has file extension), load from OPFS
    if (character.avatar && !isEmojiAvatar(character.avatar)) {
      characterStorage.loadAvatar(character.avatar).then(url => {
        if (url) setAvatarUrl(url);
      });
    }
  }, [character.avatar]);

  const isEmoji = isEmojiAvatar(character.avatar);

  return (
    <button
      onClick={() => onSelect(character.id)}
      className={`group relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-300 ${
        isSelected
          ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]'
          : 'border-dark-border/50 bg-dark-card/50 hover:border-dark-border active:scale-[0.98]'
      }`}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 gradient-primary rounded-full flex items-center justify-center animate-fade-in group-hover:opacity-0 transition-opacity">
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(character); }}
            className="w-6 h-6 bg-slate-500/20 rounded-full flex items-center justify-center hover:bg-slate-500/40 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(character.id); }}
            className="w-6 h-6 bg-danger/20 rounded-full flex items-center justify-center hover:bg-danger/40 transition"
          >
            <Trash2 size={12} className="text-danger" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isSelected ? 'animate-pulse-glow' : ''
          }`}
          style={{ backgroundColor: character.color + '25' }}
        >
          {isEmoji ? (
            <span className="text-3xl">{character.avatar}</span>
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={character.name}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <span className="text-3xl">🎭</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-bold text-sm text-dark-text truncate">
            {character.name}
          </h4>
          <p className="text-[11px] text-dark-muted line-clamp-2 mt-0.5 leading-relaxed">
            {character.personality}
          </p>
        </div>
      </div>

      {/* Active glow bar */}
      {isSelected && (
        <div
          className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
          style={{ backgroundColor: character.color }}
        />
      )}
    </button>
  );
}

function isEmojiAvatar(avatar: string): boolean {
  // Simple check: if it's short and not a filename, treat as emoji
  return avatar.length <= 4 && !avatar.includes('.');
}
