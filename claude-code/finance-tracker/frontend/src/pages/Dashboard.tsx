import React, { useState, useEffect } from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  BanknotesIcon,
  CreditCardIcon,
  FlagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { DashboardStats, Transaction, Category, CreateTransactionRequest, CreateSavingsGoalRequest, SavingsGoal } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats, recent transactions, categories, and savings goals
      const [statsRes, transactionsRes, categoriesRes, goalsRes] = await Promise.all([
        fetch('http://localhost:5000/api/transactions/stats'),
        fetch('http://localhost:5000/api/transactions'),
        fetch('http://localhost:5000/api/categories'),
        fetch('http://localhost:5000/api/savings-goals')
      ]);

      const statsData = await statsRes.json();
      const transactionsData = await transactionsRes.json();
      const categoriesData = await categoriesRes.json();
      const goalsData = await goalsRes.json();

      setStats(statsData);
      setRecentTransactions(transactionsData.slice(0, 5)); // Show only 5 recent
      setCategories(categoriesData);
      setSavingsGoals(goalsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getGoalStatus = (goal: SavingsGoal) => {
    const isCompleted = goal.progress_percentage >= 100;
    const isOverdue = goal.deadline && new Date(goal.deadline) < new Date() && !isCompleted;
    
    return {
      isCompleted,
      isOverdue,
      statusText: isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'In Progress'
    };
  };

  const handleQuickTransaction = async (type: 'income' | 'expense', amount: number, description: string, categoryId: number) => {
    try {
      const transactionData: CreateTransactionRequest = {
        amount,
        description,
        category_id: categoryId,
        type,
        date: new Date().toISOString().split('T')[0],
      };

      const response = await fetch('http://localhost:5000/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (response.ok) {
        // Refresh dashboard data
        fetchDashboardData();
        // Close forms
        setShowIncomeForm(false);
        setShowExpenseForm(false);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleQuickGoal = async (name: string, targetAmount: number) => {
    try {
      const goalData: CreateSavingsGoalRequest = {
        name,
        target_amount: targetAmount,
        current_amount: 0,
      };

      const response = await fetch('http://localhost:5000/api/savings-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goalData),
      });

      if (response.ok) {
        setShowGoalForm(false);
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error creating goal:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your financial overview.</p>
      </div>

      {/* Quick Actions Panel */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => setShowIncomeForm(true)}
            className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-center"
          >
            <ArrowUpIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-700">Add Income</p>
            <p className="text-sm text-green-600">Record new income</p>
          </button>

          <button
            onClick={() => setShowExpenseForm(true)}
            className="p-4 border-2 border-dashed border-red-300 rounded-lg hover:border-red-400 hover:bg-red-50 transition-colors text-center"
          >
            <ArrowDownIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="font-medium text-red-700">Add Expense</p>
            <p className="text-sm text-red-600">Record new expense</p>
          </button>

          <button
            onClick={() => setShowGoalForm(true)}
            className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
          >
            <FlagIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-blue-700">New Goal</p>
            <p className="text-sm text-blue-600">Create savings goal</p>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ArrowUpIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.total_income?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ArrowDownIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                ${stats?.total_expenses?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Net Balance</p>
              <p className={`text-2xl font-bold ${stats?.net_balance && stats.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats?.net_balance?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCardIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.transactions_count || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FlagIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Goals</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.savings_goals_count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Income Form */}
      {showIncomeForm && (
        <QuickTransactionForm
          type="income"
          categories={categories.filter(c => c.type === 'income')}
          onSubmit={handleQuickTransaction}
          onCancel={() => setShowIncomeForm(false)}
        />
      )}

      {/* Quick Expense Form */}
      {showExpenseForm && (
        <QuickTransactionForm
          type="expense"
          categories={categories.filter(c => c.type === 'expense')}
          onSubmit={handleQuickTransaction}
          onCancel={() => setShowExpenseForm(false)}
        />
      )}

      {/* Quick Goal Form */}
      {showGoalForm && (
        <QuickGoalForm
          onSubmit={handleQuickGoal}
          onCancel={() => setShowGoalForm(false)}
        />
      )}

      {/* Goals Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Savings Goals Progress</h2>
          <button className="text-primary-600 hover:text-primary-700 font-medium">
            View All
          </button>
        </div>
        
        {savingsGoals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No savings goals yet. Create your first goal!</p>
        ) : (
          <div className="space-y-4">
            {savingsGoals.slice(0, 3).map((goal) => {
              const status = getGoalStatus(goal);
              return (
                <div key={goal.id} className={`p-4 rounded-lg ${
                  status.isCompleted ? 'bg-green-50 border border-green-200' : 
                  status.isOverdue ? 'bg-red-50 border border-red-200' : 
                  'bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${
                        status.isCompleted ? 'bg-green-100' :
                        status.isOverdue ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        {status.isCompleted ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : status.isOverdue ? (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                        ) : (
                          <FlagIcon className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{goal.name}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status.isCompleted ? 'bg-green-100 text-green-800' :
                            status.isOverdue ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {status.statusText}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          ${goal.current_amount.toLocaleString()} of ${goal.target_amount.toLocaleString()}
                          {goal.deadline && (
                            <span className="ml-2">
                              • Due {new Date(goal.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        status.isCompleted ? 'text-green-600' :
                        status.isOverdue ? 'text-red-600' :
                        'text-blue-600'
                      }`}>
                        {goal.progress_percentage}%
                      </p>
                      <p className="text-sm text-gray-500">
                        {status.isCompleted ? 
                          'Goal achieved!' : 
                          `$${(goal.target_amount - goal.current_amount).toLocaleString()} remaining`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        status.isCompleted ? 'bg-green-600' :
                        status.isOverdue ? 'bg-red-600' :
                        'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          <button className="text-primary-600 hover:text-primary-700 font-medium">
            View All
          </button>
        </div>
        
        {recentTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No transactions yet. Add your first transaction!</p>
        ) : (
          <div className="space-y-4">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {transaction.type === 'income' ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.category?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Transaction Form Component
interface QuickTransactionFormProps {
  type: 'income' | 'expense';
  categories: Category[];
  onSubmit: (type: 'income' | 'expense', amount: number, description: string, categoryId: number) => void;
  onCancel: () => void;
}

const QuickTransactionForm: React.FC<QuickTransactionFormProps> = ({ type, categories, onSubmit, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description && categoryId) {
      onSubmit(type, parseFloat(amount), description, parseInt(categoryId));
      setAmount('');
      setDescription('');
      setCategoryId('');
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 capitalize">
        Quick Add {type}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter description"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Add {type}
          </button>
        </div>
      </form>
    </div>
  );
};

// Quick Goal Form Component
interface QuickGoalFormProps {
  onSubmit: (name: string, targetAmount: number) => void;
  onCancel: () => void;
}

const QuickGoalForm: React.FC<QuickGoalFormProps> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && targetAmount) {
      onSubmit(name, parseFloat(targetAmount));
      setName('');
      setTargetAmount('');
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Quick Create Goal</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Emergency Fund"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Amount
            </label>
            <input
              type="number"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create Goal
          </button>
        </div>
      </form>
    </div>
  );
};

export default Dashboard;