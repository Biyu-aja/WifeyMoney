

import { Router, Request, Response } from 'express';

const router = Router();

interface FinancialData {
    name: string;
    monthlyBudget: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    budgetUsedPercent: number;
    topCategories: { category: string; amount: number; percent: number }[];
    transactionCount: number;
    avgDailyExpense: number;
    characterName?: string;
    characterPrompt?: string;
    recentTransactions?: { description: string; amount: number; category: string }[];
}

function buildPrompt(data: FinancialData): string {
    const topCatStr = data.topCategories
        .map(c => `- ${c.category}: Rp${c.amount.toLocaleString('id-ID')} (${c.percent}%)`)
        .join('\n');

    const characterInstruction = data.characterPrompt
        ? `CHARACTER PERSONA: You are acting as "${data.characterName}". ${data.characterPrompt}\nYou MUST consistently stay in character for your entire response, but answer in Indonesian slang.`
        : 'You are a funny and helpful financial AI commentator. You must respond in Indonesian slang/informal language.';

    const recentTxStr = data.recentTransactions && data.recentTransactions.length > 0
        ? `\n\nRecent Expenses:\n${data.recentTransactions.map(t => `- ${t.description} (Rp${t.amount.toLocaleString('id-ID')})`).join('\n')}`
        : '';

    return `${characterInstruction}

Here is the financial data for the user named "${data.name}" this month:
- Monthly budget: Rp${data.monthlyBudget.toLocaleString('id-ID')}
- Total income: Rp${data.totalIncome.toLocaleString('id-ID')}
- Total expenses: Rp${data.totalExpense.toLocaleString('id-ID')}
- Remaining balance: Rp${data.balance.toLocaleString('id-ID')}
- Budget used: ${data.budgetUsedPercent}%
- Transaction count: ${data.transactionCount}
- Average daily expense: Rp${data.avgDailyExpense.toLocaleString('id-ID')}

Top expense categories:
${topCatStr}${recentTxStr}

Your tasks:
1. Provide a funny, entertaining, and slightly teasing commentary (3-5 sentences) about their financial habits. You MUST strictly follow your character's persona and speaking style! Use emojis. Make it personal and specific based on the numbers above. Do not use formal Indonesian! Respond in Indonesian.
2. Provide 3-4 actionable and relevant financial tips, continuing to speak in your character's persona (in Indonesian).
3. Give them a financial health score from 1 to 100.
4. Give 1 single emoji that best describes their financial condition.

CRITICAL: You MUST respond ONLY with the following valid JSON format, without any markdown code blocks:
{
  "roast": "your commentary text here",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "score": 50,
  "emoji": "💸"
}`;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const data: FinancialData = req.body;

        if (!data || !data.transactionCount) {
            res.status(400).json({ error: 'Data transaksi tidak valid' });
            return;
        }

        const gateway = process.env.AI_GATEWAY;
        const apiKey = process.env.AI_API_KEY;
        const model = process.env.AI_MODEL;

        if (!gateway || !apiKey || !model) {
            res.status(500).json({ error: 'AI configuration not set' });
            return;
        }

        const prompt = buildPrompt(data);

        const response = await fetch(`${gateway}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'user', content: prompt },
                ],
                temperature: 0.9,
                max_tokens: 2500,
                max_completion_tokens: 2500,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI Gateway error:', response.status, errText);
            res.status(500).json({ error: 'AI gateway error' });
            return;
        }

        const aiResponse = await response.json() as any;

        // Log the full response to debug safety filter blocks
        console.log('--- AI Response Data ---');
        console.log(JSON.stringify(aiResponse, null, 2));
        console.log('------------------------');

        const choice = aiResponse.choices?.[0];
        if (choice?.finish_reason === 'content_filter' || choice?.finish_reason === 'safety') {
            console.warn('⚠️ WARNING: Response blocked by AI safety filter!');
        }

        const content = choice?.message?.content || '';
        // Parse JSON from response (handle potential markdown wrapping)
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            const parsed = JSON.parse(cleaned);

            // Validate and sanitize
            const result = {
                roast: String(parsed.roast || 'Hmm, keuanganmu biasa aja sih... 😴'),
                tips: Array.isArray(parsed.tips) ? parsed.tips.map(String).slice(0, 5) : ['Coba catat pengeluaran lebih detail'],
                score: Math.max(1, Math.min(100, Number(parsed.score) || 50)),
                emoji: String(parsed.emoji || '💸'),
            };

            res.json(result);
        } catch (parseErr) {
            console.error('Failed to parse AI response:', content);
            // Fallback: use the raw text as roast
            res.json({
                roast: content.substring(0, 500),
                tips: ['Catat semua pengeluaran', 'Buat budget bulanan', 'Sisihkan 20% untuk tabungan'],
                score: 50,
                emoji: '🤔',
            });
        }
    } catch (err) {
        console.error('Roast endpoint error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as roastRouter };
