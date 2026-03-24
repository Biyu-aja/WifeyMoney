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
    availableExpressions?: string[];
    currentAffection?: number;
    currentTrust?: number;
    currentMood?: string;
    walletContextName?: string;
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

        let evaluatorSystemPrompt = "You are a behavioral financial analyst evaluating the user's financial habits and conversation. Analyze the context and output JSON only.";
        let responderSystemPrompt = "You are a helpful financial AI assistant. You answer the user's questions about their finances based on the data provided. Use conversational, friendly Indonesian language.";

        const languageInstruction = financialData?.language === 'en'
            ? "You must answer in English informal language."
            : "You must answer in Indonesian slang or informal language.";

        let dataContext = '';

        if (financialData) {
            const topCatStr = financialData.topCategories?.map(c => `- ${c.category}: Rp${c.amount.toLocaleString('id-ID')} (${c.percent}%)`).join('\n') || 'Tidak ada data';

            const recentTxStr = financialData.recentTransactions && financialData.recentTransactions.length > 0
                ? `\n\nRecent Transactions:\n${financialData.recentTransactions.map(t => {
                    const dateStr = t.date ? new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
                    return `- [${t.type === 'income' ? 'INCOME' : 'EXPENSE'}] ${t.description} (Rp${t.amount.toLocaleString('id-ID')}) on ${dateStr}`;
                }).join('\n')}`
                : '';

            dataContext = `
Here is the financial data for the user named "${financialData.name}" this month${financialData.walletContextName && financialData.walletContextName !== 'Semua Dompet' ? ` specifically for the wallet: "${financialData.walletContextName}"` : ' for all wallets combined'}:
- Total income: Rp${financialData.totalIncome?.toLocaleString('id-ID')}
- Total expenses: Rp${financialData.totalExpense?.toLocaleString('id-ID')}
- Remaining balance: Rp${financialData.balance?.toLocaleString('id-ID')}
${financialData.hasBudget !== false
                    ? `- Total Monthly Budget Setting: Rp${financialData.monthlyBudget?.toLocaleString('id-ID')}\n- Preset Budget Used: ${financialData.budgetUsedPercent}%`
                    : `- Total Income Used: ${financialData.budgetUsedPercent}%`}

Top expense categories:
${topCatStr}${recentTxStr}
`;

            evaluatorSystemPrompt = `You are a hidden financial behavioral analyst.
CURRENT CHARACTER STATE:
- Affection Level: ${financialData.currentAffection ?? 50}%
- Trust Level: ${financialData.currentTrust ?? 50}%
- Current Mood: ${financialData.currentMood ?? 'Biasa'}

Your job is to read the user's financial context and their chat messages, then evaluate changes to the AI Character's "Affection" and "Trust" towards the user.
- Normal good/bad behavior or budgeting habits: Change by +/- 2 to 5.
- Extreme financial saving/wasting, or if the user speaks nicely/flirts: Change by +10 to +20.
- CRITICAL: If the user is hostile, mean, rude, or dismissive text (e.g. "gak peduli", "sana pergi aja"), Affection and Trust MUST drop drastically by -15 to -40!
- CRITICAL GRUDGE RULE: If current Affection is below 40%, the Character is holding a grudge. You MUST drop Affection FASTER when user is bad, and refuse to give more than +1 to +3 if user tries to apologize. They must earn it back slowly!
- Determine the immediate "Mood" of the character based on the user's tone (e.g. "Senang", "Marah", "Sakit Hati", "Kecewa", "Dingin", "Bangga", "Biasa").
- Lastly, provide an "internalContextForResponder" (a short instruction) to tell the Chat Character how to react in their next reply (e.g., "Cry and leave", "Be cold and unforgiving", "Praise them").

${dataContext}

You MUST output ONLY valid JSON in this exact format, with no markdown formatting:
{
  "affectionDelta": number (positive or negative),
  "trustDelta": number (positive or negative),
  "mood": "string mood",
  "internalContextForResponder": "instruction for the chat character"
}`;

            if (financialData.characterPrompt) {
                responderSystemPrompt = `CHARACTER PERSONA: You are acting as "${financialData.characterName}". ${financialData.characterPrompt}
You MUST consistently stay in character for your entire response, and ${languageInstruction}

IMPORTANT ROLEPLAY RULE: You must describe your character's physical actions, expressions, and the environment using markdown italics enclosed in asterisks (e.g., *rolls eyes*, *slams hand on the table*, *blushes deeply*). Weave these actions naturally between your spoken dialogues, exactly like writing a roleplay novel.

CURRENT RELATIONSHIP STATE:
- Affection: ${financialData.currentAffection ?? 50}% 
- Trust: ${financialData.currentTrust ?? 50}%
CRITICAL RULE: If Affection is below 40%, you are deeply hurt, cold, or intensely angry. DO NOT forgive them easily! Even if they apologize, act cynical, sarcastic, or demanding (e.g., "Oh baru nyadar?", "Terus aku harus peduli?"). Only start being nice again if they have consistently apologized or improved over a long time.

${dataContext}`;
            } else {
                responderSystemPrompt = `You are a helpful and friendly financial AI assistant. ${languageInstruction}

IMPORTANT ROLEPLAY RULE: You must describe your character's physical actions and expressions using markdown italics enclosed in asterisks (e.g., *adjusts glasses*, *smiles warmly*). Weave these actions naturally between your spoken dialogues.
                
CURRENT RELATIONSHIP STATE:
- Affection: ${financialData.currentAffection ?? 50}% 
- Trust: ${financialData.currentTrust ?? 50}%

${dataContext}`;
            }
        }

        // STEP 1: EVALUATOR API CALL
        const evaluatorMessages = [
            { role: 'system', content: evaluatorSystemPrompt },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        ];

        const evaluatorResponse = await fetch(`${gateway}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: evaluatorMessages,
                temperature: 0.3,
                max_tokens: 500,
            }),
        });

        let evaluationData = {
            affectionDelta: 0,
            trustDelta: 0,
            mood: 'Neutral',
            internalContextForResponder: 'Just chat normally.'
        };

        if (evaluatorResponse.ok) {
            const evaluatorRaw = await evaluatorResponse.json() as any;
            let evaluatorContent = evaluatorRaw.choices?.[0]?.message?.content || '{}';
            const jsonMatch = evaluatorContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) evaluatorContent = jsonMatch[0];
            try {
                evaluationData = { ...evaluationData, ...JSON.parse(evaluatorContent) };
            } catch (e) {
                console.error('Failed to parse evaluator JSON', e);
            }
        } else {
            console.error('Evaluator API failed', await evaluatorResponse.text());
        }

        // STEP 2: RESPONDER API CALL
        const availableExpressions = (financialData as any).availableExpressions || ['normal'];
        
        const responderSystemPromptFinal = `${responderSystemPrompt}

INTERNAL INSTRUCTION FROM ANALYST:
"${evaluationData.internalContextForResponder}"
You must use this instruction to guide the tone of your reply! Do not mention the instruction directly.

Furthermore, you MUST pick ONE expression from this available list that best matches your reply: [${availableExpressions.join(', ')}]. If unsure, pick "normal".

You MUST reply ONLY with valid JSON format, without any markdown formatting:
{
  "reply": "your conversational response here",
  "expression": "chosen_expression_string"
}`;

        const responderMessages = [
            { role: 'system', content: responderSystemPromptFinal },
            ...messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        ];

        const response = await fetch(`${gateway}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model,
                messages: responderMessages,
                temperature: 0.8,
                max_tokens: 1500,
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
        let content = choice?.message?.content || '{"reply":"Maaf, saya sedang tidak bisa membalas sekarang.","expression":"normal"}';
        
        const jsonContentMatch = content.match(/\{[\s\S]*\}/);
        if (jsonContentMatch) content = jsonContentMatch[0];

        let finalReply = 'Maaf, terjadi kesalahan membaca balasan.';
        let finalExpression = 'normal';

        try {
            const parsedContent = JSON.parse(content);
            finalReply = parsedContent.reply || content;
            finalExpression = parsedContent.expression || 'normal';
        } catch (e) {
            console.error('Responder JSON parse error', e);
            finalReply = content; // Fallback to raw text if it failed
        }

        // Match the expression safely
        const matchedExp = availableExpressions.find((e: string) => e.toLowerCase() === finalExpression.toLowerCase()) || 'normal';

        res.json({ 
            reply: finalReply,
            expression: matchedExp,
            parameters: {
                affectionDelta: Math.round(Number(evaluationData.affectionDelta) || 0),
                trustDelta: Math.round(Number(evaluationData.trustDelta) || 0),
                mood: String(evaluationData.mood || 'Neutral')
            }
        });
    } catch (err) {
        console.error('Chat endpoint error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as chatRouter };
