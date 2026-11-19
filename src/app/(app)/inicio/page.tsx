import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { BarraProgresso, TituloPagina } from "@/components/ui";
import { GraficoFaturamento } from "@/components/graficos";
import { calcular, dividir, somar, type MetricaMes } from "@/lib/calculos";
import { MESES, data as fData, hojeBrasil, inteiro, porcentagem, primeiroNome, reais } from "@/lib/formatos";
import { metasDoAno } from "@/lib/metas";
import type { MetaCiclo } from "@/lib/tipos";
import { LinhaTempo, type Etapa } from "@/components/linha-tempo";
import { naoLidos } from "@/lib/leituras";
import { carregarPacientes } from "@/lib/posvenda";
import { diasEntre, somarDias } from "@/lib/periodos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";
import { carregarAtividade } from "@/lib/atividade";

export const metadata = { title: "Início" };

function Cartao({ rotulo, valor, detalhe, children }: { rotulo: string; valor: string; detalhe?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="cartao flex flex-col gap-1">
      <p className="rotulo">{rotulo}</p>
      <p className="font-titulo text-2xl leading-none tabular-nums sm:text-3xl">{valor}</p>
      {detalhe && <p className="text-xs text-suave">{detalhe}</p>}
      {children}
    </div>
  );
}

