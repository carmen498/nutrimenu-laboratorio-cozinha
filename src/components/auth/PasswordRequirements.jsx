import { Check, Circle } from "lucide-react";

export default function PasswordRequirements({ password }) {
  /** @type {Array<[boolean, string]>} */
  const items = [
    [password.length >= 8, "Pelo menos 8 caracteres"],
    [/[a-z]/.test(password) && /[A-Z]/.test(password), "Letras maiúsculas e minúsculas"],
    [/\d/.test(password), "Pelo menos um número"],
  ];

  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Requisitos da senha">
      {items.map(([ok, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          {ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5" />}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
