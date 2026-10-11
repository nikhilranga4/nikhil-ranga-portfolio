import { createRoot } from 'react-dom/client'
import App from './App.tsx'
// Self-hosted variable fonts — each colour theme picks its own pairing (see index.css)
import '@fontsource-variable/unbounded'
import '@fontsource-variable/manrope'
import '@fontsource-variable/fredoka'
import '@fontsource-variable/nunito'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/jetbrains-mono'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
