import React, { useState } from 'react'
import { TransactionForm } from './TransactionForm'
import { TransactionList } from './TransactionList'
import { generateBrazilianSampleTransactions } from '../utils/storage'

export const Transactions: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleTransactionAdded = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleLoadSampleData = () => {
    if (confirm('Deseja carregar dados de exemplo? Isso substituirá suas transações atuais.')) {
      const sampleTransactions = generateBrazilianSampleTransactions()
      localStorage.setItem('finance_transactions', JSON.stringify(sampleTransactions))
      setRefreshKey(prev => prev + 1)
    }
  }

  return (
    <div className="transactions max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
        <p className="text-gray-600 mt-2">
          Gerencie suas transações com categorização automática inteligente
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={handleLoadSampleData}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            📊 Carregar Dados de Exemplo
          </button>
        </div>

        <div className="text-sm text-gray-500">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            🤖 Categorização Automática Brasileira
          </span>
        </div>
      </div>

      <TransactionForm onTransactionAdded={handleTransactionAdded} />

      <TransactionList key={refreshKey} />
    </div>
  )
}