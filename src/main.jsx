import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Maintenance from './pages/Maintenance.jsx'
import './index.css'

// Set in .env.production on the prod branch while the site isn't live yet.
const MAINTENANCE = import.meta.env.VITE_MAINTENANCE === 'true'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {MAINTENANCE ? (
        <Routes>
          <Route path="*" element={<Maintenance />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  </StrictMode>,
)
