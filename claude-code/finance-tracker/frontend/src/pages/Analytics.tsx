import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Transaction } from '../types';

const Analytics: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/transactions');
      const transactionsData = await response.json();

      setTransactions(transactionsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Process data for charts
  const monthlyData = React.useMemo(() => {
    const monthlyTotals: { [key: string]: { income: number; expenses: number; month: string } } = {};

    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0, month: monthName };
      }

      if (transaction.type === 'income') {
        monthlyTotals[monthKey].income += transaction.amount;
      } else {
        monthlyTotals[monthKey].expenses += transaction.amount;
      }
    });

    return Object.values(monthlyTotals).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const categoryData = React.useMemo(() => {
    const categoryTotals: { [key: string]: { name: string; amount: number; color: string } } = {};

    transactions.forEach(transaction => {
      if (transaction.type === 'expense' && transaction.category) {
        const categoryId = transaction.category.id.toString();
        if (!categoryTotals[categoryId]) {
          categoryTotals[categoryId] = {
            name: transaction.category.name,
            amount: 0,
            color: transaction.category.color
          };
        }
        categoryTotals[categoryId].amount += transaction.amount;
      }
    });

    return Object.values(categoryTotals);
  }, [transactions]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

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
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Visualize your financial data with interactive charts</p>
      </div>

      {/* Monthly Income vs Expenses */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Income vs Expenses</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              <Bar dataKey="income" fill="#10B981" name="Income" />
              <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Expense Categories</h2>
          {categoryData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-16">No expense data available</p>
          )}
        </div>

        {/* Summary Stats */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Summary</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800">Total Income</p>
              <p className="text-2xl font-bold text-green-900">
                ${transactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-800">Total Expenses</p>
              <p className="text-2xl font-bold text-red-900">
                ${transactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Net Balance</p>
              <p className="text-2xl font-bold text-blue-900">
                ${(transactions
                  .filter(t => t.type === 'income')
                  .reduce((sum, t) => sum + t.amount, 0) -
                  transactions
                  .filter(t => t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0)
                ).toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-800">Total Transactions</p>
              <p className="text-2xl font-bold text-purple-900">{transactions.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;