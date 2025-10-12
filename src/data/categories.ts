export interface Category {
  id: string
  name: string
  icon: string
}

export interface TransactionCategories {
  income: Category[]
  expenses: Category[]
}

export const transactionCategories: TransactionCategories = {
  income: [
    { id: 'salary', name: 'Salary', icon: '💰' },
    { id: 'freelance', name: 'Freelance', icon: '💼' },
    { id: 'investment', name: 'Investment Returns', icon: '📈' },
    { id: 'other_income', name: 'Other Income', icon: '💵' }
  ],
  expenses: [
    { id: 'housing', name: 'Housing', icon: '🏠' },
    { id: 'food', name: 'Food & Dining', icon: '🍔' },
    { id: 'transportation', name: 'Transportation', icon: '🚗' },
    { id: 'utilities', name: 'Utilities', icon: '💡' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'personal', name: 'Personal Care', icon: '🧴' },
    { id: 'travel', name: 'Travel', icon: '✈️' },
    { id: 'savings', name: 'Savings & Investments', icon: '🏦' },
    { id: 'other_expense', name: 'Other Expenses', icon: '📝' }
  ]
}

export const getCategoryById = (id: string): Category | undefined => {
  const allCategories = [...transactionCategories.income, ...transactionCategories.expenses]
  return allCategories.find(category => category.id === id)
}

export const getCategoriesByType = (type: keyof TransactionCategories): Category[] => {
  return transactionCategories[type] || []
}