import React from 'react'

export const Header: React.FC = () => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 text-white py-6 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <p className="text-blue-100 dark:text-blue-200 mt-2">
          Gerencie suas finanças com inteligência e estilo
        </p>
      </div>
    </header>
  )
}