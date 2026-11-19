import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarOpcoes } from "@/lib/opcoes";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { ENTIDADES, FORMATOS, rotuloOpcao } from "@/lib/entidades";
import { BotaoPauta } from "./pauta";

export const metadata = { title: "Banco de referências" };

type F = { tipo?: string; formato?: string; pilar?: string; status?: string };
const STATUS = ENTIDADES.referencias.campos.find((c) => c.chave === "status")!.opcoes!;
const TIPOS = ENTIDADES.referencias.campos.find((c) => c.chave === "tipo")!.opcoes!;

export default async function Referencias({ searchParams }: { searchParams: Promise<F> }) {
  const f = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  let q = supabase.from("referencias").select("*").eq("workspace_id", ctx.workspace.id).order("created_at", { ascending: false });
  if (f.tipo) q = q.eq("tipo", f.tipo);
  if (f.formato) q = q.eq("formato", f.formato);
  if (f.pilar) q = q.eq("pilar_id", f.pilar);
  if (f.status) q = q.eq("status", f.status);
  const [{ data }, opcoes] = await Promise.all([q, carregarOpcoes(supabase, ctx.workspace.id, ["pilares_conteudo"])]);
  const refs = data ?? [];

  // primeira imagem anexada de cada referência, como capa do cartão
  const { data: imgs } = refs.length
    ? await supabase
        .from("anexos")
        .select("registro_id, caminho, tipo, created_at")
        .eq("workspace_id", ctx.workspace.id)
        .eq("entidade", "referencias")
        .in("registro_id", refs.map((r) => r.id))
        .like("tipo", "image/%")
        .order("created_at")
    : { data: [] };
  const capa: Record<string, string> = {};
  for (const i of imgs ?? []) if (!capa[i.registro_id]) capa[i.registro_id] = i.caminho;
  const caminhos = Object.values(capa);
  const assinadas = caminhos.length ? (await supabase.storage.from("anexos").createSignedUrls(caminhos, 3600)).data ?? [] : [];
  const url = Object.fromEntries(assinadas.map((s) => [s.path, s.signedUrl]));

  const filtro = (nome: keyof F, rotulo: string, ops: { valor: string; rotulo: string }[]) => (
    <div>
      <label className="rotulo" htmlFor={`f-${nome}`}>{rotulo}</label>
      <select id={`f-${nome}`} name={nome} defaultValue={f[nome] ?? ""} className="campo">
        <option value="">Todos</option>
        {ops.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina
        titulo="Banco de referências"
        subtitulo="Ideias de conteúdo e referências guardadas para usar depois."
        acoes={ctx.podeEditarOperacional && <BotaoFormulario entidade="referencias" opcoes={opcoes} rotulo="Nova referência" irParaDetalhe />}
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}
      <form className="mb-5 flex flex-wrap items-end gap-2" action="/marketing/referencias">
        {filtro("tipo", "Tipo", TIPOS)}
        {filtro("formato", "Formato", FORMATOS)}
        {filtro("pilar", "Pilar", opcoes.pilares_conteudo)}
        {filtro("status", "Status", STATUS)}
        <button className="botao-secundario">Filtrar</button>
        {Object.values(f).some(Boolean) && <Link href="/marketing/referencias" className="px-2 py-2 text-sm text-suave underline underline-offset-4">Limpar</Link>}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {refs.map((r) => (
          <article key={r.id} className="cartao flex flex-col overflow-hidden p-0">
            {capa[r.id] && url[capa[r.id]] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url[capa[r.id]]} alt="" className="aspect-[4/3] w-full object-cover" />
            )}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="etiqueta">{rotuloOpcao(TIPOS, r.tipo)}</span>
                {r.formato && <span className="rounded-full bg-superficie-2 px-2 py-0.5">{rotuloOpcao(FORMATOS, r.formato)}</span>}
                <span className={`rounded-full px-2 py-0.5 ${r.status === "nova" ? "bg-alerta/10 text-alerta" : r.status === "aprovada" ? "bg-sucesso/10 text-sucesso" : "bg-superficie-2 text-suave"}`}>
                  {rotuloOpcao(STATUS, r.status)}
                </span>
              </div>
              <Link href={`/item/referencias/${r.id}`} className="font-titulo text-xl leading-tight hover:text-destaque-escuro">{r.titulo}</Link>
              {r.pilar_id && <p className="text-xs text-suave">{rotuloOpcao(opcoes.pilares_conteudo, r.pilar_id)}</p>}
              {r.observacao && <p className="line-clamp-3 text-sm">{r.observacao}</p>}
              {r.tags?.length > 0 && <p className="text-xs text-suave">{r.tags.map((t: string) => `#${t}`).join(" ")}</p>}
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                {r.link ? (
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-suave hover:text-texto">
                    <ExternalLink className="size-3.5" /> Abrir link
                  </a>
                ) : <span />}
                {ctx.podeEditarOperacional && r.status !== "usada" && <BotaoPauta id={r.id} />}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!refs.length && <p className="text-sm text-suave">Nenhuma referência encontrada.</p>}
    </div>
  );
}
