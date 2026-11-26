// Filtros do CRM: data de entrada, próximo contato e procedimento.
import { somarDias } from "./periodos.ts";

export type FiltrosCrm = {
  q?: string;
  origem?: string;
  proc?: string; // "s:<id do serviço>" ou "t:<texto digitado>"
  ent_de?: string;
  ent_ate?: string;
  cont?: string; // "atrasados" | "hoje" | "7dias"
  cont_de?: string;
  cont_ate?: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const dataValida = (s?: string) => (s && ISO.test(s) ? s : undefined);

/** Próximo contato = o mais cedo entre a "próxima ação" e o próximo follow-up pendente. */
export function proximoContato(proximaAcao: string | null, proximoFollowup: string | null): string | null {
  if (proximaAcao && proximoFollowup) return proximaAcao < proximoFollowup ? proximaAcao : proximoFollowup;
  return proximaAcao ?? proximoFollowup ?? null;
}

/** Converte os atalhos (atrasados, hoje, 7 dias) em período de/até. */
export function periodoContato(f: FiltrosCrm, hoje: string): { de?: string; ate?: string } | null {
  if (f.cont === "atrasados") return { ate: somarDias(hoje, -1) };
  if (f.cont === "hoje") return { de: hoje, ate: hoje };
  if (f.cont === "7dias") return { de: hoje, ate: somarDias(hoje, 6) };
  const de = dataValida(f.cont_de);
  const ate = dataValida(f.cont_ate);
  return de || ate ? { de, ate } : null;
}

export function dentroDoPeriodo(data: string | null, p: { de?: string; ate?: string }): boolean {
  if (!data) return false;
  return (!p.de || data >= p.de) && (!p.ate || data <= p.ate);
}

export const normalizarTexto = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** O lead tem o procedimento escolhido? (serviço do catálogo ou texto digitado/importado) */
export function temProcedimento(
  lead: { servico_id: string | null; procedimento_texto: string | null },
  proc: string,
  nomeServico: Record<string, string>,
): boolean {
  const texto = normalizarTexto(lead.procedimento_texto);
  const nomeDoLead = lead.servico_id ? normalizarTexto(nomeServico[lead.servico_id]) : "";
  if (proc.startsWith("s:")) {
    const id = proc.slice(2);
    return lead.servico_id === id || (!!texto && texto === normalizarTexto(nomeServico[id]));
  }
  if (proc.startsWith("t:")) {
    const alvo = normalizarTexto(proc.slice(2));
    return !!alvo && (texto === alvo || nomeDoLead === alvo);
  }
  return true;
}
