import type { Transaction, DailySummary } from '../types';

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

export function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

export function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    return formatDate(dateStr);
}

export function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
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
            date: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date),
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
