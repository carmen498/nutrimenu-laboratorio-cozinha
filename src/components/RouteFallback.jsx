// Fallback de Suspense das rotas carregadas sob demanda (React.lazy).
// `fullScreen` cobre a viewport (entrada direta em URL protegida, antes do
// AppLayout montar); sem ela, ocupa só a área de conteúdo do layout,
// mantendo TopBar e Sidebar visíveis durante a troca de página.
export default function RouteFallback({ fullScreen = false }) {
  return (
    <div
      role="status"
      aria-label="Carregando página"
      className={
        fullScreen
          ? "fixed inset-0 flex items-center justify-center bg-background"
          : "flex items-center justify-center py-24"
      }
    >
      <div className="w-8 h-8 rounded-full border-4 border-[#2A4E3D]/20 border-t-[#2A4E3D] animate-spin" />
    </div>
  );
}
