import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import type { Character } from '../types/character';
import { characterStorage } from '../utils/opfs';
import { storage } from '../utils/storage';
import { calculateSummary, filterByMonth, getCurrentMonth } from '../utils/formatters';
import { getCategoryInfo } from '../types';

export default function DashboardCharacter() {
  const [character, setCharacter] = useState<Character | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [expression, setExpression] = useState<string>('normal');
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSelectedCharacter();
  }, []);

  const loadSelectedCharacter = async () => {
    const all = await characterStorage.getAll();
    const selectedId = characterStorage.getSelectedId();
    const selected = all.find(c => c.id === selectedId) || all[0];
    setCharacter(selected);

    // load avatars
    const urls: Record<string, string> = {};
    const loadUrl = async (fileName?: string) => {
        if (!fileName || fileName.length <= 4) return null;
        return await characterStorage.loadAvatar(fileName);
    };

    const normal = await loadUrl(selected.avatar);
    if (normal) urls.normal = normal;
    
    if (selected.expressions) {
        for (const [key, fileName] of Object.entries(selected.expressions)) {
            const url = await loadUrl(fileName);
            if (url) urls[key] = url;
        }
    }

    setAvatarUrls(urls);
  };

  const handleInteract = async () => {
    if (!character || loading) return;

    setLoading(true);

    try {
        const transactions = storage.getTransactions();
        const settings = storage.getSettings();
        const currentMonth = getCurrentMonth();
        const monthTx = filterByMonth(transactions, currentMonth);
        const { income, expense, balance } = calculateSummary(monthTx);

        const recentTransactions = monthTx
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(t => ({ description: t.description, amount: t.amount, type: t.type, date: t.date, category: getCategoryInfo(t.category as any).label }));

        const hasBudget = settings.useBudget !== false;
        const budgetUsedPercent = hasBudget
            ? (settings.monthlyBudget > 0 ? Math.round((expense / settings.monthlyBudget) * 100) : 0)
            : (income > 0 ? Math.round((expense / income) * 100) : 0);

        const summaryData = {
            name: settings.name,
            monthlyBudget: settings.monthlyBudget,
            totalIncome: income,
            totalExpense: expense,
            balance,
            budgetUsedPercent,
            hasBudget,
            transactionCount: monthTx.length,
            characterName: character.name,
            characterPrompt: character.promptStyle,
            availableExpressions: ['normal', ...Object.keys(character.expressions || {})],
            recentTransactions,
            language: settings.language || 'id',
        };

        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/quick-roast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summaryData),
        });

        if (res.ok) {
            const data = await res.json();
            setSpeechBubble(data.roast || 'Hmm...');
            setExpression(data.expression || 'normal');

            // The speech bubble will stay visible until the user interacts with the avatar again
            // and overwrites the text, or navigates away.
        } else {
            console.error('Quick roast error');
        }
    } catch (err) {
        console.error('Failed to get interaction', err);
    } finally {
        setLoading(false);
    }
  };

  if (!character) return null;

  const currentAvatarUrl = avatarUrls[expression] || avatarUrls.normal || null;
  const isEmoji = !currentAvatarUrl && character.avatar.length <= 4;

  return (
    <div className="fixed bottom-24 left-4 z-40 w-24 sm:w-28 flex flex-col items-center">
      {/* Speech Bubble */}
      {speechBubble && (
        <div className="absolute bottom-[105%] left-0 sm:left-4 z-50 animate-slide-up origin-bottom-left w-max min-w-[180px] max-w-[240px]">
          <div className="bg-white text-slate-900 text-[13px] font-semibold p-4 rounded-3xl shadow-2xl border border-dark-border/20 leading-relaxed">
            <span>{speechBubble}</span>
          </div>
          <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white transform rotate-45 border-r border-b border-dark-border/20" />
        </div>
      )}

      {/* Character Avatar */}
      <button 
        onClick={handleInteract}
        disabled={loading}
        className="relative group transition-transform active:scale-95"
      >
        <div 
            className="w-24 h-24 sm:w-28 sm:h-28 flex flex-col items-center justify-end overflow-visible drop-shadow-2xl"
        >
          {loading && (
            <div key="loading" className="absolute -top-2 -right-2 w-6 h-6 bg-dark-card rounded-full flex items-center justify-center shadow-lg z-20 animate-spin">
              <RefreshCw size={12} className="text-primary-light" />
            </div>
          )}

          {isEmoji && (
            <div key="emoji" className="w-20 h-20 rounded-full bg-dark-card/80 backdrop-blur-md border-2 border-primary/50 shadow-lg shadow-primary/20 flex items-center justify-center text-5xl">
                <span>{character.avatar}</span>
            </div>
          )}
          
          {!isEmoji && currentAvatarUrl && (
            <img 
                key="img"
                src={currentAvatarUrl} 
                alt={character.name}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            />
          )}

          {!isEmoji && !currentAvatarUrl && (
            <div key="fallback" className="w-20 h-20 rounded-full bg-dark-card/80 border-2 border-primary/50 shadow-lg shadow-primary/20 flex items-center justify-center text-3xl">
                <span>🎭</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
