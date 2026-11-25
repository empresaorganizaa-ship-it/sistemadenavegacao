// Regras da importação de planilhas para o CRM (usadas no navegador, para a
// prévia, e no servidor, que repete tudo antes de gravar).

/** Origem marcada em todos os leads importados. */
export const ORIGEM_IMPORTACAO = "Importação – reativação";

export const CAMPOS_IMPORTACAO = [
  { chave: "nome", rotulo: "Nome", obrigatorio: true, palpites: ["nome", "paciente", "cliente", "nome completo"] },
  { chave: "whatsapp", rotulo: "WhatsApp", palpites: ["whatsapp", "whats", "zap", "celular", "cel", "telefone", "fone", "tel", "contato"] },
  { chave: "whatsapp_alt", rotulo: "Telefone alternativo (usado se o WhatsApp estiver vazio)", palpites: ["telefone", "fone", "tel", "telefone fixo", "contato"] },
  { chave: "instagram", rotulo: "Instagram", palpites: ["instagram", "insta", "@", "perfil"] },
  { chave: "procedimento", rotulo: "Procedimento de interesse", palpites: ["procedimento", "interesse", "tratamento", "servico", "serviço"] },
  { chave: "data_procedimento", rotulo: "Data do último procedimento", palpites: ["ultimo procedimento", "último procedimento", "data do procedimento", "data procedimento", "ultima visita", "última visita", "data"] },
  { chave: "aniversario", rotulo: "Aniversário", palpites: ["aniversario", "aniversário", "nascimento", "data de nascimento", "nasc"] },
  { chave: "observacoes", rotulo: "Observações", palpites: ["observacoes", "observações", "observacao", "obs", "notas", "anotacoes", "anotações", "comentario"] },
] as const;

export type ChaveCampo = (typeof CAMPOS_IMPORTACAO)[number]["chave"];
export type Mapeamento = Partial<Record<ChaveCampo, number>>; // campo -> índice da coluna da planilha
export type Celula = string | number | boolean | Date | null | undefined;

export type LinhaImportada = {
  nome: string;
  whatsapp: string | null;
  instagram: string | null;
  procedimento: string | null;
  data_procedimento: string | null;
  aniversario: string | null;
  observacoes: string | null;
};

export type Situacao = "importar" | "duplicada_crm" | "duplicada_planilha" | "sem_nome";

/** Nome sem acentos, maiúsculas ou espaços extras (para comparar quem não tem WhatsApp). */
export function chaveNome(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type LinhaAvaliada = LinhaImportada & {
  linha: number; // número da linha na planilha (para mostrar)
  situacao: Situacao;
  avisos: string[];
};

const sem = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9@ ]+/g, " ").replace(/\s+/g, " ").trim();

/** Sugere qual coluna da planilha corresponde a cada campo, pelo título. */
export function sugerirMapeamento(cabecalho: string[]): Mapeamento {
  const usados = new Set<number>();
  const m: Mapeamento = {};
  // primeiro os palpites exatos, depois os parciais
  for (const exato of [true, false]) {
    for (const campo of CAMPOS_IMPORTACAO) {
      if (m[campo.chave] !== undefined) continue;
      let idx = -1;
      for (const p of campo.palpites) {
        idx = cabecalho.findIndex((h, i) => {
          if (usados.has(i)) return false;
          const t = sem(String(h ?? ""));
          return exato ? t === sem(p) : t.includes(sem(p));
        });
        if (idx >= 0) break;
      }
      if (idx >= 0) {
        m[campo.chave] = idx;
        usados.add(idx);
      }
    }
  }
  return m;
}

/**
 * Padroniza telefone para 55 + DDD + número (12 ou 13 dígitos).
 * Devolve null se não der para identificar um celular/telefone brasileiro com DDD.
 */
export function normalizarTelefone(valor: Celula): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  let n = typeof valor === "number" ? Math.round(valor).toString() : String(valor);
  n = n.replace(/\D/g, "");
  n = n.replace(/^0+/, ""); // 011..., 0xx...
  if ((n.length === 12 || n.length === 13) && n.startsWith("55")) return n;
  if (n.length === 10 || n.length === 11) return "55" + n;
  return null;
}

