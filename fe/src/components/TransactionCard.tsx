import { Trash2 } from 'lucide-react';
import type { Transaction } from '../types';
import { getCategoryInfo } from '../types';
import { formatCurrency, formatRelativeDate } from '../utils/formatters';
import { useTranslation } from 'react-i18next';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

export default function TransactionCard({ transaction, onDelete }: Props) {
  const cat = getCategoryInfo(transaction.category);
  const isExpense = transaction.type === 'expense';
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-dark-card/50 border border-dark-border/50 hover:border-dark-border transition-all group">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
        isExpense ? 'bg-danger/15' : 'bg-success/15'
      }`}>
        {cat.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-dark-text truncate">{transaction.description}</p>
        <p className="text-xs text-dark-muted mt-0.5">{t('category.' + cat.value)} • {formatRelativeDate(transaction.date)}</p>
      </div>

      {/* Amount */}
      <div className="text-right flex items-center gap-2">
        <span className={`font-bold text-sm ${isExpense ? 'text-danger' : 'text-success'}`}>
          {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-danger/20 text-dark-muted hover:text-danger transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
