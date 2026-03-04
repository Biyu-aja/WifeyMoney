import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { roastRouter } from './routes/roast';
import { quickRoastRouter } from './routes/quickRoast';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/roast', roastRouter);
app.use('/api/quick-roast', quickRoastRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🔥 WifeyMoney Backend running on port ${PORT}`);
});
