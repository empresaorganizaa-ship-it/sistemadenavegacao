import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarraProgresso, TituloPagina } from "@/components/ui";
import { GraficoFaturamento } from "@/components/graficos";
import { calcular, dividir, somar, type MetricaMes } from "@/lib/calculos";
import { MESES, data as fData, hojeBrasil, inteiro, porcentagem, primeiroNome, reais } from "@/lib/formatos";
import { metasDoAno } from "@/lib/metas";
import type { MetaCiclo } from "@/lib/tipos";

export const metadata = { title: "Início" };

function Cartao({ rotulo, valor, detalhe, children }: { rotulo: string; valor: string; detalhe?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="cartao flex flex-col gap-1">
      <p className="rotulo">{rotulo}</p>
      <p className="font-titulo text-3xl leading-none tabular-nums">{valor}</p>
      {detalhe && <p className="text-xs text-suave">{detalhe}</p>}
      {children}
    </div>
  );
}

export default async function Inicio() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil();
  const ano = ctx.ano;
  // mês de referência: o atual, se o ano selecionado for o atual; senão, dezembro
  const mesRef = ano === hoje.ano ? hoje.mes : ano < hoje.ano ? 12 : 1;

  const [{ data: cicloRaw }, { data: metricasRaw }, metas] = await Promise.all([
    supabase.from("metas_ciclo").select("*").eq("workspace_id", ctx.workspace.id).eq("ativo", true).maybeSingle(),
    supabase.from("metricas_mensais").select("*").eq("workspace_id", ctx.workspace.id).gte("ano", ano - 3).lte("ano", ano + 3),
    metasDoAno(supabase, ctx.workspace.id, ano),
  ]);
  const ciclo = cicloRaw as MetaCiclo | null;
  const metricas = (metricasRaw ?? []) as MetricaMes[];

  // Realizado no ciclo: soma do faturamento dos meses dentro do período do ciclo
  let realizadoCiclo = 0;
  if (ciclo) {
    const ini = ciclo.data_inicio.slice(0, 7);
    const fim = ciclo.data_fim.slice(0, 7);
    realizadoCiclo = somar(
      metricas
        .filter((m) => {
          const chave = `${m.ano}-${String(m.mes).padStart(2, "0")}`;
          return chave >= ini && chave <= fim;
        })
        .map((m) => Number(m.faturamento ?? 0)),
    );
  }

  const doAno = metricas.filter((m) => m.ano === ano);
  const mesAtual = doAno.find((m) => m.mes === mesRef);
  const k = calcular(mesAtual, metas[mesRef]);
  const pctCiclo = ciclo ? dividir(realizadoCiclo, Number(ciclo.valor)) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina
        titulo={`Olá, ${primeiroNome(ctx.perfil.nome)}`}
        subtitulo={`Resumo de ${MESES[mesRef - 1].toLowerCase()} de ${ano}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cartao flex flex-col gap-2 sm:col-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="rotulo">Meta do ciclo {ciclo ? `· ${ciclo.nome}` : ""}</p>
            {ciclo && <span className="text-xs text-suave">{fData(ciclo.data_inicio)} a {fData(ciclo.data_fim)}</span>}
          </div>
          {ciclo ? (
            <>
              <p className="font-titulo text-4xl leading-none tabular-nums">{porcentagem(pctCiclo, 0)}</p>
              <BarraProgresso fracao={pctCiclo} />
              <p className="text-sm text-suave">
                <strong className="font-medium text-texto">{reais(realizadoCiclo, true)}</strong> de {reais(Number(ciclo.valor), true)}
              </p>
            </>
          ) : (
            <p className="text-sm text-suave">
              Nenhum ciclo ativo. <Link className="text-destaque-escuro underline underline-offset-4" href="/metas">Cadastrar meta</Link>
            </p>
          )}
        </div>

        <div className="cartao flex flex-col gap-2 sm:col-span-2">
          <p className="rotulo">Meta de {MESES[mesRef - 1].toLowerCase()}</p>
          {metas[mesRef] !== undefined ? (
            <>
              <p className="font-titulo text-4xl leading-none tabular-nums">{porcentagem(k.percentualMeta ?? 0, 0)}</p>
              <BarraProgresso fracao={k.percentualMeta} />
              <p className="text-sm text-suave">
                <strong className="font-medium text-texto">{reais(mesAtual?.faturamento ?? 0, true)}</strong> de {reais(metas[mesRef], true)}
              </p>
            </>
          ) : (
            <p className="text-sm text-suave">Sem meta cadastrada para este mês.</p>
          )}
        </div>

        <Cartao rotulo="Vendas no mês" valor={inteiro(mesAtual?.vendas_fechadas ?? null)} />
        <Cartao rotulo="Ticket médio" valor={reais(k.ticketMedio, true)} />
        <Cartao rotulo="Taxa de conversão" valor={porcentagem(k.taxaConversao)} detalhe="vendas ÷ avaliações realizadas" />
        <Cartao rotulo="Leads no mês" valor={inteiro(mesAtual?.leads_novos ?? null)} detalhe={k.custoPorLead !== null ? `${reais(k.custoPorLead)} por lead` : undefined} />
      </div>

      {!mesAtual && ctx.podeEditarOperacional && (
        <p className="mt-3 text-sm text-suave">
          Os números de {MESES[mesRef - 1].toLowerCase()} ainda não foram preenchidos.{" "}
          <Link href="/metricas" className="text-destaque-escuro underline underline-offset-4">Preencher métricas</Link>
        </p>
      )}

      <section className="cartao mt-6">
        <h2 className="mb-3 text-xl">Faturamento × meta em {ano}</h2>
        <GraficoFaturamento
          dados={Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => ({
            mes,
            realizado: doAno.find((m) => m.mes === mes)?.faturamento ?? null,
            meta: metas[mes] ?? null,
          }))}
        />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="cartao">
          <h2 className="text-xl">Novidades da consultora</h2>
          <p className="mt-2 text-sm text-suave">
            Aqui vão aparecer as análises, o playbook, os processos e os funis publicados pela consultora. Chega nas
            próximas fases.
          </p>
        </section>
        <section className="cartao">
          <h2 className="text-xl">Ações de hoje</h2>
          <p className="mt-2 text-sm text-suave">
            Próximas ações do CRM, rotina do dia, pacientes para retorno e aniversariantes da semana. Chega com o CRM
            (Fase 2) e o Pós-venda (Fase 4).
          </p>
        </section>
      </div>
    </div>
  );
}
