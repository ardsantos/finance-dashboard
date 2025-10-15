import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Navigation } from './components/Navigation'
import { Dashboard } from './components/Dashboard'
import { Transactions } from './components/Transactions'
import { Budget } from './components/Budget'
import { Import } from './components/Import'
import { DarkModeProvider } from './contexts/DarkModeContext'
import './App.css'

const App: React.FC = () => {
  return (
    <DarkModeProvider>
      <Router>
        <div className="app bg-white dark:bg-gray-900 min-h-screen transition-colors">
          <Header />
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/import" element={<Import />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DarkModeProvider>
  )
}

export default App
