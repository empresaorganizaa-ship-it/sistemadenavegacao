import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { MESES, hojeBrasil } from "@/lib/formatos";
import { naoLidos } from "@/lib/leituras";

export const metadata = { title: "Análise de conteúdo" };

export default async function Analises() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("analises_conteudo")
    .select("id, titulo, mes_ref, texto, created_by, created_at, updated_at")
    .eq("workspace_id", ctx.workspace.id)
    .order("mes_ref", { ascending: false });
  const novas = await naoLidos(supabase, ctx.usuario.id, "analises_conteudo", data ?? []);
  const hoje = hojeBrasil();

  return (
    <div className="mx-auto max-w-4xl">
      <TituloPagina
        titulo="Análise de conteúdo"
        subtitulo="Uma análise por mês do Instagram, com pontos fortes, melhorias e recomendações."
        acoes={ctx.podeAdministrar && (
          <BotaoFormulario entidade="analises_conteudo" rotulo="Nova análise" irParaDetalhe padroes={{ mes_ref: hoje.iso.slice(0, 7) }} />
        )}
      />
      <div className="flex flex-col gap-3">
        {(data ?? []).map((a) => {
          const [ano, mes] = a.mes_ref.split("-").map(Number);
          return (
            <Link key={a.id} href={`/item/analises_conteudo/${a.id}`} className="cartao flex items-center gap-4 transition hover:border-destaque">
              <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-destaque-suave text-center leading-tight text-destaque-escuro">
                <span className="text-xs">{MESES[mes - 1].slice(0, 3)}</span>
                <span className="font-titulo text-lg">{ano}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-xl">{a.titulo} · {MESES[mes - 1]}</p>
                <p className="truncate text-sm text-suave">{a.texto.replace(/[*#>_-]/g, "").slice(0, 140)}</p>
              </div>
              {novas.has(a.id) ? <span className="etiqueta">Não lida</span> : null}
            </Link>
          );
        })}
        {!data?.length && <p className="text-sm text-suave">Nenhuma análise publicada ainda.</p>}
      </div>
    </div>
  );
}
