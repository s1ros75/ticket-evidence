import { Route, Routes, useParams } from 'react-router'
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
    </Routes>
  )
}

export default App
