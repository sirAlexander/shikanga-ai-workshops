import express from 'express';
import cors from 'cors';
import { initDatabase } from './models/database';
import transactionsRouter from './routes/transactions';
import categoriesRouter from './routes/categories';
import savingsGoalsRouter from './routes/savingsGoals';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Finance Tracker API is running' });
});

app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/savings-goals', savingsGoalsRouter);

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Finance Tracker API is ready!`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});