"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** Painel que abre por cima da tela (lateral no computador, tela cheia no celular). */
export function Gaveta({
  aberta,
  aoFechar,
  titulo,
  children,
  largura = "max-w-xl",
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberta) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
    };
  }, [aberta, aoFechar]);

  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="absolute inset-0 bg-texto/30" onClick={aoFechar} />
      <div className={`absolute inset-y-0 right-0 flex w-full ${largura} flex-col bg-superficie shadow-2xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-borda px-5 py-4">
          <h2 className="truncate text-2xl">{titulo}</h2>
          <button onClick={aoFechar} className="p-1 text-suave hover:text-texto" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
