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
}

function buildPrompt(data: FinancialData): string {
    const topCatStr = data.topCategories
        .map(c => `- ${c.category}: Rp${c.amount.toLocaleString('id-ID')} (${c.percent}%)`)
        .join('\n');

    return `Kamu adalah AI roaster keuangan yang savage tapi tetap lucu dan membantu. Kamu harus merespons dalam bahasa Indonesia gaul/slang.

Berikut data keuangan user bernama "${data.name}" bulan ini:
- Budget bulanan: Rp${data.monthlyBudget.toLocaleString('id-ID')}
- Total pemasukan: Rp${data.totalIncome.toLocaleString('id-ID')}
- Total pengeluaran: Rp${data.totalExpense.toLocaleString('id-ID')}
- Sisa saldo: Rp${data.balance.toLocaleString('id-ID')}
- Budget terpakai: ${data.budgetUsedPercent}%
- Jumlah transaksi: ${data.transactionCount}
- Rata-rata pengeluaran harian: Rp${data.avgDailyExpense.toLocaleString('id-ID')}

Top kategori pengeluaran:
${topCatStr}

Tugasmu:
1. Berikan ROAST yang savage, lucu, dan nyelekit tentang kebiasaan keuangan mereka (3-5 kalimat). Gunakan bahasa gaul Indonesia, bisa pakai emoji. Jadikan personal dan spesifik berdasarkan data di atas. Jangan generic!
2. Berikan 3-4 tips keuangan yang actionable dan relevan berdasarkan pola pengeluaran mereka.
3. Berikan skor kesehatan keuangan 1-100.
4. Berikan 1 emoji yang paling menggambarkan kondisi keuangan mereka.

PENTING: Respond HANYA dalam format JSON valid berikut, tanpa markdown code block:
{
  "roast": "teks roast di sini",
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
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI Gateway error:', response.status, errText);
            res.status(500).json({ error: 'AI gateway error' });
            return;
        }

        const aiResponse = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = aiResponse.choices?.[0]?.message?.content || '';

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
