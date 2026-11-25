"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Gaveta } from "@/components/gaveta";
import { Aviso } from "@/components/ui";
import {
  ANO_SEM_ANO,
  CAMPOS_IMPORTACAO,
  ORIGEM_IMPORTACAO,
  converterLinha,
  decodificarTexto,
  sugerirMapeamento,
  type Celula,
  type ChaveCampo,
  type LinhaAvaliada,
  type Mapeamento,
} from "@/lib/importacao";
import { data as fData, hojeBrasil } from "@/lib/formatos";
import { avaliarImportacao, importarLeads } from "./importar-acoes";

type Coluna = { id: string; nome: string };
type Etapa = "arquivo" | "colunas" | "previa" | "fim";

const SITUACAO: Record<LinhaAvaliada["situacao"], { rotulo: string; cor: string }> = {
  importar: { rotulo: "Será importada", cor: "bg-sucesso/10 text-sucesso" },
  duplicada_crm: { rotulo: "Já está no CRM", cor: "bg-superficie-2 text-suave" },
  duplicada_planilha: { rotulo: "Repetida na planilha", cor: "bg-superficie-2 text-suave" },
  sem_nome: { rotulo: "Sem nome", cor: "bg-erro/10 text-erro" },
};

function textoCelula(v: Celula): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : fData(v.toISOString().slice(0, 10));
  return String(v);
}

async function lerArquivo(arquivo: File): Promise<Celula[][]> {
  const nome = arquivo.name.toLowerCase();
  if (nome.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(arquivo)) as Celula[][];
  }
  if (nome.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    const texto = decodificarTexto(await arquivo.arrayBuffer());
    const r = Papa.parse<string[]>(texto, { skipEmptyLines: "greedy", delimitersToGuess: [";", ",", "\t", "|"] });
    return r.data;
  }
  throw new Error("formato");
}

function dataBonita(iso: string | null, semAno = false) {
  if (!iso) return "";
  if (semAno && iso.startsWith(`${ANO_SEM_ANO}-`)) return fData(iso).slice(0, 5);
  return fData(iso);
}

