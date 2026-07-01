import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { TournamentDataProvider } from './lib/tournamentData.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TournamentDataProvider>
        <App />
      </TournamentDataProvider>
    </BrowserRouter>
  </StrictMode>,
)
