import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Autoria, SomenteLeitura, TituloPagina } from "@/components/ui";
import { data as fData, reais } from "@/lib/formatos";
import type { MetaCiclo, MetaMes } from "@/lib/tipos";
import { FormCiclo, AcoesCiclo } from "./form-ciclo";
import { TabelaMeses } from "./tabela-meses";

export const metadata = { title: "Metas" };

export default async function Metas({ searchParams }: { searchParams: Promise<{ ciclo?: string; novo?: string }> }) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();

  const { data: ciclosRaw } = await supabase
    .from("metas_ciclo")
    .select("*")
    .eq("workspace_id", ctx.workspace.id)
    .order("data_inicio", { ascending: false });
  const ciclos = (ciclosRaw ?? []) as MetaCiclo[];

  const novo = sp.novo === "1" || ciclos.length === 0;
  const ciclo = novo ? null : (ciclos.find((c) => c.id === sp.ciclo) ?? ciclos.find((c) => c.ativo) ?? ciclos[0]);

  let meses: MetaMes[] = [];
  const realizado: Record<string, number | null> = {};
  if (ciclo) {
    const { data: m } = await supabase.from("metas_mes").select("*").eq("ciclo_id", ciclo.id).order("mes");
    meses = (m ?? []) as MetaMes[];
    const anos = Array.from(new Set(meses.map((x) => Number(x.mes.slice(0, 4)))));
    if (anos.length) {
      const { data: met } = await supabase
        .from("metricas_mensais")
        .select("ano, mes, faturamento")
        .eq("workspace_id", ctx.workspace.id)
        .in("ano", anos);
      for (const r of met ?? []) {
        realizado[`${r.ano}-${String(r.mes).padStart(2, "0")}-01`] = r.faturamento === null ? null : Number(r.faturamento);
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <TituloPagina
        titulo="Metas"
        subtitulo="Meta de faturamento do ciclo e de cada mês."
        acoes={
          ctx.podeEditarOperacional && !novo && (
            <Link href="/metas?novo=1" className="botao-secundario">
              + Novo ciclo
            </Link>
          )
        }
      />

      {!ctx.podeEditarOperacional && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}

      {ciclos.length > 1 && !novo && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {ciclos.map((c) => (
            <Link
              key={c.id}
              href={`/metas?ciclo=${c.id}`}
              className={`shrink-0 rounded-full border px-3 py-1 text-sm transition ${
                c.id === ciclo?.id ? "border-destaque bg-destaque-suave text-destaque-escuro" : "border-borda bg-superficie text-suave hover:text-texto"
              }`}
            >
              {c.nome}
              {c.ativo && " · ativo"}
            </Link>
          ))}
        </div>
      )}

      {novo ? (
        <div className="cartao max-w-xl">
          <h2 className="mb-4 text-2xl">Novo ciclo</h2>
          {ctx.podeEditarOperacional ? (
            <FormCiclo />
          ) : (
            <p className="text-sm text-suave">Nenhum ciclo cadastrado ainda.</p>
          )}
          {ciclos.length > 0 && (
            <Link href="/metas" className="mt-3 inline-block text-sm text-suave underline underline-offset-4">
              Cancelar
            </Link>
          )}
        </div>
      ) : (
        ciclo && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="cartao h-fit">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-2xl">{ciclo.nome}</h2>
                  <p className="text-sm text-suave">
                    {fData(ciclo.data_inicio)} a {fData(ciclo.data_fim)}
                  </p>
                </div>
                {ciclo.ativo ? <span className="etiqueta">Ativo</span> : null}
              </div>
              <p className="rotulo">Meta do ciclo</p>
              <p className="font-titulo text-3xl">{reais(Number(ciclo.valor), true)}</p>
              <Autoria registro={ciclo} nomes={ctx.nomes} className="mt-2" />
              {ctx.podeEditarOperacional && (
                <details className="mt-5 border-t border-borda pt-4">
                  <summary className="cursor-pointer text-sm font-medium">Editar ciclo</summary>
                  <div className="mt-4">
                    <FormCiclo ciclo={ciclo} />
                  </div>
                </details>
              )}
              {ctx.podeEditarOperacional && <AcoesCiclo id={ciclo.id} ativo={ciclo.ativo} />}
            </div>

            <TabelaMeses
              cicloId={ciclo.id}
              metaCiclo={Number(ciclo.valor)}
              meses={meses.map((m) => ({ mes: m.mes, valor: Number(m.valor) }))}
              realizado={realizado}
              podeEditar={ctx.podeEditarOperacional}
            />
          </div>
        )
      )}
    </div>
  );
}
