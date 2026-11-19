// Formatos brasileiros: R$, dd/mm/aaaa, porcentagem e números com vírgula.

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlSemCentavos = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const numero = new Intl.NumberFormat("pt-BR");

export function reais(valor: number | null | undefined, semCentavos = false): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return (semCentavos ? brlSemCentavos : brl).format(valor);
}

export function inteiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return numero.format(valor);
}

export function porcentagem(fracao: number | null | undefined, casas = 1): string {
  if (fracao === null || fracao === undefined || !Number.isFinite(fracao)) return "—";
  return (
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: casas }).format(
      fracao * 100,
    ) + "%"
  );
}

/** "2026-03-12" ou Date -> "12/03/2026" (sem erro de fuso para datas puras). */
export function data(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-");
    return `${d}/${m}/${a}`;
  }
  const dt = typeof valor === "string" ? new Date(valor) : valor;
  return dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** Data curta "12/03" para "Inserido por Bruna em 12/03". */
export function dataCurta(valor: string | Date | null | undefined): string {
  if (!valor) return "";
  const dt = typeof valor === "string" ? new Date(valor) : valor;
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
}

/**
 * Lê números digitados no jeito brasileiro: "1.234,56", "1234,5", "R$ 2.000".
 * Campo vazio vira null.
 */
export function lerNumero(texto: string | null | undefined): number | null {
  if (texto === null || texto === undefined) return null;
  let t = String(texto).replace(/[R$\s%]/g, "").trim();
  if (t === "") return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // "1.234" = mil duzentos e trinta e quatro
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Número para mostrar dentro de um campo editável: 1234.5 -> "1.234,50".
 * Valores redondos aparecem sem centavos (24800 -> "24.800") para caber nos campos.
 */
export function paraCampo(valor: number | null | undefined, decimais = 0): string {
  if (valor === null || valor === undefined) return "";
  const redondo = Number.isInteger(valor);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: redondo ? 0 : decimais,
    maximumFractionDigits: decimais,
  }).format(valor);
}

/** Primeiro nome, para "Inserido por Bruna". */
export function primeiroNome(nome: string | null | undefined): string {
  if (!nome) return "alguém";
  return nome.trim().split(/\s+/)[0] || "alguém";
}

/** "2026-03-01" a partir de ano e mês (1-12). */
export function isoMes(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

/** Lista de meses (dia 1) entre duas datas ISO, inclusive. */
export function mesesEntre(inicio: string, fim: string): string[] {
  const [ai, mi] = inicio.split("-").map(Number);
  const [af, mf] = fim.split("-").map(Number);
  const lista: string[] = [];
  let a = ai;
  let m = mi;
  while (a < af || (a === af && m <= mf)) {
    lista.push(isoMes(a, m));
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
    if (lista.length > 120) break; // proteção: no máximo 10 anos
  }
  return lista;
}

/** Hoje no fuso de Brasília: { ano, mes (1-12), iso } */
export function hojeBrasil() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [ano, mes] = partes.split("-").map(Number);
  return { ano, mes, iso: partes };
}