export function ImportarPlanilha({ colunas, espaco }: { colunas: Coluna[]; espaco: string }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("arquivo");
  const [arquivo, setArquivo] = useState("");
  const [cabecalho, setCabecalho] = useState<string[]>([]);
  const [dados, setDados] = useState<Celula[][]>([]);
  const [mapa, setMapa] = useState<Mapeamento>({});
  const padrao = colunas.find((c) => /reativa/i.test(c.nome))?.id ?? colunas[0]?.id ?? "";
  const [colunaId, setColunaId] = useState(padrao);
  const [previa, setPrevia] = useState<LinhaAvaliada[]>([]);
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof importarLeads>>>();
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const hoje = hojeBrasil().iso;

  const recomecar = useCallback(() => {
    setEtapa("arquivo");
    setArquivo("");
    setCabecalho([]);
    setDados([]);
    setMapa({});
    setPrevia([]);
    setResultado(undefined);
    setErro("");
    setColunaId(padrao);
  }, [padrao]);

  const fechar = useCallback(() => {
    setAberta(false);
    if (etapa === "fim") router.refresh();
    recomecar();
  }, [etapa, recomecar, router]);

  async function escolher(f: File) {
    setErro("");
    if (f.size > 10 * 1024 * 1024) return setErro("O arquivo pode ter no máximo 10 MB.");
    try {
      const linhas = (await lerArquivo(f)).filter((l) => l.some((c) => textoCelula(c).trim()));
      if (linhas.length < 2) return setErro("A planilha precisa ter uma linha de títulos e pelo menos uma linha com dados.");
      const cab = linhas[0].map((c, i) => textoCelula(c).trim() || `Coluna ${i + 1}`);
      setArquivo(f.name);
      setCabecalho(cab);
      setDados(linhas.slice(1));
      setMapa(sugerirMapeamento(cab));
      setEtapa("colunas");
    } catch (e) {
      setErro(
        e instanceof Error && e.message === "formato"
          ? "Use um arquivo .xlsx (Excel) ou .csv. Se for .xls (Excel antigo), abra no Excel e salve como .xlsx."
          : "Não foi possível ler o arquivo. Confira se é uma planilha .xlsx ou .csv válida.",
      );
    }
  }

  const exemplo = (i: number | undefined) =>
    i === undefined ? "" : dados.slice(0, 3).map((l) => textoCelula(l[i])).filter(Boolean).join(" · ");

  function verPrevia() {
    setErro("");
    if (mapa.nome === undefined) return setErro("Escolha qual coluna da planilha tem o nome.");
    if (!colunaId) return setErro("Escolha a coluna do CRM onde os leads vão entrar.");
    const linhas = dados.map((l, i) => {
      const { dados: d, avisos } = converterLinha(l, mapa);
      return { ...d, linha: i + 2, avisos };
    });
    iniciar(async () => {
      const r = await avaliarImportacao(linhas);
      if (r.erro) return setErro(r.erro);
      setPrevia(r.linhas ?? []);
      setEtapa("previa");
    });
  }

  function confirmar() {
    setErro("");
    iniciar(async () => {
      const r = await importarLeads(colunaId, previa.filter((l) => l.situacao === "importar"));
      if (r.erro) return setErro(r.erro);
      setResultado({
        ...r,
        // contagens da prévia completa (o servidor só recebeu as que seriam importadas)
        duplicadasCrm: (r.duplicadasCrm ?? 0) + previa.filter((l) => l.situacao === "duplicada_crm").length,
        duplicadasPlanilha: (r.duplicadasPlanilha ?? 0) + previa.filter((l) => l.situacao === "duplicada_planilha").length,
        semNome: (r.semNome ?? 0) + previa.filter((l) => l.situacao === "sem_nome").length,
      });
      setEtapa("fim");
    });
  }

  const contagem = useMemo(() => {
    const c = { importar: 0, duplicada_crm: 0, duplicada_planilha: 0, sem_nome: 0, avisos: 0, semWhats: 0 };
    for (const l of previa) {
      c[l.situacao]++;
      if (l.situacao === "importar" && l.avisos.length) c.avisos++;
      if (l.situacao === "importar" && !l.whatsapp) c.semWhats++;
    }
    return c;
  }, [previa]);

  const nomeColuna = colunas.find((c) => c.id === colunaId)?.nome ?? "";
  const ignoradas = contagem.duplicada_crm + contagem.duplicada_planilha + contagem.sem_nome;

  return (
    <>
      <button type="button" className="botao-secundario" onClick={() => setAberta(true)}>
        <Upload className="size-4" /> Importar planilha
      </button>
      <Gaveta aberta={aberta} aoFechar={fechar} titulo="Importar planilha" largura="max-w-4xl">
        <div className="flex flex-col gap-5">
          <ol className="flex gap-2 text-xs text-suave" aria-label="Passos">
            {["Arquivo", "Ligar colunas", "Prévia", "Pronto"].map((p, i) => {
              const atual = ["arquivo", "colunas", "previa", "fim"].indexOf(etapa);
              return (
                <li key={p} className={`flex-1 rounded-full px-2 py-1 text-center ${i === atual ? "bg-destaque text-sobre-destaque" : i < atual ? "bg-destaque-suave text-destaque-escuro" : "bg-superficie-2"}`}>
                  {i + 1}. {p}
                </li>
              );
            })}
          </ol>
          <p className="rounded-lg bg-superficie-2 px-3 py-2 text-sm">
            Os leads vão entrar no CRM do espaço <strong>{espaco}</strong>.
          </p>

          {etapa === "arquivo" && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-borda p-8 text-center">
              <FileSpreadsheet className="size-10 text-suave" />
              <p className="text-sm">Escolha uma planilha <strong>.xlsx</strong> (Excel) ou <strong>.csv</strong>.</p>
              <p className="text-xs text-suave">A primeira linha deve ter os títulos das colunas (Nome, Telefone, etc.). Até 3.000 linhas.</p>
              <input
                ref={input}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) iniciar(() => escolher(f));
                  e.target.value = "";
                }}
              />
              <button type="button" className="botao" disabled={pendente} onClick={() => input.current?.click()}>
                {pendente ? "Lendo…" : "Escolher arquivo"}
              </button>
            </div>
          )}

          {etapa === "colunas" && (
            <>
              <p className="text-sm text-suave">
                <strong className="text-texto">{arquivo}</strong>: {dados.length} linha(s). Ligue cada campo do CRM à coluna da planilha que tem essa informação. Os que não existirem na planilha podem ficar em &quot;Não importar&quot;.
              </p>
              <div className="flex flex-col divide-y divide-borda rounded-xl border border-borda">
                {CAMPOS_IMPORTACAO.map((c) => (
                  <div key={c.chave} className="grid gap-2 p-3 sm:grid-cols-[200px_1fr] sm:items-center">
                    <label htmlFor={`map-${c.chave}`} className="text-sm font-medium">
                      {c.rotulo}
                      {"obrigatorio" in c && c.obrigatorio && <span className="text-destaque"> *</span>}
                    </label>
                    <div>
                      <select
                        id={`map-${c.chave}`}
                        className="campo"
                        value={mapa[c.chave] ?? ""}
                        onChange={(e) =>
                          setMapa((m) => ({ ...m, [c.chave as ChaveCampo]: e.target.value === "" ? undefined : Number(e.target.value) }))
                        }
                      >
                        <option value="">Não importar</option>
                        {cabecalho.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                      {mapa[c.chave] !== undefined && exemplo(mapa[c.chave]) && (
                        <p className="mt-1 truncate text-[11px] text-suave">Ex.: {exemplo(mapa[c.chave])}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="imp-coluna" className="rotulo">Coluna do CRM onde os leads vão entrar</label>
                <select id="imp-coluna" className="campo max-w-sm" value={colunaId} onChange={(e) => setColunaId(e.target.value)}>
                  {colunas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <p className="text-xs text-suave">
                Todos vão entrar com a origem <strong>&quot;{ORIGEM_IMPORTACAO}&quot;</strong> e data de entrada {fData(hoje)}. Telefones são
                padronizados para 55 + DDD + número, e quem já está no CRM com o mesmo WhatsApp é ignorada.
              </p>
              {erro && <Aviso tipo="erro">{erro}</Aviso>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="botao" disabled={pendente} onClick={verPrevia}>{pendente ? "Conferindo…" : "Ver prévia"}</button>
                <button type="button" className="botao-secundario" onClick={recomecar}>Trocar arquivo</button>
              </div>
            </>
          )}

          {etapa === "previa" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-sucesso/10 p-3"><p className="text-xs text-sucesso">Serão importados</p><p className="font-titulo text-3xl text-sucesso">{contagem.importar}</p></div>
                <div className="rounded-xl bg-superficie-2 p-3"><p className="text-xs text-suave">Já estão no CRM</p><p className="font-titulo text-3xl">{contagem.duplicada_crm}</p></div>
                <div className="rounded-xl bg-superficie-2 p-3"><p className="text-xs text-suave">Repetidos na planilha</p><p className="font-titulo text-3xl">{contagem.duplicada_planilha}</p></div>
                <div className="rounded-xl bg-superficie-2 p-3"><p className="text-xs text-suave">Sem nome</p><p className="font-titulo text-3xl">{contagem.sem_nome}</p></div>
              </div>
              <p className="text-sm">
                Destino: coluna <strong>{nomeColuna}</strong> · origem <strong>{ORIGEM_IMPORTACAO}</strong> · entrada em {fData(hoje)}.
                {ignoradas > 0 && <> <strong>{ignoradas}</strong> linha(s) serão ignoradas.</>}
              </p>
              {(contagem.semWhats > 0 || contagem.avisos > 0) && (
                <Aviso tipo="alerta">
                  {contagem.semWhats > 0 && <>{contagem.semWhats} lead(s) vão entrar sem WhatsApp (telefone vazio ou sem DDD); para esses, a checagem de repetidas foi feita pelo nome. </>}
                  {contagem.avisos > 0 && <>{contagem.avisos} linha(s) têm algum dado não reconhecido: veja a coluna &quot;Avisos&quot;. Esses campos ficam em branco.</>}
                </Aviso>
              )}
              <div className="max-h-[50vh] overflow-auto rounded-xl border border-borda">
                <table className="w-full min-w-[760px] text-xs">
                  <thead className="sticky top-0 bg-superficie-2 text-left text-suave">
                    <tr>
                      {["Linha", "Situação", "Nome", "WhatsApp", "Instagram", "Procedimento", "Últ. procedimento", "Aniversário", "Avisos"].map((h) => (
                        <th key={h} className="px-2 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previa.slice(0, 300).map((l) => (
                      <tr key={l.linha} className={`border-t border-borda ${l.situacao !== "importar" ? "text-suave" : ""}`}>
                        <td className="px-2 py-1.5 tabular-nums">{l.linha}</td>
                        <td className="px-2 py-1.5"><span className={`rounded-full px-2 py-0.5 whitespace-nowrap ${SITUACAO[l.situacao].cor}`}>{SITUACAO[l.situacao].rotulo}</span></td>
                        <td className="px-2 py-1.5">{l.nome || "—"}</td>
                        <td className="px-2 py-1.5 tabular-nums">{l.whatsapp ?? "—"}</td>
                        <td className="px-2 py-1.5">{l.instagram ?? ""}</td>
                        <td className="px-2 py-1.5">{l.procedimento ?? ""}</td>
                        <td className="px-2 py-1.5 tabular-nums">{dataBonita(l.data_procedimento)}</td>
                        <td className="px-2 py-1.5 tabular-nums">{dataBonita(l.aniversario, true)}</td>
                        <td className="px-2 py-1.5 text-alerta">{l.avisos.join("; ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previa.length > 300 && <p className="text-xs text-suave">Mostrando as primeiras 300 de {previa.length} linhas. Todas serão processadas.</p>}
              {erro && <Aviso tipo="erro">{erro}</Aviso>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="botao" disabled={pendente || !contagem.importar} onClick={confirmar}>
                  {pendente ? "Importando…" : `Importar ${contagem.importar} lead(s) para "${nomeColuna}"`}
                </button>
                <button type="button" className="botao-secundario" disabled={pendente} onClick={() => setEtapa("colunas")}>Voltar e ajustar</button>
              </div>
            </>
          )}

          {etapa === "fim" && resultado && (
            <div className="flex flex-col gap-4">
              <Aviso tipo="sucesso">
                <strong>{resultado.importados} lead(s) importados</strong> para a coluna &quot;{resultado.coluna}&quot;, com origem &quot;{ORIGEM_IMPORTACAO}&quot;.
              </Aviso>
              <ul className="text-sm">
                <li>Ignorados por já estarem no CRM (mesmo WhatsApp): <strong>{resultado.duplicadasCrm}</strong></li>
                <li>Ignorados por estarem repetidos na planilha: <strong>{resultado.duplicadasPlanilha}</strong></li>
                <li>Ignorados por não terem nome: <strong>{resultado.semNome}</strong></li>
              </ul>
              <button type="button" className="botao self-start" onClick={fechar}>Ver no CRM</button>
            </div>
          )}
          {etapa === "arquivo" && erro && <Aviso tipo="erro">{erro}</Aviso>}
        </div>
      </Gaveta>
    </>
  );
}
