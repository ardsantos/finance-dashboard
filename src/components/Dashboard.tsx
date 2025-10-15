import React, { useState, useEffect } from "react";
import { loadTransactions, Transaction } from "../utils/storage";
import { getCategoryById, transactionCategories } from "../data/categories";
import { formatCurrency } from "../utils/formatCurrency";
import {
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
} from "date-fns";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, X } from "lucide-react";
import { loadBudgets } from "../utils/budget";
import { getActiveAlerts, dismissAlert } from "../utils/budgetAlerts";

// TypeScript interfaces for chart data
interface CategoryData {
  [key: string]: string | number | boolean;
  name: string;
  icon: string;
  amount: number;
  count: number;
  isIncome: boolean;
  color: string;
  categoryId: string;
}

interface AccountBreakdownData {
  income: number;
  expenses: number;
  count: number;
}

export const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "current" | "last30" | "last90"
  >("current");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendView, setTrendView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);

  useEffect(() => {
    setTransactions(loadTransactions());
  }, []);

  useEffect(() => {
    // Update budget alerts when transactions change
    const budgets = loadBudgets();
    const alerts = getActiveAlerts(budgets, transactions);
    setBudgetAlerts(alerts);
  }, [transactions]);

  // Filter transactions based on selected period
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case "last30":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "last90":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "current":
      default:
        startDate = startOfMonth(now);
        break;
    }

    return transactions.filter((t) => {
      const transactionDate = parseISO(t.date);
      return isWithinInterval(transactionDate, {
        start: startDate,
        end: endOfMonth(now),
      });
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate totals
  const totals = filteredTransactions.reduce(
    (acc, t) => ({
      income: acc.income + (t.amount > 0 ? t.amount : 0),
      expenses: acc.expenses + (t.amount < 0 ? Math.abs(t.amount) : 0),
    }),
    { income: 0, expenses: 0 }
  );

  // Category breakdown
  const categoryBreakdown = filteredTransactions.reduce((acc, t) => {
    const category = getCategoryById(t.category);
    if (!category) return acc;

    const key = category.id;
    if (!acc[key]) {
      acc[key] = {
        name: category.name,
        icon: category.icon,
        amount: 0,
        count: 0,
        isIncome: transactionCategories.income.some(
          (c) => c.id === category.id
        ),
        color: category.color || "#6B7280",
        categoryId: category.id,
      };
    }

    acc[key].amount += Math.abs(t.amount);
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, CategoryData>);

  // Prepare chart data
  const categoryChartData = Object.values(categoryBreakdown)
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Spending trend based on selected view
  const trendData = React.useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (trendView) {
      case "weekly":
        startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months
        break;
      case "daily":
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
    }

    const trendData: Record<string, { income: number; expenses: number }> = {};

    // Initialize time periods
    if (trendView === "daily") {
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
        const dateKey = format(d, "dd/MM");
        trendData[dateKey] = { income: 0, expenses: 0 };
      }
    } else if (trendView === "weekly") {
      for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 7)) {
        const dateKey = `Sem ${format(d, "dd/MM")}`;
        trendData[dateKey] = { income: 0, expenses: 0 };
      }
    } else if (trendView === "monthly") {
      for (let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
        const dateKey = format(d, "MMM/yy");
        trendData[dateKey] = { income: 0, expenses: 0 };
      }
    }

    // Fill with transaction data
    filteredTransactions.forEach((t) => {
      let dateKey: string;
      const transactionDate = parseISO(t.date);

      if (trendView === "daily") {
        dateKey = format(transactionDate, "dd/MM");
      } else if (trendView === "weekly") {
        const weekStart = new Date(transactionDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        dateKey = `Sem ${format(weekStart, "dd/MM")}`;
      } else {
        dateKey = format(transactionDate, "MMM/yy");
      }

      if (trendData[dateKey]) {
        if (t.amount > 0) {
          trendData[dateKey].income += t.amount;
        } else {
          trendData[dateKey].expenses += Math.abs(t.amount);
        }
      }
    });

    return Object.entries(trendData).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [filteredTransactions, trendView]);

  // Account breakdown
  const accountBreakdown = filteredTransactions.reduce((acc, t) => {
    if (!acc[t.account]) {
      acc[t.account] = { income: 0, expenses: 0, count: 0 };
    }
    if (t.amount > 0) {
      acc[t.account].income += t.amount;
    } else {
      acc[t.account].expenses += Math.abs(t.amount);
    }
    acc[t.account].count += 1;
    return acc;
  }, {} as Record<string, AccountBreakdownData>);

  
  const formatTooltipValue = (value: number) => formatCurrency(value);

  const handleCategoryClick = (data: any) => {
    if (data && data.categoryId) {
      setSelectedCategory(data.categoryId);
    }
  };

  const getSelectedCategoryTransactions = () => {
    if (!selectedCategory) return [];
    return filteredTransactions.filter(t => t.category === selectedCategory);
  };

  const selectedCategoryData = selectedCategory ? categoryBreakdown[selectedCategory] : null;

  const handleDismissAlert = (alertId: string) => {
    dismissAlert(alertId);
    setBudgetAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  return (
    <div className="dashboard max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard Financeiro
        </h1>
        <p className="text-gray-600 mt-2">
          Visão geral das suas finanças com categorização automática brasileira
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 transition-colors">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="current">Mês Atual</option>
              <option value="last30">Últimos 30 dias</option>
              <option value="last90">Últimos 90 dias</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Conta
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="all">Todas as contas</option>
              {Object.keys(accountBreakdown).map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-3 mb-8">
          {budgetAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`${
                alert.type === 'exceeded'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              } border rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`flex-shrink-0 mt-0.5 ${
                  alert.type === 'exceeded' ? 'text-red-600' : 'text-yellow-600'
                }`} size={20} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`font-medium ${
                      alert.type === 'exceeded' ? 'text-red-800' : 'text-yellow-800'
                    }`}>
                      {alert.type === 'exceeded' ? 'Orçamento Excedido' : 'Alerta de Orçamento'}
                    </h4>
                    <button
                      onClick={() => handleDismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className={`text-sm mt-1 ${
                    alert.type === 'exceeded' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {alert.message}
                  </p>
                  <div className={`text-xs mt-2 ${
                    alert.type === 'exceeded' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {formatCurrency(alert.spent)} de {formatCurrency(alert.budget)} utilizados ({alert.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-800 dark:text-green-200 text-sm font-medium">Receitas</div>
              <div className="text-green-900 dark:text-green-100 text-2xl font-bold mt-1">
                {formatCurrency(totals.income)}
              </div>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-800 dark:text-red-200 text-sm font-medium">Despesas</div>
              <div className="text-red-900 dark:text-red-100 text-2xl font-bold mt-1">
                {formatCurrency(totals.expenses)}
              </div>
            </div>
            <TrendingDown className="text-red-600" size={32} />
          </div>
        </div>

        <div
          className={`${
            totals.income - totals.expenses >= 0
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
          } border rounded-lg p-6 transition-colors`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`${
                  totals.income - totals.expenses >= 0
                    ? "text-blue-800 dark:text-blue-200"
                    : "text-orange-800 dark:text-orange-200"
                } text-sm font-medium`}
              >
                Saldo
              </div>
              <div
                className={`${
                  totals.income - totals.expenses >= 0
                    ? "text-blue-900 dark:text-blue-100"
                    : "text-orange-900 dark:text-orange-100"
                } text-2xl font-bold mt-1`}
              >
                {formatCurrency(totals.income - totals.expenses)}
              </div>
            </div>
            {totals.income - totals.expenses >= 0 ? (
              <TrendingUp className="text-blue-600" size={32} />
            ) : (
              <TrendingDown className="text-orange-600" size={32} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Despesas por Categoria
          </h3>
          {categoryChartData.length > 0 ? (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => {
                        const percent = (entry as any).percent || 0;
                        return percent > 5 ? `${(percent * 100).toFixed(0)}%` : '';
                      }}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="amount"
                      onClick={handleCategoryClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {categoryChartData.map((entry, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={formatTooltipValue}
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload as CategoryData;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                              <p className="font-medium text-gray-900">{data.name}</p>
                              <p className="text-sm text-gray-700">{formatCurrency(data.amount)}</p>
                              <p className="text-xs text-gray-500">{data.count} transações</p>
                              <p className="text-xs text-blue-600 mt-1">Clique para ver detalhes</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="lg:w-48">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Categorias</h4>
                  {categoryChartData.map((category) => (
                    <div
                      key={category.categoryId}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      onClick={() => handleCategoryClick(category)}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm truncate max-w-24">{category.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhuma transação no período selecionado
            </div>
          )}
        </div>

        {/* Selected Category Details */}
        {selectedCategory && selectedCategoryData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Detalhes da Categoria: {selectedCategoryData.name}
              </h3>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ✕ Fechar
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl mb-2">{selectedCategoryData.icon}</div>
                <div className="font-medium">{selectedCategoryData.name}</div>
                <div className={`text-lg font-bold ${selectedCategoryData.isIncome ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(selectedCategoryData.amount)}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedCategoryData.count} transações
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Transações nesta categoria:</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getSelectedCategoryTransactions().map((transaction, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('pt-BR')} • {transaction.account}
                      </div>
                    </div>
                    <div className={`font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Tendência de Gastos
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setTrendView("daily")}
                className={`px-3 py-1 text-sm rounded ${
                  trendView === "daily"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Diário
              </button>
              <button
                onClick={() => setTrendView("weekly")}
                className={`px-3 py-1 text-sm rounded ${
                  trendView === "weekly"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setTrendView("monthly")}
                className={`px-3 py-1 text-sm rounded ${
                  trendView === "monthly"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Mensal
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={trendView === "monthly" ? -45 : 0}
                textAnchor={trendView === "monthly" ? "end" : "middle"}
                height={trendView === "monthly" ? 60 : 40}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                strokeWidth={2}
                name="Receitas"
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#EF4444"
                strokeWidth={2}
                name="Despesas"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 transition-colors">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Análise por Categoria
        </h3>
        {categoryChartData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryChartData.map((category) => (
              <div
                key={category.name}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category.count} transações
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <div
                  className={`text-lg font-bold ${
                    category.isIncome ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(category.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma Transação Ainda
            </h3>
            <p className="text-gray-600 mb-6">
              Comece a acompanhar suas finanças importando suas transações ou adicionando manualmente.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="/import"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📥 Importar CSV
              </a>
              <a
                href="/transactions"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ➕ Adicionar Transação
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            Nenhuma transação no período selecionado
          </div>
        )}
      </div>

      {/* Account Breakdown */}
      {Object.keys(accountBreakdown).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Resumo por Conta
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(accountBreakdown).map(([account, data]) => (
              <div
                key={account}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="font-medium text-gray-900 mb-2">{account}</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Receitas:</span>
                    <span className="text-green-600 font-medium">
                      {formatCurrency(data.income)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Despesas:</span>
                    <span className="text-red-600 font-medium">
                      {formatCurrency(data.expenses)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-1 border-t">
                    <span className="text-gray-600">Saldo:</span>
                    <span
                      className={
                        data.income - data.expenses >= 0
                          ? "text-blue-600"
                          : "text-orange-600"
                      }
                    >
                      {formatCurrency(data.income - data.expenses)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.count} transações
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
