import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useDarkMode } from '../contexts/DarkModeContext'

export const Navigation: React.FC = () => {
  const location = useLocation()
  const { theme, toggleTheme } = useDarkMode()

  const isActive = (path: string) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/')
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Navigation Links */}
          <div className="flex space-x-8">
            <Link
              to="/dashboard"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/transactions"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                isActive('/transactions')
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Transações
            </Link>
            <Link
              to="/budget"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                isActive('/budget')
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Orçamento
            </Link>
            <Link
              to="/import"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors ${
                isActive('/import')
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              Importar
            </Link>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Alternar tema"
            title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}