"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, MessageCircle } from "lucide-react";
import { cadencia, DIAS_FOLLOWUP } from "@/lib/followup";
import { data as fData } from "@/lib/formatos";
import { iniciarCadencia, marcarFollowup, pararCadencia } from "@/app/(app)/comercial/crm/followup-acoes";
import { BarraProgresso } from "./ui";

const COR = {
  feito: "text-suave",
  atrasado: "text-erro",
  hoje: "text-alerta",
  futuro: "text-suave",
} as const;

/** Checklist dos 6 follow-ups da paciente (dias 2, 5, 7, 10, 15 e 30). */
export function CadenciaFollowup({
  leadId, inicio, feitos, hoje, podeEditar, linkWhats,
}: {
  leadId: string;
  inicio: string | null;
  feitos: number[];
  hoje: string;
  podeEditar: boolean;
  linkWhats?: string | null;
}) {
  const [lista, alternar] = useOptimistic(feitos, (s, etapa: number) => (s.includes(etapa) ? s.filter((x) => x !== etapa) : [...s, etapa]));
  const [pendente, iniciar] = useTransition();
  const [dataInicio, setDataInicio] = useState(hoje);
  const [erro, setErro] = useState("");

  if (!inicio) {
    return (
      <section className="cartao">
        <h2 className="mb-1 text-xl">Cadência de follow-up</h2>
        <p className="mb-3 text-sm text-suave">
          6 follow-ups nos dias {DIAS_FOLLOWUP.join(", ")}. A cadência começa sozinha quando a paciente entra na coluna Follow-up, ou você pode iniciar agora.
        </p>
        {podeEditar && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="fu-inicio" className="rotulo">Começar a contar de</label>
              <input id="fu-inicio" type="date" className="campo" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <button
              type="button"
              className="botao"
              disabled={pendente}
              onClick={() => iniciar(async () => { const r = await iniciarCadencia(leadId, dataInicio); if (r?.erro) setErro(r.erro); })}
            >
              Iniciar cadência
            </button>
          </div>
        )}
        {erro && <p className="mt-2 text-sm text-erro">{erro}</p>}
      </section>
    );
  }

  const c = cadencia(inicio, lista, hoje);
  return (
    <section className="cartao">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">Cadência de follow-up</h2>
        <span className="text-xs text-suave">contando desde {fData(inicio)}</span>
      </div>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex-1"><BarraProgresso fracao={c.feitos / 6} /></div>
        <span className="text-xs text-suave">{c.feitos} de 6 feitos</span>
      </div>
      <ul className="flex flex-col gap-1">
        {c.etapas.map((e) => (
          <li key={e.etapa} className={`flex items-center gap-3 rounded-lg px-2 py-2 ${e.situacao === "hoje" ? "bg-alerta/10" : e.situacao === "atrasado" ? "bg-erro/5" : ""}`}>
            <button
              type="button"
              disabled={!podeEditar}
              aria-pressed={e.feito}
              aria-label={`${e.feito ? "Desmarcar" : "Marcar"} follow ${e.etapa}`}
              onClick={() => iniciar(async () => { alternar(e.etapa); const r = await marcarFollowup(leadId, e.etapa, !e.feito); if (r?.erro) setErro(r.erro); })}
              className={`grid size-5 shrink-0 place-items-center rounded-md border transition disabled:cursor-default ${e.feito ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie"}`}
            >
              {e.feito && <Check className="size-3.5" />}
            </button>
            <span className={`flex-1 text-sm ${e.feito ? "text-suave line-through" : "font-medium"}`}>
              Follow {e.etapa} <span className="font-normal text-suave">· dia {e.dia}</span>
            </span>
            <span className={`text-xs tabular-nums ${COR[e.situacao]}`}>
              {e.situacao === "hoje" ? "hoje" : fData(e.data)}
              {e.situacao === "atrasado" && " · atrasado"}
            </span>
          </li>
        ))}
      </ul>
      {c.completo && <p className="mt-3 text-sm text-sucesso">Cadência completa. ✨</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {linkWhats && c.proximo && (
          <a href={linkWhats} target="_blank" rel="noopener noreferrer" className="botao-secundario px-3 py-1.5 text-xs">
            <MessageCircle className="size-3.5" /> Abrir WhatsApp
          </a>
        )}
        {podeEditar && (
          <>
            <button
              type="button"
              className="botao-secundario px-3 py-1.5 text-xs"
              disabled={pendente}
              onClick={() => confirm("Recomeçar a cadência a partir de hoje? Os follow-ups marcados serão desmarcados.") && iniciar(async () => void (await iniciarCadencia(leadId, hoje, true)))}
            >
              Recomeçar hoje
            </button>
            <button
              type="button"
              className="px-2 py-1.5 text-xs text-suave underline underline-offset-4"
              disabled={pendente}
              onClick={() => confirm("Parar a cadência desta paciente?") && iniciar(async () => void (await pararCadencia(leadId)))}
            >
              Parar cadência
            </button>
          </>
        )}
      </div>
      {erro && <p className="mt-2 text-sm text-erro">{erro}</p>}
    </section>
  );
}
