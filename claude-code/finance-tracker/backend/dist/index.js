"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./models/database");
const transactions_1 = __importDefault(require("./routes/transactions"));
const categories_1 = __importDefault(require("./routes/categories"));
const savingsGoals_1 = __importDefault(require("./routes/savingsGoals"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Finance Tracker API is running' });
});
app.use('/api/transactions', transactions_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/savings-goals', savingsGoals_1.default);
// Initialize database and start server
(0, database_1.initDatabase)().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Finance Tracker API is ready!`);
    });
}).catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map