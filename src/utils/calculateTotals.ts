interface Transaction {
  amount: number
  [key: string]: any
}

interface Totals {
  total: number
  income: number
  expenses: number
}

export const calculateTotals = (transactions: Transaction[]): Totals => {
  return transactions.reduce(
    (acc: Totals, transaction: Transaction) => ({
      ...acc,
      total: acc.total + transaction.amount,
      income: transaction.amount > 0 ? acc.income + transaction.amount : acc.income,
      expenses: transaction.amount < 0 ? acc.expenses + Math.abs(transaction.amount) : acc.expenses
    }),
    { total: 0, income: 0, expenses: 0 }
  )
}