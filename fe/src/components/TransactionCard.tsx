import { Trash2, Edit2 } from 'lucide-react';
import type { Transaction } from '../types';
import { getCategoryInfo } from '../types';
import { formatCurrency, formatRelativeDate } from '../utils/formatters';
import { useTranslation } from 'react-i18next';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onEdit?: (transaction: Transaction) => void;
}

export default function TransactionCard({ transaction, onDelete, onEdit }: Props) {
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

      {/* Amount & Actions Container */}
      <div className="text-right flex flex-col justify-center items-end ml-2">
        <span className={`font-bold text-sm ${isExpense ? 'text-danger' : 'text-success'}`}>
          {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
        </span>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 pl-1">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
            className="p-1.5 rounded-lg text-dark-muted hover:text-primary hover:bg-primary/20 bg-dark-border/20 transition-all"
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }}
          className="p-1.5 rounded-lg text-dark-muted hover:text-danger hover:bg-danger/20 bg-dark-border/20 transition-all"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
