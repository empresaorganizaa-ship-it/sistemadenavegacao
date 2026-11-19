import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarraProgresso, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { MESES, data as fData, hojeBrasil } from "@/lib/formatos";
import { naoLidos } from "@/lib/leituras";
import { ListaCombinados, type Combinado } from "./combinados";

export const metadata = { title: "Encontros" };

export default async function Encontros() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil().iso;
  const [{ data: encontros }, { data: combinados }] = await Promise.all([
    supabase.from("encontros").select("id, data, titulo, resumo, proximo_encontro, created_by, updated_at").eq("workspace_id", ctx.workspace.id).order("data", { ascending: false }),
    supabase.from("encontro_combinados").select("id, encontro_id, texto, responsavel, prazo, feito").eq("workspace_id", ctx.workspace.id).order("prazo", { nullsFirst: false }).order("ordem"),
  ]);
  const lista = encontros ?? [];
  const todos = (combinados ?? []) as Combinado[];
  const titulo = Object.fromEntries(lista.map((e) => [e.id, e.titulo]));
  const abertos = todos.filter((c) => !c.feito).map((c) => ({ ...c, encontro: titulo[c.encontro_id] }));
  const novos = await naoLidos(supabase, ctx.usuario.id, "encontros", lista);
  const proximo = lista.map((e) => e.proximo_encontro).filter((d): d is string => !!d && d >= hoje).sort()[0];

  return (
    <div className="mx-auto max-w-5xl">
      <TituloPagina
        titulo="Encontros"
        subtitulo="O registro de cada encontro do acompanhamento e o que ficou combinado."
        acoes={ctx.podeAdministrar && <BotaoFormulario entidade="encontros" rotulo="Novo encontro" irParaDetalhe padroes={{ data: hoje, titulo: `Encontro ${lista.length + 1}` }} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="flex flex-col gap-3">
          {lista.map((e) => {
            const cs = todos.filter((c) => c.encontro_id === e.id);
            const feitos = cs.filter((c) => c.feito).length;
            const [a, m, d] = e.data.split("-");
            return (
              <Link key={e.id} href={`/encontros/${e.id}`} className="cartao flex gap-4 p-4 transition hover:border-destaque">
                <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-destaque-suave text-center leading-tight text-destaque-escuro">
                  <span className="font-titulo text-2xl">{d}</span>
                  <span className="text-[11px]">{MESES[Number(m) - 1].slice(0, 3)}/{a.slice(2)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-titulo text-xl leading-tight">{e.titulo}</p>
                    {novos.has(e.id) && <span className="etiqueta shrink-0">Novo</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-suave">{e.resumo.replace(/[*#>_`-]/g, " ").replace(/\s+/g, " ").trim() || "Sem resumo."}</p>
                  {cs.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="w-28"><BarraProgresso fracao={feitos / cs.length} /></div>
                      <span className="text-[11px] text-suave">{feitos} de {cs.length} combinados feitos</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          {!lista.length && (
            <p className="cartao text-sm text-suave">
              {ctx.podeAdministrar ? "Registre aqui cada encontro: o que foi conversado e o que ficou combinado." : "A consultora ainda não registrou encontros."}
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          {proximo && (
            <div className="cartao">
              <p className="rotulo">Próximo encontro</p>
              <p className="font-titulo text-3xl">{fData(proximo)}</p>
            </div>
          )}
          <div className="cartao">
            <h2 className="mb-2 text-xl">Combinados em aberto <span className="text-base text-suave">({abertos.length})</span></h2>
            {abertos.length ? (
              <ListaCombinados itens={abertos} podeMarcar={ctx.podeEditarOperacional} hoje={hoje} mostrarEncontro />
            ) : (
              <p className="text-sm text-suave">Nenhum combinado pendente. ✨</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
