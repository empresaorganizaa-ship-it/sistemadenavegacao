// Cadência de follow-up: 6 contatos nos dias 2, 5, 7, 10, 15 e 30 contados
// a partir do início do follow-up.
import { diasEntre, somarDias } from "./periodos.ts";

export const DIAS_FOLLOWUP = [2, 5, 7, 10, 15, 30] as const;

export type EtapaFollowup = {
  etapa: number; // 1 a 6
  dia: number;
  data: string; // data prevista (aaaa-mm-dd)
  feito: boolean;
  situacao: "feito" | "atrasado" | "hoje" | "futuro";
};

export function cadencia(inicio: string, feitos: Iterable<number>, hoje: string) {
  const ok = new Set(feitos);
  const etapas: EtapaFollowup[] = DIAS_FOLLOWUP.map((dia, i) => {
    const data = somarDias(inicio, dia);
    const feito = ok.has(i + 1);
    const situacao = feito ? "feito" : data < hoje ? "atrasado" : data === hoje ? "hoje" : "futuro";
    return { etapa: i + 1, dia, data, feito, situacao };
  });
  const proximo = etapas.find((e) => !e.feito) ?? null;
  return {
    etapas,
    feitos: etapas.filter((e) => e.feito).length,
    proximo,
    completo: !proximo,
    /** dias até o próximo (negativo = atrasado) */
    faltam: proximo ? diasEntre(hoje, proximo.data) : null,
  };
}
