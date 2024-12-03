import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProjectBoardWrapper from './ProjectBoardWrapper.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProjectBoardWrapper />
  </StrictMode>,
)
