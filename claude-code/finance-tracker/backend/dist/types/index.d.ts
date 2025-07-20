export interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
    created_at: string;
}
export interface Transaction {
    id: number;
    amount: number;
    description: string;
    category_id: number;
    category?: Category;
    type: 'income' | 'expense';
    date: string;
    created_at: string;
}
export interface SavingsGoal {
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    deadline?: string;
    created_at: string;
    progress_percentage: number;
}
export interface CreateTransactionRequest {
    amount: number;
    description: string;
    category_id: number;
    type: 'income' | 'expense';
    date: string;
}
export interface CreateCategoryRequest {
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon: string;
}
export interface CreateSavingsGoalRequest {
    name: string;
    target_amount: number;
    current_amount?: number;
    deadline?: string;
}
export interface DashboardStats {
    total_income: number;
    total_expenses: number;
    net_balance: number;
    monthly_income: number;
    monthly_expenses: number;
    savings_goals_count: number;
    transactions_count: number;
}
//# sourceMappingURL=index.d.ts.map