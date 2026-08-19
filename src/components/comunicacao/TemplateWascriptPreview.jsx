export default function TemplateWascriptPreview({ texto }) {
  const preview = (texto || "").replace(/{{\s*nome\s*}}/gi, "Renata");

  return (
    <div className="rounded-2xl bg-[#e5ddd5] p-6 flex justify-center">
      <div className="max-w-[280px] bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-3 space-y-2">
          <p className="text-sm text-gray-800 whitespace-pre-line">
            {preview || "Texto da mensagem..."}
          </p>
          <p className="text-[10px] text-gray-400 text-right">12:00</p>
        </div>
      </div>
    </div>
  );
}