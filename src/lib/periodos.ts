// Datas usadas pela rotina: o dia, a semana (começa na segunda) e o mês.

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function utc(isoData: string) {
  const [a, m, d] = isoData.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

export function segundaDaSemana(hojeIso: string): string {
  const d = utc(hojeIso);
  const dia = (d.getUTCDay() + 6) % 7; // segunda = 0
  d.setUTCDate(d.getUTCDate() - dia);
  return iso(d);
}

export function inicioDoMes(hojeIso: string): string {
  return hojeIso.slice(0, 8) + "01";
}

export function somarDias(isoData: string, n: number): string {
  const d = utc(isoData);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((utc(b).getTime() - utc(a).getTime()) / 86400000);
}

export function periodoDa(frequencia: string, hojeIso: string): string {
  if (frequencia === "semanal") return segundaDaSemana(hojeIso);
  if (frequencia === "mensal") return inicioDoMes(hojeIso);
  return hojeIso;
}
