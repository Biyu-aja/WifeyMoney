export type TransactionType = 'income' | 'expense';

export type Category = string;

export interface CustomCategory {
    value: string;
    label: string;
    emoji: string;
    type: TransactionType;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: Category;
    description: string;
    date: string; // ISO string
    createdAt: string;
}

export interface MonthlyBudget {
    month: string; // YYYY-MM
    budget: number;
}

export interface UserSettings {
    name: string;
    monthlyBudget: number;
    currency: string;
    language?: string;
    useCompactCurrency?: boolean;
    useBudget?: boolean;
    useQuickRoast?: boolean;
}

export interface RoastResponse {
    roast: string;
    tips: string[];
    score: number; // 1-100 financial health score
    emoji: string;
}

export interface DailySummary {
    date: string;
    income: number;
    expense: number;
}

export const INCOME_CATEGORIES: { value: Category; label: string; emoji: string }[] = [
    { value: 'salary', label: 'Gaji', emoji: '💰' },
    { value: 'freelance', label: 'Freelance', emoji: '💻' },
    { value: 'gift', label: 'Hadiah', emoji: '🎁' },
    { value: 'investment', label: 'Investasi', emoji: '📈' },
    { value: 'other_income', label: 'Lainnya', emoji: '✨' },
];

export const EXPENSE_CATEGORIES: { value: Category; label: string; emoji: string }[] = [
    { value: 'food', label: 'Makan', emoji: '🍕' },
    { value: 'transport', label: 'Transport', emoji: '🚗' },
    { value: 'shopping', label: 'Belanja', emoji: '🛍️' },
    { value: 'bills', label: 'Tagihan', emoji: '📱' },
    { value: 'entertainment', label: 'Hiburan', emoji: '🎮' },
    { value: 'health', label: 'Kesehatan', emoji: '💊' },
    { value: 'education', label: 'Pendidikan', emoji: '📚' },
    { value: 'beauty', label: 'Kecantikan', emoji: '💄' },
    { value: 'household', label: 'Rumah Tangga', emoji: '🏠' },
    { value: 'other_expense', label: 'Lainnya', emoji: '📦' },
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function getCategoryInfo(category: string) {
    const allDefault = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    const found = allDefault.find(c => c.value === category);
    if (found) return found;

    try {
        const customData = localStorage.getItem('wifey_custom_categories');
        if (customData) {
            const custom = JSON.parse(customData);
            const foundCustom = custom.find((c: any) => c.value === category);
            if (foundCustom) return foundCustom;
        }
    } catch (e) {}

    return { value: category, label: category, emoji: '📦' };
}
