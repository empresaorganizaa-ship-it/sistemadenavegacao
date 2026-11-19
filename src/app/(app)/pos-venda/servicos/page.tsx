import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { EnviarMensagem } from "@/components/enviar-mensagem";
import { data as fData, hojeBrasil, reais } from "@/lib/formatos";
import { diasEntre, somarDias } from "@/lib/periodos";
import { carregarModelos, carregarPacientes } from "@/lib/posvenda";

export const metadata = { title: "Serviços e retornos" };

export default async function Servicos() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil().iso;
  const [{ data: servicos }, pacientes, modelos] = await Promise.all([
    supabase.from("servicos").select("*").eq("workspace_id", ctx.workspace.id).order("ordem").order("nome"),
    carregarPacientes(supabase, ctx.workspace.id),
    carregarModelos(supabase, ctx.workspace.id),
  ]);

  // Pacientes para retorno: fecharam, têm data do procedimento e o serviço tem intervalo
  const retornos = pacientes
    .filter((p) => p.fechado_em && p.data_procedimento && p.intervalo)
    .map((p) => {
      const dataRetorno = somarDias(String(p.data_procedimento), Number(p.intervalo));
      return { ...p, dataRetorno, faltam: diasEntre(hoje, dataRetorno) };
    })
    .filter((p) => p.faltam <= 30 && p.faltam >= -60)
    .sort((a, b) => a.faltam - b.faltam);

  return (
    <div className="mx-auto max-w-5xl">
      <TituloPagina
        titulo="Serviços e retornos"
        subtitulo="Catálogo de procedimentos e quem está na hora de voltar."
        acoes={ctx.podeEditarOperacional && <BotaoFormulario entidade="servicos" rotulo="Novo serviço" />}
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}

      <section className="cartao mb-6">
        <h2 className="mb-1 text-2xl">Pacientes para retorno</h2>
        <p className="mb-4 text-sm text-suave">Calculado pela data do procedimento + o intervalo de retorno do serviço. Mostra quem volta nos próximos 30 dias e quem já passou da data.</p>
        <ul className="divide-y divide-borda">
          {retornos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <Link href={`/item/leads/${p.id}`} className="font-medium hover:text-destaque-escuro">{p.nome}</Link>
                <p className="text-xs text-suave">{p.procedimento} · feito em {fData(String(p.data_procedimento))} · retorno em {fData(p.dataRetorno)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${p.faltam < 0 ? "bg-erro/10 text-erro" : p.faltam <= 7 ? "bg-alerta/10 text-alerta" : "bg-superficie-2 text-suave"}`}>
                  {p.faltam < 0 ? `atrasado ${-p.faltam} dia(s)` : p.faltam === 0 ? "hoje" : `em ${p.faltam} dia(s)`}
                </span>
                <EnviarMensagem paciente={p} modelos={modelos} categoria="retorno" variaveis={{ data: fData(p.dataRetorno) }} rotulo="Mensagem" classe="botao-secundario px-3 py-1.5 text-xs" />
              </div>
            </li>
          ))}
          {!retornos.length && <li className="py-3 text-sm text-suave">Ninguém para retorno nos próximos 30 dias.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-2xl">Catálogo de serviços</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(servicos ?? []).map((s) => (
            <article key={s.id} className="cartao p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xl">{s.nome}</h3>
                {ctx.podeEditarOperacional && (
                  <div className="flex gap-1">
                    <BotaoFormulario entidade="servicos" registro={s} classe="botao-secundario px-2 py-1 text-xs" rotulo="Editar" icone="nenhum" />
                    <BotaoExcluir entidade="servicos" id={s.id} classe="botao-perigo px-2 py-1 text-xs" rotulo="" />
                  </div>
                )}
              </div>
              {s.descricao && <p className="mt-1 text-sm text-suave">{s.descricao}</p>}
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><dt className="rotulo">Faixa de preço</dt><dd>{s.preco_min || s.preco_max ? `${reais(s.preco_min, true)} a ${reais(s.preco_max, true)}` : "—"}</dd></div>
                <div><dt className="rotulo">Retorno</dt><dd>{s.intervalo_retorno_dias ? `a cada ${s.intervalo_retorno_dias} dias` : "—"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        {!servicos?.length && <p className="text-sm text-suave">Nenhum serviço cadastrado. Cadastre os procedimentos para usar no CRM e calcular os retornos.</p>}
      </section>
    </div>
  );
}
