import React, { useState, useEffect } from 'react'
import { loadTransactions, saveTransactions, Transaction } from '../utils/storage'
import { getCategoryById, transactionCategories } from '../data/categories'
import { categorizeTransaction, learnFromCorrection } from '../utils/categorizer'
import { formatCurrency } from '../utils/formatCurrency'
import { parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    setTransactions(loadTransactions())
  }, [])

  const handleCategoryChange = (transactionId: string, newCategoryId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    // Learn from user correction
    learnFromCorrection(transaction.description, newCategoryId)

    // Update transaction
    const updatedTransactions = transactions.map(t =>
      t.id === transactionId ? { ...t, category: newCategoryId, isManual: true } : t
    )
    setTransactions(updatedTransactions)
    saveTransactions(updatedTransactions)
  }

  const handleDeleteTransaction = (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return

    const updatedTransactions = transactions.filter(t => t.id !== transactionId)
    setTransactions(updatedTransactions)
    saveTransactions(updatedTransactions)
  }

  const filteredTransactions = transactions
    .filter(t => {
      if (filterCategory && t.category !== filterCategory) return false
      if (filterAccount && t.account !== filterAccount) return false
      if (filterSearch && !t.description.toLowerCase().includes(filterSearch.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'description':
          comparison = a.description.localeCompare(b.description)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  const totals = filteredTransactions.reduce(
    (acc, t) => ({
      income: acc.income + (t.amount > 0 ? t.amount : 0),
      expenses: acc.expenses + (t.amount < 0 ? Math.abs(t.amount) : 0)
    }),
    { income: 0, expenses: 0 }
  )

  const getCategoryColor = (categoryId: string) => {
    const category = getCategoryById(categoryId)
    if (!category) return 'text-gray-500'

    const incomeCategories = transactionCategories.income.map(c => c.id)
    return incomeCategories.includes(categoryId) ? 'text-green-600' : 'text-red-600'
  }

  const getUniqueAccounts = () => {
    const accounts = [...new Set(transactions.map(t => t.account))]
    return accounts.sort()
  }

  const handleAutoCategorize = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    const result = categorizeTransaction(transaction.description)
    if (result.categoryId !== transaction.category) {
      handleCategoryChange(transactionId, result.categoryId)
    }
  }

  return (
    <div className="transaction-list">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Filtros e Busca</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              <optgroup label="Receitas">
                {transactionCategories.income.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </optgroup>
              <optgroup label="Despesas">
                {transactionCategories.expenses.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {getUniqueAccounts().map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split('-')
                setSortBy(sort as 'date' | 'amount' | 'description')
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date-desc">Data (mais recente)</option>
              <option value="date-asc">Data (mais antiga)</option>
              <option value="amount-desc">Valor (maior)</option>
              <option value="amount-asc">Valor (menor)</option>
              <option value="description-asc">Descrição (A-Z)</option>
              <option value="description-desc">Descrição (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 text-sm font-medium">Receitas</div>
          <div className="text-green-900 text-2xl font-bold">{formatCurrency(totals.income)}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-sm font-medium">Despesas</div>
          <div className="text-red-900 text-2xl font-bold">{formatCurrency(totals.expenses)}</div>
        </div>
        <div className={`${totals.income - totals.expenses >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4`}>
          <div className={`${totals.income - totals.expenses >= 0 ? 'text-blue-800' : 'text-orange-800'} text-sm font-medium`}>Saldo</div>
          <div className={`${totals.income - totals.expenses >= 0 ? 'text-blue-900' : 'text-orange-900'} text-2xl font-bold`}>
            {formatCurrency(totals.income - totals.expenses)}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-lg mb-2">Nenhuma transação encontrada</div>
            <div className="text-sm">Adicione transações ou ajuste os filtros</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map(transaction => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </div>
                      {transaction.isManual && (
                        <div className="text-xs text-blue-600">Categorizado manualmente</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingTransaction === transaction.id ? (
                        <select
                          value={transaction.category}
                          onChange={(e) => {
                            handleCategoryChange(transaction.id, e.target.value)
                            setEditingTransaction(null)
                          }}
                          onBlur={() => setEditingTransaction(null)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        >
                          <optgroup label="Receitas">
                            {transactionCategories.income.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Despesas">
                            {transactionCategories.expenses.map(cat => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingTransaction(transaction.id)}
                          className={`text-sm font-medium ${getCategoryColor(transaction.category)} hover:underline`}
                        >
                          {getCategoryById(transaction.category)?.icon} {getCategoryById(transaction.category)?.name}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.account}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleAutoCategorize(transaction.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Auto-categorizar"
                        >
                          🤖
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}