function iso(a: number, m: number, d: number): string | null {
  if (!(a >= 1900 && a <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null; // ex.: 31/02
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Ano usado quando a planilha tem só dia e mês (ex.: aniversário "15/03"). */
export const ANO_SEM_ANO = 2000;

/**
 * Lê datas: Date do Excel, número de série do Excel, "dd/mm/aaaa", "dd/mm/aa",
 * "dd-mm-aaaa", "aaaa-mm-dd" e, se permitido, "dd/mm" (sem ano).
 */
export function lerData(valor: Celula, permitirSemAno = false): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return iso(valor.getUTCFullYear(), valor.getUTCMonth() + 1, valor.getUTCDate());
  }
  if (typeof valor === "number") {
    // número de série do Excel (dias desde 30/12/1899)
    if (valor > 1 && valor < 80000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000);
      return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
    return null;
  }
  const s = String(valor).trim();
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (r) return iso(+r[1], +r[2], +r[3]);
  r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (r) {
    let a = +r[3];
    if (r[3].length === 2) a += a > 30 ? 1900 : 2000;
    return iso(a, +r[2], +r[1]);
  }
  if (permitirSemAno) {
    r = /^(\d{1,2})[/.-](\d{1,2})$/.exec(s);
    if (r) return iso(ANO_SEM_ANO, +r[2], +r[1]);
  }
  return null;
}

function texto(v: Celula, max = 500): string | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return lerData(v) ?? null;
  const t = String(v).replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

function instagram(v: Celula): string | null {
  const t = texto(v, 100);
  if (!t) return null;
  const m = /instagram\.com\/([A-Za-z0-9._]+)/i.exec(t);
  const u = (m ? m[1] : t).replace(/^@+/, "").replace(/\s+/g, "");
  return u ? `@${u}` : null;
}

/** Transforma uma linha da planilha nos campos do CRM, anotando avisos. */
export function converterLinha(linha: Celula[], mapa: Mapeamento): { dados: LinhaImportada; avisos: string[] } {
  const pega = (c: ChaveCampo) => (mapa[c] === undefined ? undefined : linha[mapa[c]!]);
  const avisos: string[] = [];

  const vazio = (v: Celula) => v === undefined || v === null || !String(v).trim();
  let brutoTel = pega("whatsapp");
  if (vazio(brutoTel)) brutoTel = pega("whatsapp_alt");
  let whatsapp = normalizarTelefone(brutoTel);
  if (!whatsapp && !vazio(pega("whatsapp_alt")) && brutoTel !== pega("whatsapp_alt")) {
    // WhatsApp inválido: tenta o alternativo
    const alt = normalizarTelefone(pega("whatsapp_alt"));
    if (alt) {
      avisos.push(`WhatsApp "${String(brutoTel).trim()}" não reconhecido; usado o telefone alternativo`);
      whatsapp = alt;
      brutoTel = pega("whatsapp_alt");
    }
  }
  if (!vazio(brutoTel) && !whatsapp) avisos.push(`telefone "${String(brutoTel).trim()}" não reconhecido (sem DDD?)`);

  const brutoProc = pega("data_procedimento");
  const data_procedimento = lerData(brutoProc);
  if (brutoProc !== undefined && brutoProc !== null && String(brutoProc).trim() && !data_procedimento)
    avisos.push(`data do procedimento "${String(brutoProc).trim()}" não reconhecida`);

  const brutoAniv = pega("aniversario");
  const aniversario = lerData(brutoAniv, true);
  if (brutoAniv !== undefined && brutoAniv !== null && String(brutoAniv).trim() && !aniversario)
    avisos.push(`aniversário "${String(brutoAniv).trim()}" não reconhecido`);

  return {
    dados: {
      nome: texto(pega("nome"), 200) ?? "",
      whatsapp,
      instagram: instagram(pega("instagram")),
      procedimento: texto(pega("procedimento"), 200),
      data_procedimento,
      aniversario,
      observacoes: texto(pega("observacoes"), 5000),
    },
    avisos,
  };
}

/**
 * Classifica cada linha: importar, já existe no CRM (mesmo WhatsApp),
 * repetida na própria planilha ou sem nome.
 * Quem não tem WhatsApp é comparada pelo nome.
 */
export function avaliar(
  linhas: (LinhaImportada & { linha: number; avisos?: string[] })[],
  whatsappsExistentes: Iterable<string>,
  nomesExistentes: Iterable<string> = [],
): LinhaAvaliada[] {
  const existentes = new Set(Array.from(whatsappsExistentes, (w) => normalizarTelefone(w)).filter(Boolean) as string[]);
  const nomes = new Set(Array.from(nomesExistentes, chaveNome).filter(Boolean));
  const vistos = new Map<string, { chave: string; nome: string }[]>(); // whatsapp -> quem já entrou com ele
  const nomesVistos = new Set<string>();
  return linhas.map((l) => {
    const avisos = [...(l.avisos ?? [])];
    const nome = chaveNome(l.nome);
    let situacao: Situacao = "importar";
    if (!nome) situacao = "sem_nome";
    else if (l.whatsapp && existentes.has(l.whatsapp)) situacao = "duplicada_crm";
    else if (l.whatsapp && vistos.get(l.whatsapp)?.some((v) => v.chave === nome)) situacao = "duplicada_planilha";
    else if (l.whatsapp && vistos.has(l.whatsapp)) {
      // mesmo celular, outra pessoa (ex.: mãe e filha): importa, mas avisa
      avisos.push(`mesmo WhatsApp de ${vistos.get(l.whatsapp)![0].nome}`);
    }
    else if (!l.whatsapp && nomes.has(nome)) {
      situacao = "duplicada_crm";
      avisos.push("sem WhatsApp: já existe alguém com este nome no CRM");
    } else if (!l.whatsapp && nomesVistos.has(nome)) {
      situacao = "duplicada_planilha";
      avisos.push("sem WhatsApp: nome repetido na planilha");
    }
    if (situacao === "importar") {
      if (l.whatsapp) vistos.set(l.whatsapp, [...(vistos.get(l.whatsapp) ?? []), { chave: nome, nome: l.nome }]);
      nomesVistos.add(nome);
    }
    return { ...l, situacao, avisos };
  });
}

/** Decodifica CSV: tenta UTF-8 e, se não der, Windows-1252 (Excel brasileiro). */
export function decodificarTexto(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
