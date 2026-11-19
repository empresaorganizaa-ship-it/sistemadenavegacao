import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoExcluir } from "@/components/formulario-entidade";
import { data as fData } from "@/lib/formatos";
import { carregarConfig } from "@/lib/posvenda";
import { FormConfig } from "../config-form";
import { FormIndicacao } from "./form";
import { ControlesIndicacao } from "./linha";

export const metadata = { title: "Programa de indicação" };

export default async function Indicacao() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const [{ data: indicacoes }, { data: leads }, config] = await Promise.all([
    supabase.from("indicacoes").select("id, indicadora_id, indicada_id, data, status, recompensa_entregue").eq("workspace_id", ctx.workspace.id).order("data", { ascending: false }),
    supabase.from("leads").select("id, nome").eq("workspace_id", ctx.workspace.id).order("nome").limit(3000),
    carregarConfig(supabase, ctx.workspace.id),
  ]);
  const nome = Object.fromEntries((leads ?? []).map((l) => [l.id, l.nome]));
  const ranking = Object.entries(
    (indicacoes ?? []).reduce<Record<string, { total: number; fechou: number }>>((acc, i) => {
      acc[i.indicadora_id] ??= { total: 0, fechou: 0 };
      acc[i.indicadora_id].total++;
      if (i.status === "fechou") acc[i.indicadora_id].fechou++;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1].total - a[1].total || b[1].fechou - a[1].fechou)
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl">
      <TituloPagina titulo="Programa de indicação" subtitulo="Regras do programa, indicações recebidas e as pacientes que mais indicam." />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          {ctx.podeEditarOperacional && (
            <section className="cartao">
              <h2 className="mb-3 text-2xl">Nova indicação</h2>
              <FormIndicacao pacientes={leads ?? []} />
            </section>
          )}
          <section className="cartao">
            <h2 className="mb-3 text-2xl">Indicações</h2>
            <ul className="divide-y divide-borda">
              {(indicacoes ?? []).map((i) => (
                <li key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <Link href={`/item/leads/${i.indicadora_id}`} className="font-medium hover:text-destaque-escuro">{nome[i.indicadora_id] ?? "—"}</Link>
                    <span className="text-suave"> indicou </span>
                    {i.indicada_id ? <Link href={`/item/leads/${i.indicada_id}`} className="font-medium hover:text-destaque-escuro">{nome[i.indicada_id] ?? "—"}</Link> : "—"}
                    <p className="text-xs text-suave">{fData(i.data)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ControlesIndicacao id={i.id} status={i.status} recompensa={i.recompensa_entregue} podeEditar={ctx.podeEditarOperacional} />
                    {ctx.podeEditarOperacional && <BotaoExcluir entidade="indicacoes" id={i.id} classe="p-1 text-suave hover:text-erro" rotulo="" />}
                  </div>
                </li>
              ))}
              {!indicacoes?.length && <li className="py-3 text-sm text-suave">Nenhuma indicação registrada.</li>}
            </ul>
          </section>
        </div>
        <div className="flex flex-col gap-6">
          <section className="cartao">
            <h2 className="mb-3 text-2xl">Quem mais indica</h2>
            <ol className="flex flex-col gap-2">
              {ranking.map(([id, r], pos) => (
                <li key={id} className="flex items-center gap-3">
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium ${pos === 0 ? "bg-destaque text-sobre-destaque" : "bg-superficie-2"}`}>{pos + 1}</span>
                  <Link href={`/item/leads/${id}`} className="min-w-0 flex-1 truncate text-sm hover:text-destaque-escuro">{nome[id] ?? "—"}</Link>
                  <span className="text-xs text-suave tabular-nums">{r.total} indicação(ões) · {r.fechou} fechou</span>
                </li>
              ))}
              {!ranking.length && <li className="text-sm text-suave">Ainda sem indicações.</li>}
            </ol>
          </section>
          <section className="cartao">
            <h2 className="mb-3 text-2xl">Regras do programa</h2>
            <FormConfig
              podeEditar={ctx.podeEditarOperacional}
              valores={config}
              campos={[
                { chave: "ind_beneficio_indicadora", rotulo: "Benefício para quem indica", longo: true },
                { chave: "ind_beneficio_indicada", rotulo: "Benefício para a indicada", longo: true },
                { chave: "ind_validade", rotulo: "Validade" },
              ]}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
