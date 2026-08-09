// Persistência do rascunho do Assistente do Evento (NovoPlanejamentoDialog) em
// sessionStorage. Permite que o rascunho sobreviva a uma navegação completa de
// página (ex: abrir uma receita a partir do prato do evento) sem perder dados,
// já que o diálogo é desmontado quando a rota muda.
const KEY = "labcozinha_evento_rascunho_v1";

export function salvarRascunhoEvento(data) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch (e) { /* sessionStorage indisponível — ignora */ }
}

export function lerRascunhoEvento() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

export function limparRascunhoEvento() {
  try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}