import { transactionCategories } from '../data/categories';

export interface Budget {
  categoryId: string;
  amount: number;
}

export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'under' | 'warning' | 'over';
  color: string;
}

const BUDGET_STORAGE_KEY = 'finance_dashboard_budgets';

// Suggested budgets for Brazilian categories (in BRL)
const SUGGESTED_BUDGETS: Record<string, number> = {
  // Income categories (usually not budgeted, but included for completeness)
  salario: 0,
  freelance: 0,
  investimentos: 0,
  outras_receitas: 0,

  // Expense categories with realistic Brazilian monthly budgets
  alimentacao: 800,      // R$800/month for food
  transporte: 400,       // R$400/month for transportation
  moradia: 1500,         // R$1500/month for housing (rent/mortgage)
  saude: 300,           // R$300/month for healthcare
  lazer: 400,           // R$400/month for entertainment
  compras: 600,         // R$600/month for shopping
  educacao: 500,        // R$500/month for education
  servicos: 200,        // R$200/month for utilities
  outros: 300,          // R$300/month for miscellaneous
};

export const saveBudgets = (budgets: Budget[]): void => {
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
  } catch (error) {
    console.error('Error saving budgets:', error);
  }
};

export const loadBudgets = (): Budget[] => {
  try {
    const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading budgets:', error);
  }
  return [];
};

export const getSuggestedBudgets = (): Budget[] => {
  return Object.entries(SUGGESTED_BUDGETS).map(([categoryId, amount]) => ({
    categoryId,
    amount,
  }));
};

export const resetToSuggestedBudgets = (): Budget[] => {
  const suggestedBudgets = getSuggestedBudgets();
  saveBudgets(suggestedBudgets);
  return suggestedBudgets;
};

export const calculateBudgetStatus = (
  budgets: Budget[],
  transactions: any[],
  categoryId: string
): BudgetStatus | null => {
  const budget = budgets.find(b => b.categoryId === categoryId);
  if (!budget || budget.amount <= 0) {
    return null;
  }

  const category = transactionCategories.expenses.find(c => c.id === categoryId);
  if (!category) return null;

  // Calculate spending for current month
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const spent = transactions
    .filter(t => {
      const transactionDate = new Date(t.date);
      return (
        t.category === categoryId &&
        t.amount < 0 && // Only expenses
        transactionDate >= currentMonthStart &&
        transactionDate <= currentMonthEnd
      );
    })
    .reduce((total, t) => total + Math.abs(t.amount), 0);

  const remaining = budget.amount - spent;
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

  let status: 'under' | 'warning' | 'over';
  let color: string;

  if (percentage >= 90) {
    status = 'over';
    color = '#EF4444'; // red
  } else if (percentage >= 70) {
    status = 'warning';
    color = '#F59E0B'; // yellow
  } else {
    status = 'under';
    color = '#10B981'; // green
  }

  return {
    categoryId,
    categoryName: category.name,
    budget: budget.amount,
    spent,
    remaining,
    percentage,
    status,
    color,
  };
};

export const getAllBudgetStatuses = (budgets: Budget[], transactions: any[]): BudgetStatus[] => {
  return transactionCategories.expenses
    .map(category => calculateBudgetStatus(budgets, transactions, category.id))
    .filter((status): status is BudgetStatus => status !== null)
    .sort((a, b) => b.percentage - a.percentage); // Sort by percentage spent (highest first)
};

export const getBudgetAlerts = (budgets: Budget[], transactions: any[]): BudgetStatus[] => {
  return getAllBudgetStatuses(budgets, transactions)
    .filter(status => status.percentage >= 90); // Only categories over 90%
};

export const updateBudget = (budgets: Budget[], categoryId: string, amount: number): Budget[] => {
  const existingIndex = budgets.findIndex(b => b.categoryId === categoryId);
  const newBudgets = [...budgets];

  if (existingIndex >= 0) {
    if (amount > 0) {
      newBudgets[existingIndex] = { categoryId, amount };
    } else {
      // Remove budget if amount is 0 or negative
      newBudgets.splice(existingIndex, 1);
    }
  } else if (amount > 0) {
    newBudgets.push({ categoryId, amount });
  }

  saveBudgets(newBudgets);
  return newBudgets;
};