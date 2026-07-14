import { useState } from "react";
import { Input } from "@/components/ui/input";

// Input decimal em formato brasileiro (vírgula) — mantém o texto digitado
// intacto enquanto o usuário escreve, evitando que "2,88" seja lido como 288.
export default function DecimalInput({ value, onChange, className, placeholder }) {
  const [text, setText] = useState(value != null ? String(value).replace(".", ",") : "");

  const handleChange = (e) => {
    const raw = e.target.value;
    if (!/^[0-9]*[,.]?[0-9]*$/.test(raw)) return;
    setText(raw);
    if (raw === "" || raw === "," || raw === ".") {
      onChange(null);
      return;
    }
    const num = parseFloat(raw.replace(",", "."));
    if (!isNaN(num)) onChange(num);
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
    />
  );
}