import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoExcluir, BotaoFormulario } from "@/components/formulario-entidade";
import { EnviarMensagem } from "@/components/enviar-mensagem";
import { CATEGORIAS_MENSAGEM } from "@/lib/entidades";
import { carregarConfig, carregarModelos, carregarPacientes } from "@/lib/posvenda";
import { CopiarTexto } from "./copiar";

export const metadata = { title: "Modelos de mensagem" };

export default async function Mensagens({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
  const { categoria } = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const [modelos, pacientes, config] = await Promise.all([
    carregarModelos(supabase, ctx.workspace.id),
    carregarPacientes(supabase, ctx.workspace.id),
    carregarConfig(supabase, ctx.workspace.id),
  ]);
  const cats = CATEGORIAS_MENSAGEM.filter((c) => !categoria || c.valor === categoria);
  const beneficio = (cat: string) => (cat === "aniversario" ? config.aniv_beneficio : cat === "pedido_indicacao" ? config.ind_beneficio_indicadora : null) ?? undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <TituloPagina
        titulo="Modelos de mensagem"
        subtitulo={<>Textos prontos com variáveis automáticas: {"{nome}"}, {"{procedimento}"}, {"{data}"} e {"{beneficio}"}.</>}
        acoes={ctx.podeEditarOperacional && <BotaoFormulario entidade="mensagens_modelos" rotulo="Novo modelo" padroes={categoria ? { categoria } : {}} />}
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}
      <nav className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 pb-1" aria-label="Categorias">
        <a href="/pos-venda/mensagens" className={`shrink-0 rounded-full border px-3 py-1 text-sm ${!categoria ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave"}`}>Todas</a>
        {CATEGORIAS_MENSAGEM.map((c) => (
          <a key={c.valor} href={`/pos-venda/mensagens?categoria=${c.valor}`} className={`shrink-0 rounded-full border px-3 py-1 text-sm ${categoria === c.valor ? "border-destaque bg-destaque text-sobre-destaque" : "border-borda bg-superficie text-suave"}`}>
            {c.rotulo}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-8">
        {cats.map((c) => {
          const lista = modelos.filter((m) => m.categoria === c.valor);
          if (!lista.length && !categoria) return null;
          return (
            <section key={c.valor}>
              <h2 className="mb-3 text-2xl">{c.rotulo}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {lista.map((m) => (
                  <article key={m.id} className="cartao flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-sans text-base font-medium">{m.titulo}</h3>
                      {ctx.podeEditarOperacional && (
                        <div className="flex shrink-0 gap-1">
                          <BotaoFormulario entidade="mensagens_modelos" registro={m} classe="botao-secundario px-2 py-1 text-xs" rotulo="Editar" icone="nenhum" />
                          <BotaoExcluir entidade="mensagens_modelos" id={m.id} classe="botao-perigo px-2 py-1 text-xs" rotulo="" />
                        </div>
                      )}
                    </div>
                    <p className="flex-1 rounded-xl bg-superficie-2 p-3 text-sm whitespace-pre-wrap">{m.texto}</p>
                    <div className="flex flex-wrap gap-2">
                      <CopiarTexto texto={m.texto} />
                      <EnviarMensagem
                        pacientes={pacientes}
                        modelos={modelos}
                        modeloInicial={m.id}
                        categoria={m.categoria}
                        variaveis={{ beneficio: beneficio(m.categoria) }}
                        rotulo="Enviar para paciente"
                        classe="botao px-3 py-1.5 text-xs"
                      />
                    </div>
                  </article>
                ))}
                {!lista.length && <p className="text-sm text-suave">Nenhum modelo nesta categoria.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