function CronogramaHorizontal({ etapas }: { etapas: Etapa[] }) {
  return (
    <ol className="hidden lg:flex">
      {etapas.map((e, i) => {
        const feita = e.status === "concluida";
        const agora = e.status === "andamento";
        return (
          <li key={e.id} className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-medium ${feita ? "border-destaque bg-destaque text-sobre-destaque" : agora ? "border-destaque bg-superficie text-destaque" : "border-borda bg-superficie text-suave"}`}>
                {feita ? "✓" : i + 1}
              </span>
              {i < etapas.length - 1 && <span className={`h-0.5 flex-1 ${feita ? "bg-destaque" : "bg-borda"}`} />}
            </div>
            <Link href={`/item/etapas_acompanhamento/${e.id}`} className={`mt-2 pr-3 ${agora ? "font-medium text-destaque-escuro" : feita ? "text-suave" : ""}`}>
              <span className="block text-sm leading-tight">{e.titulo}</span>
              <span className="block text-[11px] text-suave">
                {agora ? "Em andamento" : e.data_inicio ? fData(e.data_inicio).slice(0, 5) + (e.data_fim ? ` a ${fData(e.data_fim).slice(0, 5)}` : "") : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
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
  const hojeIso = hoje.iso;
  const ws = ctx.workspace.id;

  const [{ data: encontrosRec }, { data: combinadosPend }] = await Promise.all([
    supabase.from("encontros").select("id, titulo, data, created_by, updated_at").eq("workspace_id", ctx.workspace.id).order("updated_at", { ascending: false }).limit(6),
    supabase.from("encontro_combinados").select("id, texto, prazo, responsavel, encontro_id").eq("workspace_id", ctx.workspace.id).eq("feito", false).lte("prazo", somarDias(hoje.iso, 2)).order("prazo").limit(10),
  ]);
  const [{ data: etapasRaw }, { data: analises }, { data: secoes }, { data: processos }, { data: funis }, { data: acoesCrm }, { data: tarefas }, { data: feitasHoje }, pacientes, { data: conteudosHoje }] =
    await Promise.all([
      supabase.from("etapas_acompanhamento").select("id, titulo, descricao, data_inicio, data_fim, status").eq("workspace_id", ws).order("ordem").order("data_inicio"),
      supabase.from("analises_conteudo").select("id, titulo, mes_ref, created_by, updated_at").eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(6),
      supabase.from("playbook_secoes").select("id, titulo, conteudo, created_by, updated_at").eq("workspace_id", ws).neq("conteudo", "").order("updated_at", { ascending: false }).limit(6),
      supabase.from("processos").select("id, nome, created_by, updated_at").eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(6),
      supabase.from("funis").select("id, nome, created_by, updated_at").eq("workspace_id", ws).order("updated_at", { ascending: false }).limit(6),
      supabase.from("leads").select("id, nome, whatsapp, proxima_acao, proxima_acao_data, crm_colunas (tipo)").eq("workspace_id", ws).lte("proxima_acao_data", hojeIso).order("proxima_acao_data").limit(30),
      supabase.from("rotina_tarefas").select("id").eq("workspace_id", ws).eq("ativo", true).eq("frequencia", "diaria"),
      supabase.from("rotina_registros").select("tarefa_id").eq("workspace_id", ws).eq("periodo", hojeIso),
      carregarPacientes(supabase, ws),
      supabase.from("conteudos").select("id, tema, status").eq("workspace_id", ws).eq("data", hojeIso).neq("status", "publicado"),
    ]);
  const etapas = (etapasRaw ?? []) as Etapa[];
  const atividade = await carregarAtividade(supabase, ws, ctx.usuario.id, ctx.nomes);
  const ontemIso = somarDias(hojeIso, -1);
  const quando = (iso: string) => {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
    const hora = new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    return d === hojeIso ? `hoje, ${hora}` : d === ontemIso ? `ontem, ${hora}` : `${fData(d).slice(0, 5)}, ${hora}`;
  };

  // Novidades da consultora (entregáveis), com "não lido"
  const ent = [
    { chave: "encontros", nome: "Encontro", itens: (encontrosRec ?? []).map((e) => ({ ...e, titulo: e.titulo })) },
    { chave: "analises_conteudo", nome: "Análise de conteúdo", itens: (analises ?? []).map((a) => ({ ...a, titulo: `${a.titulo} · ${MESES[Number(a.mes_ref.slice(5, 7)) - 1]}` })) },
    { chave: "playbook_secoes", nome: "Playbook", itens: secoes ?? [] },
    { chave: "processos", nome: "Processo", itens: (processos ?? []).map((p) => ({ ...p, titulo: p.nome })) },
    { chave: "funis", nome: "Funil", itens: (funis ?? []).map((p) => ({ ...p, titulo: p.nome })) },
  ];
  const naoLidas = new Set<string>();
  for (const e of ent) for (const id of await naoLidos(supabase, ctx.usuario.id, e.chave, e.itens)) naoLidas.add(id);
  const novidades = ent
    .flatMap((e) => e.itens.map((i) => ({ id: i.id, titulo: i.titulo as string, tipo: e.nome, chave: e.chave, quando: i.updated_at as string })))
    .sort((a, b) => b.quando.localeCompare(a.quando))
    .slice(0, 6);

  // Ações de hoje
  const pendentesCrm = (acoesCrm ?? []).filter((l) => {
    const t = (l.crm_colunas as unknown as { tipo: string } | null)?.tipo;
    return t !== "ganho" && t !== "perdido" && l.proxima_acao;
  });
  const feitas = new Set((feitasHoje ?? []).map((f) => f.tarefa_id));
  const rotinaPendente = (tarefas ?? []).filter((t) => !feitas.has(t.id)).length;
  const prox7 = Array.from({ length: 7 }, (_, i) => somarDias(hojeIso, i).slice(5));
  const aniversariantes = pacientes.filter((p) => p.aniversario && prox7.includes(p.aniversario.slice(5)));
  const retornos = pacientes
    .filter((p) => p.fechado_em && p.data_procedimento && p.intervalo)
    .map((p) => ({ ...p, faltam: diasEntre(hojeIso, somarDias(p.data_procedimento!, p.intervalo!)) }))
    .filter((p) => p.faltam <= 7 && p.faltam >= -30);
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

      {(etapas.length > 0 || ctx.podeAdministrar) && (
        <section className="cartao mb-6">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 className="text-xl">Cronograma do acompanhamento</h2>
            <Link href="/acompanhamento" className="text-xs text-destaque-escuro underline underline-offset-4">
              {ctx.podeAdministrar ? "Editar" : "Ver tudo"}
            </Link>
          </div>
          {etapas.length ? (
            <div className="lg:hidden"><LinhaTempo etapas={etapas} compacta /></div>
          ) : (
            <p className="text-sm text-suave">Monte as etapas do acompanhamento para a cliente acompanhar aqui.</p>
          )}
          {etapas.length > 0 && <CronogramaHorizontal etapas={etapas} />}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="cartao flex flex-col gap-2 col-span-2">
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

        <div className="cartao flex flex-col gap-2 col-span-2">
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
          <h2 className="mb-3 text-xl">Novidades da consultora</h2>
          <ul className="flex flex-col gap-1">
            {novidades.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.chave === "playbook_secoes" ? `/comercial/playbook?s=${n.id}` : n.chave === "encontros" ? `/encontros/${n.id}` : `/item/${n.chave}/${n.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-superficie-2"
                >
                  <span className={`size-2 shrink-0 rounded-full ${naoLidas.has(n.id) ? "bg-destaque" : "bg-transparent"}`} aria-label={naoLidas.has(n.id) ? "não lido" : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${naoLidas.has(n.id) ? "font-medium" : ""}`}>{n.titulo}</span>
                    <span className="text-[11px] text-suave">{n.tipo} · {fData(n.quando)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {!novidades.length && <li className="text-sm text-suave">Ainda não há entregáveis publicados.</li>}
          </ul>
        </section>

        <section className="cartao">
          <h2 className="mb-3 text-xl">Ações de hoje</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {pendentesCrm.slice(0, 6).map((l) => {
              const zap = linkWhatsapp(l.whatsapp);
              const atrasada = l.proxima_acao_data! < hojeIso;
              return (
                <li key={l.id} className="flex items-start gap-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${atrasada ? "bg-erro" : "bg-alerta"}`} />
                  <span className="min-w-0 flex-1">
                    <Link href={`/item/leads/${l.id}`} className="font-medium hover:text-destaque-escuro">{l.nome}</Link>: {l.proxima_acao}
                    {atrasada && <span className="text-xs text-erro"> (atrasada desde {fData(l.proxima_acao_data).slice(0, 5)})</span>}
                  </span>
                  {zap && <a href={zap} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sucesso" aria-label={`WhatsApp de ${l.nome}`}><MessageCircle className="size-4" /></a>}
                </li>
              );
            })}
            {pendentesCrm.length > 6 && <li><Link href="/comercial/crm" className="text-xs text-destaque-escuro underline underline-offset-4">e mais {pendentesCrm.length - 6} no CRM</Link></li>}
            {(combinadosPend ?? []).map((c) => {
              const atrasado = c.prazo! < hojeIso;
              return (
                <li key={c.id} className="flex items-start gap-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${atrasado ? "bg-erro" : "bg-alerta"}`} />
                  <Link href={`/encontros/${c.encontro_id}`} className="hover:text-destaque-escuro">
                    Combinado{c.responsavel === "consultora" ? " (consultora)" : ""}: {c.texto}
                    <span className={`text-xs ${atrasado ? "text-erro" : "text-suave"}`}>
                      {" "}({atrasado ? `atrasado desde ${fData(c.prazo).slice(0, 5)}` : c.prazo === hojeIso ? "prazo hoje" : `prazo ${fData(c.prazo).slice(0, 5)}`})
                    </span>
                  </Link>
                </li>
              );
            })}
            {rotinaPendente > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destaque" />
                <Link href="/comercial/rotina" className="hover:text-destaque-escuro">{rotinaPendente} tarefa(s) da rotina de hoje para fazer</Link>
              </li>
            )}
            {(conteudosHoje ?? []).map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destaque" />
                <Link href={`/item/conteudos/${c.id}`} className="hover:text-destaque-escuro">Conteúdo de hoje: {c.tema}</Link>
              </li>
            ))}
            {retornos.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destaque" />
                <Link href="/pos-venda/servicos" className="hover:text-destaque-escuro">
                  Retorno: {retornos.slice(0, 3).map((p) => p.nome.split(" ")[0]).join(", ")}{retornos.length > 3 ? ` e mais ${retornos.length - 3}` : ""}
                </Link>
              </li>
            )}
            {aniversariantes.length > 0 && (
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-destaque" />
                <Link href="/pos-venda/aniversariantes" className="hover:text-destaque-escuro">
                  Aniversário na semana: {aniversariantes.slice(0, 3).map((p) => p.nome.split(" ")[0]).join(", ")}{aniversariantes.length > 3 ? ` e mais ${aniversariantes.length - 3}` : ""} 🎉
                </Link>
              </li>
            )}
            {!pendentesCrm.length && !combinadosPend?.length && !rotinaPendente && !retornos.length && !aniversariantes.length && !conteudosHoje?.length && (
              <li className="text-suave">Tudo em dia por hoje. ✨</li>
            )}
          </ul>
        </section>
      </div>

      <section className="cartao mt-6">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-xl">Atividade recente</h2>
          <span className="text-xs text-suave">últimos 7 dias</span>
        </div>
        <ul className="flex flex-col">
          {atividade.map((a) => (
            <li key={a.chave}>
              <Link href={a.link} className="flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-superficie-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destaque-suave text-xs font-medium text-destaque-escuro" aria-hidden>
                  {a.pessoa.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <strong className="font-medium">{a.pessoa}</strong> {a.frase}
                  <span className="block text-[11px] text-suave">{quando(a.quando)}</span>
                </span>
              </Link>
            </li>
          ))}
          {!atividade.length && (
            <li className="text-sm text-suave">
              {ctx.papel === "consultora" ? "Nada novo da cliente nos últimos 7 dias." : "Nada novo da consultora nos últimos 7 dias."}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
