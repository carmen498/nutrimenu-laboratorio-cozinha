import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { garantirPrimeiroToque } from '@/lib/capturarOrigemAquisicao'

// Captura a origem de aquisição no PRIMEIRO toque: na primeira página que
// qualquer visitante abre. Se já existe origem guardada no localStorage, não
// toca. Assim o UTM real de chegada sobrevive à navegação interna até o
// cadastro, mesmo que o usuário percorra várias telas antes de se cadastrar.
garantirPrimeiroToque();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)