import React from 'react'
import { Link } from 'react-router-dom'

export const Navigation: React.FC = () => {
  return (
    <nav className="navigation">
      <ul>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/transactions">Transactions</Link></li>
        <li><Link to="/budget">Budget</Link></li>
        <li><Link to="/import">Import</Link></li>
      </ul>
    </nav>
  )
}