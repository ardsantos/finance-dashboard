import React, { useState, useEffect } from 'react';
import { loadTransactions, Transaction } from '../utils/storage';
import { transactionCategories } from '../data/categories';
import { formatCurrency } from '../utils/formatCurrency';
import {
  Budget as BudgetItem,
  BudgetStatus,
  loadBudgets,
  updateBudget,
  resetToSuggestedBudgets,
  getAllBudgetStatuses,
} from '../utils/budget';
import { AlertCircle, RefreshCw, Target, TrendingDown } from 'lucide-react';

export const Budget: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    // Load data
    setTransactions(loadTransactions());
    setBudgets(loadBudgets());
  }, []);

  useEffect(() => {
    // Recalculate budget statuses when transactions or budgets change
    const statuses = getAllBudgetStatuses(budgets, transactions);
    setBudgetStatuses(statuses);
  }, [budgets, transactions]);

  const handleBudgetChange = (categoryId: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const updatedBudgets = updateBudget(budgets, categoryId, numAmount);
    setBudgets(updatedBudgets);
  };

  const handleResetToSuggested = () => {
    setIsResetting(true);
    setTimeout(() => {
      const suggestedBudgets = resetToSuggestedBudgets();
      setBudgets(suggestedBudgets);
      setIsResetting(false);
    }, 500); // Small delay for visual feedback
  };

  const getCurrentBudget = (categoryId: string): number => {
    const budget = budgets.find(b => b.categoryId === categoryId);
    return budget?.amount || 0;
  };

  const getStatusForCategory = (categoryId: string): BudgetStatus | null => {
    return budgetStatuses.find(status => status.categoryId === categoryId) || null;
  };

  const getTotalBudgeted = (): number => {
    return budgets.reduce((total, budget) => total + budget.amount, 0);
  };

  const getTotalSpent = (): number => {
    return budgetStatuses.reduce((total, status) => total + status.spent, 0);
  };

  const getOverBudgetCount = (): number => {
    return budgetStatuses.filter(status => status.status === 'over').length;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Orçamento Mensal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Defina e acompanhe seus limites de gastos por categoria
            </p>
          </div>
          <button
            onClick={handleResetToSuggested}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Redefinindo...' : 'Redefinir para Sugerido'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Orçado</div>
                <div className="text-gray-900 dark:text-gray-100 text-2xl font-bold mt-1">
                  {formatCurrency(getTotalBudgeted())}
                </div>
              </div>
              <Target className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Gasto</div>
                <div className="text-gray-900 dark:text-gray-100 text-2xl font-bold mt-1">
                  {formatCurrency(getTotalSpent())}
                </div>
              </div>
              <TrendingDown className="text-red-600" size={32} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">Categorias Acima</div>
                <div className="text-gray-900 dark:text-gray-100 text-2xl font-bold mt-1">
                  {getOverBudgetCount()}
                </div>
              </div>
              <AlertCircle className={`${getOverBudgetCount() > 0 ? 'text-red-600' : 'text-green-600'}`} size={32} />
            </div>
          </div>
        </div>

        {/* Alert for over-budget categories */}
        {getOverBudgetCount() > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <h3 className="text-red-800 font-medium">Atenção: Orçamento Excedido</h3>
                <p className="text-red-700 text-sm mt-1">
                  Você excedeu o orçamento em {getOverBudgetCount()} categoria(s).
                  Considere reduzir seus gastos ou ajustar seus limites.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Budget Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transition-colors">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Categorias de Despesa
          </h2>

          <div className="space-y-6">
            {transactionCategories.expenses.map((category) => {
              const currentBudget = getCurrentBudget(category.id);
              const status = getStatusForCategory(category.id);

              return (
                <div key={category.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{category.name}</h3>
                        {status && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(status.spent)} de {formatCurrency(status.budget)} gastos
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Orçamento Mensal
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                            R$
                          </span>
                          <input
                            type="number"
                            value={currentBudget || ''}
                            onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                            placeholder="0,00"
                            className="pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-32 transition-colors"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {status && status.budget > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={`font-medium ${
                          status.status === 'over' ? 'text-red-600' :
                          status.status === 'warning' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {status.percentage.toFixed(1)}% utilizado
                        </span>
                        <span className={`font-medium ${
                          status.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {status.remaining >= 0 ? 'Restam' : 'Excedeu'} {formatCurrency(Math.abs(status.remaining))}
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            status.status === 'over' ? 'bg-red-500' :
                            status.status === 'warning' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(status.percentage, 100)}%` }}
                        />
                      </div>

                      {status.status === 'over' && (
                        <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                          <AlertCircle size={16} />
                          <span>Orçamento excedido! Considere reduzir gastos neste mês.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {budgets.length === 0 && (
            <div className="text-center py-12">
              <Target className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum Orçamento Definido
              </h3>
              <p className="text-gray-600 mb-4">
                Comece definindo orçamentos para suas categorias de despesa ou use os valores sugeridos.
              </p>
              <button
                onClick={handleResetToSuggested}
                disabled={isResetting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
                Usar Orçamentos Sugeridos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};