import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SidePanel } from './SidePanel.js';

const container = document.getElementById('root');

if (!container) {
  throw new Error('AgentTailor: Side panel root element not found');
}

createRoot(container).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
);
