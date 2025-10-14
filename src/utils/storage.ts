import { transactionCategories, TransactionCategories } from '../data/categories'

// Data type definitions
export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  account: string
  isManual: boolean
}

export interface StorageData {
  transactions: Transaction[]
  categories: TransactionCategories
  lastUpdated: string
}

// Storage keys
const STORAGE_KEYS = {
  TRANSACTIONS: 'finance_transactions',
  CATEGORIES: 'finance_categories',
  LAST_UPDATED: 'finance_last_updated'
}

// Error types
export class StorageError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'StorageError'
  }
}

// Validation functions
const validateTransaction = (transaction: any): transaction is Transaction => {
  return (
    typeof transaction.id === 'string' &&
    typeof transaction.date === 'string' &&
    typeof transaction.description === 'string' &&
    typeof transaction.amount === 'number' &&
    typeof transaction.category === 'string' &&
    typeof transaction.account === 'string' &&
    typeof transaction.isManual === 'boolean' &&
    !isNaN(Date.parse(transaction.date))
  )
}

const validateTransactions = (transactions: any[]): transactions is Transaction[] => {
  return Array.isArray(transactions) && transactions.every(validateTransaction)
}

const validateCategories = (categories: any): categories is TransactionCategories => {
  return (
    categories &&
    Array.isArray(categories.income) &&
    Array.isArray(categories.expenses) &&
    categories.income.every((cat: any) =>
      typeof cat.id === 'string' && typeof cat.name === 'string' && typeof cat.icon === 'string'
    ) &&
    categories.expenses.every((cat: any) =>
      typeof cat.id === 'string' && typeof cat.name === 'string' && typeof cat.icon === 'string'
    )
  )
}

// Safe localStorage operations with error handling
const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    throw new StorageError(`Failed to read from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    throw new StorageError(`Failed to write to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

// Transaction management
export const saveTransactions = (transactions: Transaction[]): void => {
  if (!validateTransactions(transactions)) {
    throw new StorageError('Invalid transaction data structure')
  }

  try {
    const serializedData = JSON.stringify(transactions)
    safeSetItem(STORAGE_KEYS.TRANSACTIONS, serializedData)
    safeSetItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString())
  } catch (error) {
    throw new StorageError(`Failed to save transactions: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

export const loadTransactions = (): Transaction[] => {
  try {
    const data = safeGetItem(STORAGE_KEYS.TRANSACTIONS)
    if (!data) {
      return []
    }

    const parsed = JSON.parse(data)
    if (!validateTransactions(parsed)) {
      throw new StorageError('Invalid transaction data found in storage')
    }

    return parsed
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    throw new StorageError(`Failed to load transactions: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

// Category management
export const saveCategories = (categories: TransactionCategories): void => {
  if (!validateCategories(categories)) {
    throw new StorageError('Invalid category data structure')
  }

  try {
    const serializedData = JSON.stringify(categories)
    safeSetItem(STORAGE_KEYS.CATEGORIES, serializedData)
    safeSetItem(STORAGE_KEYS.LAST_UPDATED, new Date().toISOString())
  } catch (error) {
    throw new StorageError(`Failed to save categories: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

export const loadCategories = (): TransactionCategories => {
  try {
    const data = safeGetItem(STORAGE_KEYS.CATEGORIES)
    if (!data) {
      return transactionCategories // Return default categories
    }

    const parsed = JSON.parse(data)
    if (!validateCategories(parsed)) {
      throw new StorageError('Invalid category data found in storage')
    }

    return parsed
  } catch (error) {
    if (error instanceof StorageError) {
      throw error
    }
    throw new StorageError(`Failed to load categories: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

// Export/Import functionality
export const exportData = (): string => {
  try {
    const transactions = loadTransactions()
    const categories = loadCategories()

    const exportData: StorageData = {
      transactions,
      categories,
      lastUpdated: new Date().toISOString()
    }

    return JSON.stringify(exportData, null, 2)
  } catch (error) {
    throw new StorageError(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

export const importData = (jsonData: string): { imported: number; errors: string[] } => {
  const result = { imported: 0, errors: [] as string[] }

  try {
    const data = JSON.parse(jsonData)

    // Validate structure
    if (!data || typeof data !== 'object') {
      throw new StorageError('Invalid JSON data')
    }

    // Import transactions if present
    if (data.transactions && Array.isArray(data.transactions)) {
      if (validateTransactions(data.transactions)) {
        saveTransactions(data.transactions)
        result.imported += data.transactions.length
      } else {
        result.errors.push('Invalid transaction data format')
      }
    }

    // Import categories if present
    if (data.categories) {
      if (validateCategories(data.categories)) {
        saveCategories(data.categories)
        result.imported += 1
      } else {
        result.errors.push('Invalid category data format')
      }
    }

    return result
  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return result
  }
}

// Generate sample Brazilian transactions for testing
export const generateBrazilianSampleTransactions = (): Transaction[] => {
  const brazilianAccounts = ['Itaú', 'Bradesco', 'Caixa', 'NuBank', 'Inter']
  const brazilianDescriptions = [
    'Supermercado Carrefour',
    'Restaurante Outback',
    'Posto Ipiranga',
    'Academia Bio Ritmo',
    'Netflix Brasil',
    'Amazon Prime',
    'Loja Americanas',
    'Uber Viagem',
    'Farmácia Droga Raia',
    'Cinema Kinoplex',
    'Salário Mensal',
    'Freelance Development',
    'Rendimento Tesouro Direto',
    'Aluguel Apartamento',
    'Condomínio Edifício',
    'Conta de Luz Light',
    'Net Fibra',
    'Claro Celular',
    'iFood Delivery',
    'Shopping Iguatemi'
  ]

  const transactions: Transaction[] = []
  const now = new Date()

  // Generate 3 months of sample transactions
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0).getDate()

    // Generate random transactions throughout the month
    for (let i = 0; i < 15; i++) {
      const randomDay = Math.floor(Math.random() * daysInMonth) + 1
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), randomDay)

      const isIncome = Math.random() < 0.15 // 15% chance of income
      const amount = isIncome
        ? Math.floor(Math.random() * 8000) + 2000 // Income: R$ 2,000-10,000
        : -(Math.floor(Math.random() * 500) + 10) // Expense: R$ 10-510

      const category = isIncome
        ? ['salary', 'freelance', 'investment', 'other_income'][Math.floor(Math.random() * 4)]
        : ['housing', 'food', 'transportation', 'utilities', 'healthcare', 'entertainment', 'shopping', 'personal'][Math.floor(Math.random() * 8)]

      const transaction: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: date.toISOString().split('T')[0],
        description: brazilianDescriptions[Math.floor(Math.random() * brazilianDescriptions.length)],
        amount,
        category,
        account: brazilianAccounts[Math.floor(Math.random() * brazilianAccounts.length)],
        isManual: Math.random() < 0.7 // 70% chance of being manual entry
      }

      transactions.push(transaction)
    }
  }

  // Sort by date
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return transactions
}

// Utility function to clear all data (for testing/reset)
export const clearAllData = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    throw new StorageError(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}

// Get storage usage information
export const getStorageInfo = (): { used: number; available: number; percentage: number } => {
  try {
    let used = 0
    Object.values(STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key)
      if (data) {
        used += data.length
      }
    })

    // Rough estimate of localStorage limit (typically 5-10MB)
    const estimated = 5 * 1024 * 1024 // 5MB in characters

    return {
      used,
      available: estimated - used,
      percentage: Math.round((used / estimated) * 100)
    }
  } catch (error) {
    throw new StorageError(`Failed to get storage info: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error)
  }
}