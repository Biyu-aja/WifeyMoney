import type { Transaction, DailySummary } from '../types';
import i18n from '../i18n';

export function formatCurrency(amount: number): string {
    try {
        const storedStr = localStorage.getItem('wifey_settings');
        if (storedStr) {
            const settings = JSON.parse(storedStr);
            if (settings.useCompactCurrency) {
                if (Math.abs(amount) >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1).replace(/\.0$/, '')}B`;
                if (Math.abs(amount) >= 1000000) return `Rp ${(amount / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
                if (Math.abs(amount) >= 1000) return `Rp ${(amount / 1000).toFixed(1).replace(/\.0$/, '')}K`;
            }
        }
    } catch (e) {
        // ignore storage errors
    }

    return new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function parseAmountInput(value: string): { display: string; numeric: number } {
    if (!value) return { display: '', numeric: 0 };

    let raw = value.toLowerCase();

    // Check for suffix
    if (raw.endsWith('k')) {
        raw = raw.replace('k', '') + '000';
    } else if (raw.endsWith('m') || raw.endsWith('jt')) {
        raw = raw.replace(/m|jt/, '') + '000000';
    } else if (raw.endsWith('b')) {
        raw = raw.replace('b', '') + '000000000';
    }

    const numericStr = raw.replace(/\D/g, '');
    if (!numericStr) return { display: '', numeric: 0 };

    const numeric = parseInt(numericStr, 10);
    const display = new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'id-ID').format(numeric);

    return { display, numeric };
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

export function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const isEn = i18n.language === 'en';

    if (days === 0) return isEn ? 'Today' : 'Hari ini';
    if (days === 1) return isEn ? 'Yesterday' : 'Kemarin';
    if (days < 7) return isEn ? `${days} days ago` : `${days} hari lalu`;
    return formatDate(dateStr);
}

export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'id-ID', { month: 'long', year: 'numeric' }).format(date);
}

export function filterByMonth(transactions: Transaction[], month: string): Transaction[] {
    return transactions.filter(t => t.date.startsWith(month));
}

export function calculateSummary(transactions: Transaction[]) {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
}

export function getDailySummaries(transactions: Transaction[], days: number = 7): DailySummary[] {
    const summaries: DailySummary[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayTransactions = transactions.filter(t => t.date.startsWith(dateStr));
        summaries.push({
            date: new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'id-ID', { weekday: 'short' }).format(date),
            income: dayTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
            expense: dayTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        });
    }

    return summaries;
}

export function getCategoryTotals(transactions: Transaction[]) {
    const totals: Record<string, number> = {};
    transactions.forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    return Object.entries(totals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
}

export function getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
}
