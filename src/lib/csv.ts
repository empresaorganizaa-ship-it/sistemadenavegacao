// Planilha CSV no formato que o Excel brasileiro abre direto:
// separador ";", vírgula decimal e acentos preservados (BOM UTF-8).

type Celula = string | number | boolean | null | undefined;

function celula(v: Celula): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "number" ? String(v).replace(".", ",") : typeof v === "boolean" ? (v ? "Sim" : "Não") : String(v);
  // evita que o Excel interprete o texto como fórmula
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function gerarCsv(cabecalho: string[], linhas: Celula[][]): string {
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
}

/** "2026-03-12" -> "12/03/2026" */
export function dataBr(d: string | null | undefined): string {
  if (!d) return "";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}
