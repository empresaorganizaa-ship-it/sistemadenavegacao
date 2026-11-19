"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { ENTIDADES, type Campo, type Opcao } from "@/lib/entidades";
import { paraCampo } from "@/lib/formatos";
import { salvarEntidade, excluirEntidade } from "@/app/(app)/acoes-entidades";
import { Aviso } from "./ui";
import { Gaveta } from "./gaveta";
import { Markdown } from "./markdown";

type Etapa = { titulo: string; descricao: string; responsavel: string; acao: string };
export type OpcoesRelacao = Record<string, Opcao[]>;

function valorInicial(c: Campo, v: unknown): unknown {
  if (c.tipo === "lista") return Array.isArray(v) ? v.join("\n") : "";
  if (c.tipo === "etapas") return Array.isArray(v) ? v : [];
  if (c.tipo === "booleano") return Boolean(v);
  if (c.tipo === "dinheiro") return v === null || v === undefined || v === "" ? "" : paraCampo(Number(v), 2);
  if (c.tipo === "mes") return v ? String(v).slice(0, 7) : "";
  if (v === null || v === undefined) return "";
  return String(v);
}

function EditorEtapas({ valor, onChange }: { valor: Etapa[]; onChange: (v: Etapa[]) => void }) {
  const mudar = (i: number, campo: keyof Etapa, t: string) =>
    onChange(valor.map((e, j) => (j === i ? { ...e, [campo]: t } : e)));
  const mover = (i: number, d: number) => {
    const n = [...valor];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    onChange(n);
  };
  return (
    <div className="flex flex-col gap-3">
      {valor.map((e, i) => (
        <div key={i} className="rounded-xl border border-borda bg-superficie-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-suave">Etapa {i + 1}</span>
            <div className="flex gap-1">
              <button type="button" disabled={i === 0} onClick={() => mover(i, -1)} className="p-1 text-suave disabled:opacity-30" aria-label="Subir">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" disabled={i === valor.length - 1} onClick={() => mover(i, 1)} className="p-1 text-suave disabled:opacity-30" aria-label="Descer">
                <ArrowDown className="size-4" />
              </button>
              <button type="button" onClick={() => onChange(valor.filter((_, j) => j !== i))} className="p-1 text-suave hover:text-erro" aria-label="Remover etapa">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="campo" placeholder="Nome da etapa" value={e.titulo} onChange={(x) => mudar(i, "titulo", x.target.value)} aria-label="Nome da etapa" />
            <input className="campo" placeholder="Responsável" value={e.responsavel} onChange={(x) => mudar(i, "responsavel", x.target.value)} aria-label="Responsável" />
            <textarea className="campo sm:col-span-2" rows={2} placeholder="Descrição" value={e.descricao} onChange={(x) => mudar(i, "descricao", x.target.value)} aria-label="Descrição" />
            <textarea className="campo sm:col-span-2" rows={2} placeholder="Mensagem ou ação" value={e.acao} onChange={(x) => mudar(i, "acao", x.target.value)} aria-label="Mensagem ou ação" />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="botao-secundario self-start"
        onClick={() => onChange([...valor, { titulo: "", descricao: "", responsavel: "", acao: "" }])}
      >
        <Plus className="size-4" /> Adicionar etapa
      </button>
    </div>
  );
}

function CampoMarkdown({ id, valor, onChange }: { id: string; valor: string; onChange: (v: string) => void }) {
  const [ver, setVer] = useState(false);
  return (
    <div>
      <div className="mb-1 flex gap-1 text-xs">
        <button type="button" onClick={() => setVer(false)} className={`rounded px-2 py-0.5 ${!ver ? "bg-superficie-2 font-medium" : "text-suave"}`}>
          Escrever
        </button>
        <button type="button" onClick={() => setVer(true)} className={`rounded px-2 py-0.5 ${ver ? "bg-superficie-2 font-medium" : "text-suave"}`}>
          Ver como fica
        </button>
      </div>
      {ver ? (
        <div className="min-h-32 rounded-lg border border-borda p-3">
          {valor.trim() ? <Markdown texto={valor} /> : <p className="text-sm text-suave">Nada escrito ainda.</p>}
        </div>
      ) : (
        <textarea id={id} className="campo min-h-40 font-mono text-[13px]" rows={8} value={valor} onChange={(e) => onChange(e.target.value)} />
      )}
      <p className="mt-1 text-[11px] text-suave">
        Formatação: **negrito**, *itálico*, ## Título, - item de lista, 1. lista numerada, &gt; destaque.
      </p>
    </div>
  );
}

export function FormularioEntidade({
  entidade,
  registro,
  opcoes = {},
  padroes = {},
  aoSalvar,
  ocultar = [],
}: {
  entidade: string;
  registro?: Record<string, unknown> | null;
  opcoes?: OpcoesRelacao;
  padroes?: Record<string, unknown>;
  aoSalvar?: (id: string) => void;
  ocultar?: string[];
}) {
  const ent = ENTIDADES[entidade];
  const campos = ent.campos.filter((c) => !ocultar.includes(c.chave));
  const [valores, setValores] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      campos.map((c) => [c.chave, valorInicial(c, registro ? registro[c.chave] : (padroes[c.chave] ?? c.padrao))]),
    ),
  );
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const mudar = (k: string, v: unknown) => setValores((s) => ({ ...s, [k]: v }));

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    iniciar(async () => {
      const dados = { ...valores };
      for (const [k, v] of Object.entries(padroes)) if (!(k in dados)) dados[k] = v;
      const r = await salvarEntidade(entidade, (registro?.id as string) ?? null, dados);
      if (r?.erro) setErro(r.erro);
      else if (r?.id) aoSalvar?.(r.id);
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      {campos.map((c) => {
        const id = `f-${c.chave}`;
        const v = valores[c.chave];
        const classe = c.meia ? "" : "sm:col-span-2";
        let entrada: React.ReactNode;
        switch (c.tipo) {
          case "markdown":
            entrada = <CampoMarkdown id={id} valor={String(v ?? "")} onChange={(t) => mudar(c.chave, t)} />;
            break;
          case "textoLongo":
            entrada = <textarea id={id} className="campo" rows={3} value={String(v ?? "")} onChange={(e) => mudar(c.chave, e.target.value)} placeholder={c.placeholder} />;
            break;
          case "lista":
            entrada = <textarea id={id} className="campo" rows={4} value={String(v ?? "")} onChange={(e) => mudar(c.chave, e.target.value)} placeholder={c.placeholder} />;
            break;
          case "etapas":
            entrada = <EditorEtapas valor={(v as Etapa[]) ?? []} onChange={(x) => mudar(c.chave, x)} />;
            break;
          case "selecao":
          case "relacao": {
            const ops = c.tipo === "selecao" ? (c.opcoes ?? []) : (opcoes[c.relacao!] ?? []).filter((o) => o.valor !== registro?.id);
            entrada = (
              <select id={id} className="campo" value={String(v ?? "")} onChange={(e) => mudar(c.chave, e.target.value)} required={c.obrigatorio}>
                {!c.obrigatorio || !v ? <option value="">{c.obrigatorio ? "Escolha…" : "—"}</option> : null}
                {ops.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </option>
                ))}
              </select>
            );
            break;
          }
          case "booleano":
            entrada = (
              <label className="flex items-center gap-2 text-sm">
                <input id={id} type="checkbox" className="size-4 accent-[var(--destaque)]" checked={Boolean(v)} onChange={(e) => mudar(c.chave, e.target.checked)} />
                {c.rotulo}
              </label>
            );
            break;
          default:
            entrada = (
              <input
                id={id}
                className="campo"
                type={c.tipo === "data" ? "date" : c.tipo === "mes" ? "month" : c.tipo === "url" ? "url" : c.tipo === "telefone" ? "tel" : "text"}
                inputMode={c.tipo === "dinheiro" ? "decimal" : c.tipo === "numero" ? "numeric" : undefined}
                value={String(v ?? "")}
                onChange={(e) => mudar(c.chave, e.target.value)}
                placeholder={c.placeholder}
                required={c.obrigatorio}
              />
            );
        }
        return (
          <div key={c.chave} className={classe}>
            {c.tipo !== "booleano" && (
              <label htmlFor={id} className="rotulo">
                {c.rotulo}
                {c.obrigatorio && <span className="text-destaque"> *</span>}
              </label>
            )}
            {entrada}
            {c.ajuda && c.tipo !== "markdown" && <p className="mt-1 text-[11px] text-suave">{c.ajuda}</p>}
          </div>
        );
      })}
      {erro && (
        <div className="sm:col-span-2">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button className="botao" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

/** Botão que abre o formulário numa gaveta (para criar ou editar). */
export function BotaoFormulario({
  entidade,
  registro,
  opcoes,
  padroes,
  rotulo,
  titulo,
  classe = "botao",
  irParaDetalhe = false,
  icone = !registro ? "novo" : "editar",
  ocultar,
}: {
  entidade: string;
  registro?: Record<string, unknown> | null;
  opcoes?: OpcoesRelacao;
  padroes?: Record<string, unknown>;
  rotulo?: string;
  titulo?: string;
  classe?: string;
  irParaDetalhe?: boolean;
  icone?: "novo" | "editar" | "nenhum";
  ocultar?: string[];
}) {
  const ent = ENTIDADES[entidade];
  const [aberta, setAberta] = useState(false);
  const router = useRouter();
  const fechar = useCallback(() => setAberta(false), []);
  const nome = ent.nome.charAt(0).toUpperCase() + ent.nome.slice(1);
  return (
    <>
      <button type="button" className={classe} onClick={() => setAberta(true)}>
        {icone === "novo" && <Plus className="size-4" />}
        {icone === "editar" && <Pencil className="size-4" />}
        {rotulo ?? (registro ? "Editar" : `Nov${ent.artigo} ${ent.nome}`)}
      </button>
      <Gaveta aberta={aberta} aoFechar={fechar} titulo={titulo ?? (registro ? `Editar ${ent.nome}` : `Nov${ent.artigo} ${nome.toLowerCase()}`)}>
        {aberta && (
          <FormularioEntidade
            entidade={entidade}
            registro={registro}
            opcoes={opcoes}
            padroes={padroes}
            ocultar={ocultar}
            aoSalvar={(id) => {
              setAberta(false);
              if (irParaDetalhe && !registro) router.push(`/item/${entidade}/${id}`);
              else router.refresh();
            }}
          />
        )}
      </Gaveta>
    </>
  );
}

export function BotaoExcluir({
  entidade,
  id,
  voltarPara,
  rotulo = "Excluir",
  classe = "botao-perigo",
}: {
  entidade: string;
  id: string;
  voltarPara?: string;
  rotulo?: string;
  classe?: string;
}) {
  const ent = ENTIDADES[entidade];
  const [pendente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      className={classe}
      disabled={pendente}
      onClick={() => {
        if (!confirm(`Excluir ${ent.artigo} ${ent.nome}? Isso não pode ser desfeito.`)) return;
        iniciar(async () => {
          const r = await excluirEntidade(entidade, id);
          if (r?.erro) alert(r.erro);
          else if (voltarPara) router.push(voltarPara);
          else router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" /> {rotulo}
    </button>
  );
}
