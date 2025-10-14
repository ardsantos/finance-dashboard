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

// TypeScript interfaces for chart data
interface CategoryData {
  [key: string]: string | number | boolean;
  name: string;
  icon: string;
  amount: number;
  count: number;
  isIncome: boolean;
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

  useEffect(() => {
    setTransactions(loadTransactions());
  }, []);

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

  // Daily spending trend (last 30 days)
  const dailyTrend = React.useMemo(() => {
    const dailyData: Record<string, { income: number; expenses: number }> = {};
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize all days
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dateKey = format(d, "dd/MM");
      dailyData[dateKey] = { income: 0, expenses: 0 };
    }

    // Fill with transaction data
    filteredTransactions.forEach((t) => {
      const dateKey = format(parseISO(t.date), "dd/MM");
      if (dailyData[dateKey]) {
        if (t.amount > 0) {
          dailyData[dateKey].income += t.amount;
        } else {
          dailyData[dateKey].expenses += Math.abs(t.amount);
        }
      }
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [filteredTransactions]);

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

  const COLORS = [
    "#3B82F6",
    "#EF4444",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
    "#F97316",
  ];

  const formatTooltipValue = (value: number) => formatCurrency(value);

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
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">Mês Atual</option>
              <option value="last30">Últimos 30 dias</option>
              <option value="last90">Últimos 90 dias</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conta
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-800 text-sm font-medium">Receitas</div>
              <div className="text-green-900 text-2xl font-bold mt-1">
                {formatCurrency(totals.income)}
              </div>
            </div>
            <div className="text-green-600 text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-red-800 text-sm font-medium">Despesas</div>
              <div className="text-red-900 text-2xl font-bold mt-1">
                {formatCurrency(totals.expenses)}
              </div>
            </div>
            <div className="text-red-600 text-3xl">💸</div>
          </div>
        </div>

        <div
          className={`${
            totals.income - totals.expenses >= 0
              ? "bg-blue-50 border-blue-200"
              : "bg-orange-50 border-orange-200"
          } border rounded-lg p-6`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                className={`${
                  totals.income - totals.expenses >= 0
                    ? "text-blue-800"
                    : "text-orange-800"
                } text-sm font-medium`}
              >
                Saldo
              </div>
              <div
                className={`${
                  totals.income - totals.expenses >= 0
                    ? "text-blue-900"
                    : "text-orange-900"
                } text-2xl font-bold mt-1`}
              >
                {formatCurrency(totals.income - totals.expenses)}
              </div>
            </div>
            <div
              className={`${
                totals.income - totals.expenses >= 0
                  ? "text-blue-600"
                  : "text-orange-600"
              } text-3xl`}
            >
              {totals.income - totals.expenses >= 0 ? "📈" : "📉"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Despesas por Categoria
          </h3>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    const percent = (entry as any).percent || 0;
                    const name = (entry as any).name || "";
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {categoryChartData.map((_, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltipValue} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Nenhuma transação no período selecionado
            </div>
          )}
        </div>

        {/* Daily Trend */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Tendência Diária
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={formatTooltipValue} />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                strokeWidth={2}
                name="Receitas"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#EF4444"
                strokeWidth={2}
                name="Despesas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          Análise por Categoria
        </h3>
        {categoryChartData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryChartData.map((category, index: number) => (
              <div
                key={category.name}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {category.count} transações
                      </div>
                    </div>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
