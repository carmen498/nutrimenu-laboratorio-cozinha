export default function TemplateWhatsappPreview({ cabecalhoUrl, corpo, rodape }) {
  const corpoPreview = (corpo || "").replace(/{{\s*nome\s*}}/gi, "João");

  return (
    <div className="rounded-2xl bg-[#e5ddd5] p-6 flex justify-center">
      <div className="max-w-[280px] bg-white rounded-lg shadow-md overflow-hidden">
        {cabecalhoUrl && (
          <img src={cabecalhoUrl} alt="Cabeçalho do template" className="w-full h-32 object-cover" />
        )}
        <div className="p-3 space-y-2">
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {corpoPreview || "Corpo da mensagem..."}
          </p>
          {rodape && <p className="text-xs text-gray-500 border-t pt-1.5">{rodape}</p>}
          <p className="text-[10px] text-gray-400 text-right">12:00</p>
        </div>
      </div>
    </div>
  );
}