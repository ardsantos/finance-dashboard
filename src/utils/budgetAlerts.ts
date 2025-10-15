import { Budget, getAllBudgetStatuses } from './budget';

export interface BudgetAlert {
  id: string;
  categoryId: string;
  categoryName: string;
  type: 'warning' | 'exceeded';
  message: string;
  percentage: number;
  spent: number;
  budget: number;
  timestamp: number;
  dismissed?: boolean;
}

const ALERTS_STORAGE_KEY = 'finance_dashboard_budget_alerts';

export const getBudgetAlerts = (budgets: Budget[], transactions: any[]): BudgetAlert[] => {
  const statuses = getAllBudgetStatuses(budgets, transactions);
  const alerts: BudgetAlert[] = [];

  // Generate alerts for categories over 70% (warning) and 90% (exceeded)
  statuses.forEach(status => {
    let alertType: 'warning' | 'exceeded';
    let message: string;

    if (status.percentage >= 90) {
      alertType = 'exceeded';
      message = `Orçamento excedido! Você já gastou ${status.percentage.toFixed(1)}% do orçamento de ${status.categoryName}.`;
    } else if (status.percentage >= 70) {
      alertType = 'warning';
      message = `Atenção: Você já utilizou ${status.percentage.toFixed(1)}% do orçamento de ${status.categoryName}.`;
    } else {
      return; // No alert needed
    }

    alerts.push({
      id: `${status.categoryId}-${Date.now()}`,
      categoryId: status.categoryId,
      categoryName: status.categoryName,
      type: alertType,
      message,
      percentage: status.percentage,
      spent: status.spent,
      budget: status.budget,
      timestamp: Date.now(),
    });
  });

  return alerts;
};

export const saveAlerts = (alerts: BudgetAlert[]): void => {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch (error) {
    console.error('Error saving alerts:', error);
  }
};

export const loadAlerts = (): BudgetAlert[] => {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading alerts:', error);
  }
  return [];
};

export const dismissAlert = (alertId: string): void => {
  const alerts = loadAlerts();
  const updatedAlerts = alerts.map(alert =>
    alert.id === alertId ? { ...alert, dismissed: true } : alert
  );
  saveAlerts(updatedAlerts);
};

export const clearOldAlerts = (): void => {
  const alerts = loadAlerts();
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentAlerts = alerts.filter(alert => alert.timestamp > thirtyDaysAgo);
  saveAlerts(recentAlerts);
};

export const getActiveAlerts = (budgets: Budget[], transactions: any[]): BudgetAlert[] => {
  // Clear old alerts first
  clearOldAlerts();

  // Get current alerts based on budget status
  const currentAlerts = getBudgetAlerts(budgets, transactions);

  // Get previously dismissed alerts
  const dismissedAlerts = loadAlerts().filter(alert => alert.dismissed);

  // Merge current alerts with dismissed ones (don't show dismissed alerts again unless still over budget)
  const dismissedIds = new Set(dismissedAlerts.map(alert => alert.categoryId));

  return currentAlerts.filter(alert => {
    // Show alert if it wasn't dismissed for this category
    if (dismissedIds.has(alert.categoryId)) {
      // Only show again if it's now exceeded (90%+) and was previously just a warning
      const previousAlert = dismissedAlerts.find(a => a.categoryId === alert.categoryId);
      return alert.type === 'exceeded' && previousAlert?.type === 'warning';
    }
    return true;
  });
};

export const getOverBudgetCount = (budgets: Budget[], transactions: any[]): number => {
  const statuses = getAllBudgetStatuses(budgets, transactions);
  return statuses.filter(status => status.percentage >= 90).length;
};

export const checkTransactionBudgetImpact = (
  transaction: any,
  budgets: Budget[],
  existingTransactions: any[]
): BudgetAlert | null => {
  if (!transaction.category || transaction.amount >= 0) {
    return null; // Only check expense transactions
  }

  // Simulate adding the transaction to existing ones
  const allTransactions = [...existingTransactions, transaction];
  const statuses = getAllBudgetStatuses(budgets, allTransactions);

  const status = statuses.find(s => s.categoryId === transaction.categoryId);
  if (!status) return null;

  // Check if this transaction pushes the category over budget
  if (status.percentage >= 90) {
    return {
      id: `transaction-${transaction.categoryId}-${Date.now()}`,
      categoryId: transaction.categoryId,
      categoryName: status.categoryName,
      type: status.percentage >= 100 ? 'exceeded' : 'warning',
      message: status.percentage >= 100
        ? `Atenção: Esta transação excede o orçamento de ${status.categoryName}!`
        : `Atenção: Esta transação ultrapassa 90% do orçamento de ${status.categoryName}.`,
      percentage: status.percentage,
      spent: status.spent,
      budget: status.budget,
      timestamp: Date.now(),
    };
  }

  return null;
};