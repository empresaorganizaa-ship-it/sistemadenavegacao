import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarraProgresso, SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { data as fData, hojeBrasil, porcentagem } from "@/lib/formatos";
import { diasEntre, inicioDoMes, periodoDa, segundaDaSemana, somarDias } from "@/lib/periodos";
import { Checklist } from "./checklist";

export const metadata = { title: "Rotina comercial" };

type Tarefa = { id: string; titulo: string; descricao: string | null; frequencia: string; ativo: boolean; ordem: number };

export default async function Rotina() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil().iso;
  const segunda = segundaDaSemana(hoje);
  const mes = inicioDoMes(hoje);
  const desde = segunda < mes ? segunda : mes;

  const [{ data: tarefasRaw }, { data: registros }] = await Promise.all([
    supabase.from("rotina_tarefas").select("*").eq("workspace_id", ctx.workspace.id).order("ordem").order("created_at"),
    supabase.from("rotina_registros").select("tarefa_id, periodo").eq("workspace_id", ctx.workspace.id).gte("periodo", desde),
  ]);
  const tarefas = ((tarefasRaw ?? []) as Tarefa[]).filter((t) => t.ativo);
  const feitos = new Set((registros ?? []).map((r) => `${r.tarefa_id}:${r.periodo}`));

  // % cumprido: diárias contam um por dia até hoje; semanais/mensais contam uma vez
  function cumprimento(inicio: string) {
    const dias = diasEntre(inicio, hoje) + 1;
    let total = 0;
    let ok = 0;
    for (const t of tarefas) {
      if (t.frequencia === "diaria") {
        for (let i = 0; i < dias; i++) {
          total++;
          if (feitos.has(`${t.id}:${somarDias(inicio, i)}`)) ok++;
        }
      } else if (t.frequencia === "semanal") {
        // semanas que começaram dentro do período
        let s = segundaDaSemana(inicio);
        while (s <= hoje) {
          if (s >= inicio || inicio === segunda) {
            total++;
            if (feitos.has(`${t.id}:${s}`)) ok++;
          }
          s = somarDias(s, 7);
        }
      } else if (inicio <= mes) {
        total++;
        if (feitos.has(`${t.id}:${mes}`)) ok++;
      }
    }
    return total ? ok / total : null;
  }

  const semana = cumprimento(segunda);
  const doMes = cumprimento(mes);

  const grupos = [
    { titulo: "Hoje", detalhe: fData(hoje), freq: "diaria" },
    { titulo: "Esta semana", detalhe: `a partir de ${fData(segunda).slice(0, 5)}`, freq: "semanal" },
    { titulo: "Este mês", detalhe: "", freq: "mensal" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina
        titulo="Rotina comercial"
        subtitulo="As tarefas que mantêm o comercial funcionando todos os dias."
        acoes={ctx.podeEditarOperacional && <BotaoFormulario entidade="rotina_tarefas" rotulo="Nova tarefa" />}
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {[["Cumprido na semana", semana], ["Cumprido no mês", doMes]].map(([r, v]) => (
          <div key={r as string} className="cartao flex flex-col gap-2">
            <p className="rotulo">{r as string}</p>
            <p className="font-titulo text-3xl">{porcentagem(v as number | null, 0)}</p>
            <BarraProgresso fracao={v as number | null} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {grupos.map((g) => {
          const lista = tarefas.filter((t) => t.frequencia === g.freq);
          const periodo = periodoDa(g.freq, hoje);
          return (
            <section key={g.freq} className="cartao">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-2xl">{g.titulo}</h2>
                <span className="text-xs text-suave">{g.detalhe}</span>
              </div>
              <Checklist
                periodo={periodo}
                podeEditar={ctx.podeEditarOperacional}
                itens={lista.map((t) => ({ id: t.id, titulo: t.titulo, descricao: t.descricao, feito: feitos.has(`${t.id}:${periodo}`) }))}
              />
              {!lista.length && <p className="text-sm text-suave">Nenhuma tarefa {g.freq === "diaria" ? "diária" : g.freq}.</p>}
            </section>
          );
        })}
      </div>

      {ctx.podeEditarOperacional && tarefas.length > 0 && (
        <details className="cartao mt-6">
          <summary className="cursor-pointer text-sm font-medium">Editar tarefas da rotina</summary>
          <ul className="mt-3 divide-y divide-borda">
            {tarefas.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>{t.titulo} <span className="text-xs text-suave">· {t.frequencia === "diaria" ? "diária" : t.frequencia}</span></span>
                <span className="flex shrink-0 gap-1">
                  <BotaoFormulario entidade="rotina_tarefas" registro={t} classe="botao-secundario px-2 py-1 text-xs" rotulo="Editar" icone="nenhum" />
                  <BotaoExcluir entidade="rotina_tarefas" id={t.id} classe="botao-perigo px-2 py-1 text-xs" rotulo="" />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
