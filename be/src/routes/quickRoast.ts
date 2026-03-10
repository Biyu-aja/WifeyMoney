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
    transactionCount: number;
    characterName?: string;
    characterPrompt?: string;
    availableExpressions?: string[];
    recentTransactions?: { description: string; amount: number; category: string; type?: string; date?: string }[];
    language?: string;
}

function buildPrompt(data: FinancialData): string {
    const languageInstruction = data.language === 'en'
        ? "You must respond in English informal language."
        : "You must respond in Indonesian slang or informal language.";

    const characterInstruction = data.characterPrompt
        ? `This is a fictional comedic roleplay. CHARACTER PERSONA: You are acting as "${data.characterName}". ${data.characterPrompt}\nYou MUST consistently stay in character for your entire response, and ${languageInstruction}`
        : `This is a fictional comedic roleplay. You are a funny and helpful financial AI commentator. ${languageInstruction}`;

    const recentTxStr = data.recentTransactions && data.recentTransactions.length > 0
        ? `\nRecent Transactions (Chronological Order, most recent first):\n${data.recentTransactions.map(t => {
            const dateStr = t.date ? new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
            return `- [${t.type === 'income' ? 'INCOME' : 'EXPENSE'}] ${t.description} (Rp${t.amount.toLocaleString('id-ID')}) on ${dateStr}`;
        }).join('\n')}`
        : '';

    return `${characterInstruction}

User data:
- Income: Rp${data.totalIncome.toLocaleString('id-ID')}
- Expenses: Rp${data.totalExpense.toLocaleString('id-ID')}
- Balance: Rp${data.balance.toLocaleString('id-ID')}
${data.hasBudget !== false
            ? `- Total Monthly Budget Setting: Rp${data.monthlyBudget.toLocaleString('id-ID')}\n- Preset Budget Used: ${data.budgetUsedPercent}%`
            : `- Income Used: ${data.budgetUsedPercent}% (User does not use a strict budget)`}${recentTxStr}

Your tasks:
1. Provide a funny, entertaining, and short commentary (MAX 1 - 2 sentences) about their recent transactions or financial habits. You MUST strictly follow your character's persona. Do not use formal language.
CRITICAL RULE: If the user just received a huge income or has great financial habits, you MUST PRAISE them or react positively (while staying in character). ONLY tease or "roast" them if they are wasting money or their expenses are bad.
2. Choose ONE expression from the following available expressions that best fits the emotion of the commentary:
   Available expressions: [${(data.availableExpressions || ['normal']).join(', ')}]
   (CRITICAL: Do NOT simply pick "normal". If you are praising them, pick a happy/positive expression. If you are roasting them, pick an angry/disappointed expression!)

CRITICAL: You MUST respond ONLY with the following valid JSON format, without any markdown blocks:
{
  "roast": "1-2 sentence short comment",
  "expression": "chosen_expression_string"
}`;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const data: FinancialData = req.body;

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
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.9,
                max_tokens: 2500,
                max_completion_tokens: 2500,
            }),
        });

        if (!response.ok) {
            res.status(500).json({ error: 'AI gateway error' });
            return;
        }

        const aiResponse = await response.json() as any;
        const choice = aiResponse.choices?.[0];
        if (choice?.finish_reason === 'content_filter' || choice?.finish_reason === 'safety') {
            console.warn('⚠️ WARNING (QuickRoast): Response blocked by AI safety filter!');
        }

        const content = choice?.message?.content || '';

        let cleaned = content.trim();
        // Extract JSON specifically if the AI includes conversational fluff around it
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        try {
            const parsed = JSON.parse(cleaned);
            const validExpressions = data.availableExpressions || ['normal'];
            const aiExp = String(parsed.expression || '').toLowerCase().trim();
            const matchedExp = validExpressions.find(e => e.toLowerCase().trim() === aiExp) || 'normal';

            res.json({
                roast: String(parsed.roast || 'Hmm, apa ya...'),
                expression: matchedExp,
            });
        } catch (parseErr) {
            console.error('QuickRoast JSON Parsing failed. Raw Text:', content);
            res.json({
                roast: 'Lagi mikir nih... 🤔',
                expression: 'normal',
            });
        }
    } catch (err) {
        console.error("FATAL ERROR IN QUICK ROAST:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as quickRoastRouter };
