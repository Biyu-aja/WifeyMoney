import { Router, Request, Response } from 'express';

const router = Router();

interface FinancialData {
    name: string;
    monthlyBudget: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    budgetUsedPercent: number;
    hasBudget?: boolean;
    topCategories: { category: string; amount: number; percent: number }[];
    transactionCount: number;
    avgDailyExpense: number;
    characterName?: string;
    characterPrompt?: string;
    recentTransactions?: { description: string; amount: number; category: string; type?: string; date?: string }[];
    language?: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { messages, financialData }: { messages: { role: string; content: string }[], financialData: FinancialData } = req.body;

        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Messages are required' });
            return;
        }

        const gateway = process.env.AI_GATEWAY;
        const apiKey = process.env.AI_API_KEY;
        const model = process.env.AI_MODEL;

        if (!gateway || !apiKey || !model) {
            res.status(500).json({ error: 'AI configuration not set' });
            return;
        }

        let systemPrompt = "You are a helpful financial AI assistant. You answer the user's questions about their finances based on the data provided. Use conversational, friendly Indonesian language.";

        if (financialData) {
            const topCatStr = financialData.topCategories?.map(c => `- ${c.category}: Rp${c.amount.toLocaleString('id-ID')} (${c.percent}%)`).join('\n') || 'Tidak ada data';

            const recentTxStr = financialData.recentTransactions && financialData.recentTransactions.length > 0
                ? `\n\nRecent Transactions:\n${financialData.recentTransactions.map(t => {
                    const dateStr = t.date ? new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
                    return `- [${t.type === 'income' ? 'INCOME' : 'EXPENSE'}] ${t.description} (Rp${t.amount.toLocaleString('id-ID')}) on ${dateStr}`;
                }).join('\n')}`
                : '';

            const dataContext = `
Here is the financial data for the user named "${financialData.name}" this month:
- Total income: Rp${financialData.totalIncome?.toLocaleString('id-ID')}
- Total expenses: Rp${financialData.totalExpense?.toLocaleString('id-ID')}
- Remaining balance: Rp${financialData.balance?.toLocaleString('id-ID')}
${financialData.hasBudget !== false
                    ? `- Total Monthly Budget Setting: Rp${financialData.monthlyBudget?.toLocaleString('id-ID')}\n- Preset Budget Used: ${financialData.budgetUsedPercent}%`
                    : `- Total Income Used: ${financialData.budgetUsedPercent}%`}

Top expense categories:
${topCatStr}${recentTxStr}
`;

            const languageInstruction = financialData.language === 'en'
                ? "You must answer in English."
                : "You must answer in Indonesian slang or informal language.";

            if (financialData.characterPrompt) {
                systemPrompt = `CHARACTER PERSONA: You are acting as "${financialData.characterName}". ${financialData.characterPrompt}\nYou MUST consistently stay in character for your entire response, and ${languageInstruction}\n\n${dataContext}\n\nAnswer the user's latest message based on this financial data.`;
            } else {
                systemPrompt = `You are a helpful and friendly financial AI assistant. ${languageInstruction}\n\n${dataContext}\n\nAnswer the user's latest message based on this financial data.`;
            }
        }

        const aiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        ];

        const response = await fetch(`${gateway}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: aiMessages,
                temperature: 0.7,
                max_tokens: 1500,
                max_completion_tokens: 1500,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI Gateway error:', response.status, errText);
            res.status(500).json({ error: 'AI gateway error' });
            return;
        }

        const aiResponse = await response.json() as any;
        const choice = aiResponse.choices?.[0];
        const content = choice?.message?.content || 'Maaf, saya sedang tidak bisa membalas sekarang.';

        res.json({ reply: content });
    } catch (err) {
        console.error('Chat endpoint error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as chatRouter };
