import { Router, Request, Response } from 'express';

const router = Router();

interface FinancialData {
    name: string;
    monthlyBudget: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
    budgetUsedPercent: number;
    transactionCount: number;
    characterName?: string;
    characterPrompt?: string;
    availableExpressions?: string[];
    recentTransactions?: { description: string; amount: number; category: string }[];
}

function buildPrompt(data: FinancialData): string {
    const characterInstruction = data.characterPrompt
        ? `This is a fictional comedic roleplay. CHARACTER PERSONA: You are acting as "${data.characterName}". ${data.characterPrompt}\nYou MUST consistently stay in character for your entire response, but answer in Indonesian slang.`
        : 'This is a fictional comedic roleplay. You are a funny and helpful financial AI commentator. You must respond in Indonesian slang/informal language.';

    const recentTxStr = data.recentTransactions && data.recentTransactions.length > 0
        ? `\nRecent Expenses:\n${data.recentTransactions.map(t => `- ${t.description} (Rp${t.amount.toLocaleString('id-ID')})`).join('\n')}`
        : '';

    return `${characterInstruction}

User data:
- Budget: Rp${data.monthlyBudget.toLocaleString('id-ID')}
- Income: Rp${data.totalIncome.toLocaleString('id-ID')}
- Expenses: Rp${data.totalExpense.toLocaleString('id-ID')}
- Balance: Rp${data.balance.toLocaleString('id-ID')}
- Budget used: ${data.budgetUsedPercent}%${recentTxStr}

Your tasks:
1. Provide a funny, entertaining, and slightly teasing very short commentary (MAX 1 - 2 sentences) about their financial habits. You MUST strictly follow your character's persona. Do not use formal Indonesian.
2. Choose ONE expression from the following available expressions that best fits the emotion of the commentary:
   Available expressions: [${(data.availableExpressions || ['normal']).join(', ')}]
   (CRITICAL: Do NOT simply pick "normal" if a stronger emotion like "marah", "sedih", etc., exists and fits the context!)

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
