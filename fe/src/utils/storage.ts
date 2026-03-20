import type { Transaction, UserSettings, MonthlyBudget } from '../types';

const TRANSACTIONS_KEY = 'wifey_transactions';
const SETTINGS_KEY = 'wifey_settings';
const BUDGETS_KEY = 'wifey_budgets';

export const storage = {
    getTransactions(): Transaction[] {
        const data = localStorage.getItem(TRANSACTIONS_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveTransactions(transactions: Transaction[]): void {
        localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    },

    addTransaction(transaction: Transaction): Transaction[] {
        const transactions = this.getTransactions();
        transactions.unshift(transaction);
        this.saveTransactions(transactions);
        return transactions;
    },

    updateTransaction(updatedTransaction: Transaction): Transaction[] {
        const transactions = this.getTransactions();
        const index = transactions.findIndex(t => t.id === updatedTransaction.id);
        if (index !== -1) {
            transactions[index] = updatedTransaction;
            this.saveTransactions(transactions);
        }
        return transactions;
    },

    deleteTransaction(id: string): Transaction[] {
        const transactions = this.getTransactions().filter(t => t.id !== id);
        this.saveTransactions(transactions);
        return transactions;
    },

    getSettings(): UserSettings {
        const data = localStorage.getItem(SETTINGS_KEY);
        return data ? JSON.parse(data) : {
            name: 'Sayang',
            monthlyBudget: 5000000,
            currency: 'IDR',
            language: 'id',
            useCompactCurrency: false,
            useBudget: true,
            useQuickRoast: true,
        };
    },

    saveSettings(settings: UserSettings): void {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    },

    getBudgets(): MonthlyBudget[] {
        const data = localStorage.getItem(BUDGETS_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveBudget(budget: MonthlyBudget): void {
        const budgets = this.getBudgets();
        const idx = budgets.findIndex(b => b.month === budget.month);
        if (idx >= 0) {
            budgets[idx] = budget;
        } else {
            budgets.push(budget);
        }
        localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    },

    getCustomCategories(): any[] {
        const data = localStorage.getItem('wifey_custom_categories');
        return data ? JSON.parse(data) : [];
    },

    saveCustomCategory(category: any): void {
        const categories = this.getCustomCategories();
        categories.push(category);
        localStorage.setItem('wifey_custom_categories', JSON.stringify(categories));
    },
};
