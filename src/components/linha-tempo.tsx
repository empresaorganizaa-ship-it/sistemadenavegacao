import Link from "next/link";
import { Check } from "lucide-react";
import { data as fData } from "@/lib/formatos";

export type Etapa = { id: string; titulo: string; descricao: string | null; data_inicio: string | null; data_fim: string | null; status: string };

function periodo(e: Etapa) {
  if (e.data_inicio && e.data_fim) return `${fData(e.data_inicio).slice(0, 5)} a ${fData(e.data_fim)}`;
  if (e.data_inicio) return `a partir de ${fData(e.data_inicio)}`;
  if (e.data_fim) return `até ${fData(e.data_fim)}`;
  return "";
}

/** Linha do tempo das etapas do acompanhamento. */
export function LinhaTempo({ etapas, compacta = false, acoes }: { etapas: Etapa[]; compacta?: boolean; acoes?: (e: Etapa) => React.ReactNode }) {
  return (
    <ol className="relative flex flex-col">
      {etapas.map((e, i) => {
        const feita = e.status === "concluida";
        const agora = e.status === "andamento";
        return (
          <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
            {i < etapas.length - 1 && (
              <span className={`absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5 ${feita ? "bg-destaque" : "bg-borda"}`} aria-hidden />
            )}
            <span
              className={`relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-medium ${
                feita ? "border-destaque bg-destaque text-sobre-destaque" : agora ? "border-destaque bg-superficie text-destaque" : "border-borda bg-superficie text-suave"
              }`}
            >
              {feita ? <Check className="size-4" /> : i + 1}
            </span>
            <div className={`min-w-0 flex-1 ${agora ? "rounded-xl bg-destaque-suave px-3 py-2 -mt-1.5" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link href={`/item/etapas_acompanhamento/${e.id}`} className={`font-medium hover:text-destaque-escuro ${feita ? "text-suave" : ""}`}>
                  {e.titulo}
                </Link>
                <span className="text-xs text-suave">{periodo(e)}</span>
              </div>
              {agora && <p className="text-xs font-medium text-destaque-escuro">Em andamento</p>}
              {!compacta && e.descricao && <p className="mt-1 text-sm text-suave">{e.descricao}</p>}
              {acoes && <div className="mt-2">{acoes(e)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
