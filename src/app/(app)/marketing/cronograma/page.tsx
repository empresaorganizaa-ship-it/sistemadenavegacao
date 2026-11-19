import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarOpcoes } from "@/lib/opcoes";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { FORMATOS, OBJETIVOS_CONTEUDO, STATUS_CONTEUDO, rotuloOpcao } from "@/lib/entidades";
import { MESES, data as fData, hojeBrasil } from "@/lib/formatos";
import { segundaDaSemana, somarDias } from "@/lib/periodos";

export const metadata = { title: "Cronograma de conteúdo" };

const COR: Record<string, string> = {
  ideia: "bg-superficie-2 text-suave border-borda",
  roteiro: "bg-alerta/10 text-alerta border-alerta/20",
  gravado: "bg-destaque-suave text-destaque-escuro border-destaque/20",
  publicado: "bg-sucesso/10 text-sucesso border-sucesso/20",
};
const SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default async function Cronograma({ searchParams }: { searchParams: Promise<{ mes?: string; ver?: string }> }) {
  const sp = await searchParams;
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const hoje = hojeBrasil();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoje.iso.slice(0, 7);
  const [a, m] = mes.split("-").map(Number);
  const ini = `${mes}-01`;
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const ant = new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 7);
  const prox = new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7);
  const lista = sp.ver === "lista";

  const [{ data }, opcoes] = await Promise.all([
    supabase.from("conteudos").select("id, data, tema, formato, status, objetivo, pilar_id, responsavel").eq("workspace_id", ctx.workspace.id).gte("data", ini).lte("data", ultimo).order("data"),
    carregarOpcoes(supabase, ctx.workspace.id, ["pilares_conteudo", "referencias"]),
  ]);
  const itens = data ?? [];
  const porDia = (d: string) => itens.filter((i) => i.data === d);

  const inicioGrade = segundaDaSemana(ini);
  const dias: string[] = [];
  for (let d = inicioGrade; d <= ultimo || dias.length % 7 !== 0; d = somarDias(d, 1)) dias.push(d);

  const linkMes = (x: string) => `/marketing/cronograma?mes=${x}${lista ? "&ver=lista" : ""}`;

  const ListaItens = (
    <div className="flex flex-col gap-2">
      {itens.map((i) => (
        <Link key={i.id} href={`/item/conteudos/${i.id}`} className="cartao flex items-center gap-3 p-3 transition hover:border-destaque">
          <div className="w-12 shrink-0 text-center">
            <p className="font-titulo text-2xl leading-none">{i.data.slice(8)}</p>
            <p className="text-[11px] text-suave">{SEMANA[(new Date(i.data + "T12:00:00Z").getUTCDay() + 6) % 7]}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{i.tema}</p>
            <p className="truncate text-xs text-suave">
              {[rotuloOpcao(FORMATOS, i.formato), i.pilar_id && rotuloOpcao(opcoes.pilares_conteudo, i.pilar_id), i.objetivo && rotuloOpcao(OBJETIVOS_CONTEUDO, i.objetivo), i.responsavel].filter((x) => x && x !== "—").join(" · ")}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${COR[i.status]}`}>{rotuloOpcao(STATUS_CONTEUDO, i.status)}</span>
        </Link>
      ))}
      {!itens.length && <p className="py-6 text-center text-sm text-suave">Nenhum conteúdo programado neste mês.</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina
        titulo="Cronograma de conteúdo"
        subtitulo="O que vai ao ar e em que etapa está cada conteúdo."
        acoes={ctx.podeEditarOperacional && (
          <BotaoFormulario entidade="conteudos" opcoes={opcoes} rotulo="Novo conteúdo" padroes={{ data: mes === hoje.iso.slice(0, 7) ? hoje.iso : ini }} />
        )}
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={linkMes(ant)} className="botao-secundario px-2" aria-label="Mês anterior"><ChevronLeft className="size-4" /></Link>
          <h2 className="min-w-44 text-center text-2xl">{MESES[m - 1]} {a}</h2>
          <Link href={linkMes(prox)} className="botao-secundario px-2" aria-label="Próximo mês"><ChevronRight className="size-4" /></Link>
        </div>
        <div className="hidden rounded-lg bg-superficie-2 p-1 text-sm lg:flex">
          <Link href={`/marketing/cronograma?mes=${mes}`} className={`rounded-md px-3 py-1 ${!lista ? "bg-superficie font-medium shadow-sm" : "text-suave"}`}>Calendário</Link>
          <Link href={`/marketing/cronograma?mes=${mes}&ver=lista`} className={`rounded-md px-3 py-1 ${lista ? "bg-superficie font-medium shadow-sm" : "text-suave"}`}>Lista</Link>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
        {STATUS_CONTEUDO.map((s) => <span key={s.valor} className={`rounded-full border px-2 py-0.5 ${COR[s.valor]}`}>{s.rotulo}</span>)}
      </div>

      <div className="lg:hidden">{ListaItens}</div>
      <div className="hidden lg:block">
        {lista ? ListaItens : (
          <div className="cartao overflow-hidden p-0">
            <div className="grid grid-cols-7 border-b border-borda bg-superficie-2 text-center text-xs tracking-wide text-suave uppercase">
              {SEMANA.map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {dias.map((d) => {
                const fora = d.slice(0, 7) !== mes;
                return (
                  <div key={d} className={`min-h-28 border-r border-b border-borda p-1.5 [&:nth-child(7n)]:border-r-0 ${fora ? "bg-superficie-2/50" : ""}`}>
                    <p className={`mb-1 text-right text-xs ${d === hoje.iso ? "font-bold text-destaque" : fora ? "text-suave/50" : "text-suave"}`}>{Number(d.slice(8))}</p>
                    <div className="flex flex-col gap-1">
                      {porDia(d).map((i) => (
                        <Link key={i.id} href={`/item/conteudos/${i.id}`} title={`${i.tema} (${rotuloOpcao(STATUS_CONTEUDO, i.status)})`} className={`truncate rounded border px-1.5 py-0.5 text-[11px] ${COR[i.status]}`}>
                          {i.formato ? `${rotuloOpcao(FORMATOS, i.formato)}: ` : ""}{i.tema}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-suave">Hoje: {fData(hoje.iso)}</p>
    </div>
  );
}
