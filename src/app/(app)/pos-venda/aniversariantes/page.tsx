import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/ui";
import { EnviarMensagem } from "@/components/enviar-mensagem";
import { MESES, hojeBrasil } from "@/lib/formatos";
import { somarDias } from "@/lib/periodos";
import { carregarConfig, carregarModelos, carregarPacientes } from "@/lib/posvenda";
import { FormConfig } from "../config-form";
import { MarcarEnviado } from "./enviado";

export const metadata = { title: "Aniversariantes" };

export default async function Aniversariantes() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil();
  const [pacientes, modelos, config, { data: envios }] = await Promise.all([
    carregarPacientes(supabase, ctx.workspace.id),
    carregarModelos(supabase, ctx.workspace.id),
    carregarConfig(supabase, ctx.workspace.id),
    supabase.from("aniversario_envios").select("lead_id").eq("workspace_id", ctx.workspace.id).eq("ano", hoje.ano),
  ]);
  const enviados = new Set((envios ?? []).map((e) => e.lead_id));
  const comAniv = pacientes.filter((p) => p.aniversario);
  const mmdd = (d: string) => d.slice(5);
  const proximos7 = Array.from({ length: 7 }, (_, i) => mmdd(somarDias(hoje.iso, i)));
  const daSemana = comAniv.filter((p) => proximos7.includes(mmdd(String(p.aniversario)))).sort((a, b) => proximos7.indexOf(mmdd(String(a.aniversario))) - proximos7.indexOf(mmdd(String(b.aniversario))));
  const doMes = comAniv.filter((p) => Number(String(p.aniversario).slice(5, 7)) === hoje.mes).sort((a, b) => String(a.aniversario).slice(8).localeCompare(String(b.aniversario).slice(8)));

  const Linha = ({ p }: { p: (typeof comAniv)[number] }) => {
    const dia = String(p.aniversario).slice(8, 10) + "/" + String(p.aniversario).slice(5, 7);
    const ehHoje = mmdd(String(p.aniversario)) === mmdd(hoje.iso);
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-medium ${ehHoje ? "bg-destaque text-sobre-destaque" : "bg-destaque-suave text-destaque-escuro"}`}>{dia}</span>
          <div className="min-w-0">
            <Link href={`/item/leads/${p.id}`} className="font-medium hover:text-destaque-escuro">{p.nome}</Link>
            <p className="text-xs text-suave">{ehHoje ? "É hoje! 🎉" : p.procedimento ?? ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MarcarEnviado leadId={p.id} ano={hoje.ano} enviado={enviados.has(p.id)} podeEditar={ctx.podeEditarOperacional} />
          <EnviarMensagem paciente={p} modelos={modelos} categoria="aniversario" variaveis={{ beneficio: config.aniv_beneficio ?? undefined }} rotulo="Mensagem" classe="botao-secundario px-3 py-1.5 text-xs" />
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina titulo="Aniversariantes" subtitulo="Puxado automaticamente das datas de aniversário cadastradas no CRM." />
      <div className="flex flex-col gap-6">
        <section className="cartao">
          <h2 className="mb-1 text-2xl">Próximos 7 dias</h2>
          <ul className="divide-y divide-borda">
            {daSemana.map((p) => <Linha key={p.id} p={p} />)}
            {!daSemana.length && <li className="py-3 text-sm text-suave">Nenhuma aniversariante nos próximos 7 dias.</li>}
          </ul>
        </section>
        <section className="cartao">
          <h2 className="mb-1 text-2xl">Aniversariantes de {MESES[hoje.mes - 1].toLowerCase()}</h2>
          <ul className="divide-y divide-borda">
            {doMes.map((p) => <Linha key={p.id} p={p} />)}
            {!doMes.length && <li className="py-3 text-sm text-suave">Nenhuma aniversariante neste mês.</li>}
          </ul>
        </section>
        <section className="cartao">
          <h2 className="mb-1 text-2xl">Campanha de aniversário</h2>
          <p className="mb-4 text-sm text-suave">O benefício entra automaticamente no lugar de {"{beneficio}"} nas mensagens de aniversário.</p>
          <FormConfig
            podeEditar={ctx.podeEditarOperacional}
            valores={config}
            campos={[
              { chave: "aniv_beneficio", rotulo: "Benefício" },
              { chave: "aniv_validade", rotulo: "Validade" },
              { chave: "aniv_regras", rotulo: "Regras", longo: true },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
