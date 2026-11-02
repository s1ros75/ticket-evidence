import { Route, Routes, useParams } from 'react-router'
import { AccountsPage } from './pages/AccountsPage'
import { DashboardPage } from './pages/DashboardPage'
import { PasswordPage } from './pages/PasswordPage'
import { TicketDetailPage } from './pages/TicketDetailPage'
import { TicketsPage } from './pages/TicketsPage'
import './App.css'

// 別のチケットへ移ったときに前の表示が残らないよう、idをkeyにして作り直す
function TicketDetailRoute() {
  const { id = '' } = useParams()
  return <TicketDetailPage key={id} id={id} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<TicketsPage />} />
      <Route path="/tickets/:id" element={<TicketDetailRoute />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/password" element={<PasswordPage />} />
      <Route path="/admin/users" element={<AccountsPage />} />
    </Routes>
  )
}

export default App
