import Link from "next/link";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { SomenteLeitura, TituloPagina } from "@/components/ui";
import { BotaoFormulario } from "@/components/formulario-entidade";
import { MESES, hojeBrasil, reais } from "@/lib/formatos";
import { rotuloOpcao, STATUS_CAMPANHA } from "@/lib/entidades";
import { BotaoSazonais } from "./sazonais";

export const metadata = { title: "Campanhas do ano" };

const COR: Record<string, string> = {
  planejada: "bg-superficie-2 text-suave",
  andamento: "bg-destaque text-sobre-destaque",
  concluida: "bg-sucesso/15 text-sucesso",
};

export default async function Campanhas() {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const ano = ctx.ano;
  const { data } = await supabase
    .from("campanhas")
    .select("id, nome, status, data_inicio, data_fim, procedimento_foco, meta_faturamento, resultado_alcancado")
    .eq("workspace_id", ctx.workspace.id)
    .lte("data_inicio", `${ano}-12-31`)
    .gte("data_fim", `${ano}-01-01`)
    .order("data_inicio");
  const hoje = hojeBrasil();
  const campanhas = data ?? [];
  const meta = campanhas.reduce((s, c) => s + Number(c.meta_faturamento ?? 0), 0);
  const result = campanhas.reduce((s, c) => s + Number(c.resultado_alcancado ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <TituloPagina
        titulo={`Campanhas de ${ano}`}
        subtitulo={`${campanhas.length} campanha(s) · meta ${reais(meta, true)} · resultado ${reais(result, true)}`}
        acoes={ctx.podeEditarOperacional && (
          <>
            <BotaoSazonais ano={ano} />
            <BotaoFormulario entidade="campanhas" rotulo="Nova campanha" irParaDetalhe padroes={{ data_inicio: `${ano}-${String(hoje.mes).padStart(2, "0")}-01` }} />
          </>
        )}
      />
      {!ctx.podeEditarOperacional && <div className="mb-4"><SomenteLeitura /></div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MESES.map((nome, i) => {
          const ini = `${ano}-${String(i + 1).padStart(2, "0")}-01`;
          const fim = `${ano}-${String(i + 1).padStart(2, "0")}-31`;
          const doMes = campanhas.filter((c) => c.data_inicio <= fim && c.data_fim >= ini);
          const atual = ano === hoje.ano && i + 1 === hoje.mes;
          return (
            <section key={nome} className={`cartao min-h-36 p-4 ${atual ? "border-destaque" : ""}`}>
              <h2 className="mb-2 flex items-baseline justify-between text-xl">
                {nome}
                {atual && <span className="font-sans text-[11px] text-destaque-escuro">mês atual</span>}
              </h2>
              <ul className="flex flex-col gap-2">
                {doMes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/item/campanhas/${c.id}`} className="block rounded-lg border border-borda px-2.5 py-2 transition hover:border-destaque">
                      <span className="block text-sm font-medium">{c.nome}</span>
                      <span className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className={`rounded-full px-2 py-0.5 ${COR[c.status]}`}>{rotuloOpcao(STATUS_CAMPANHA, c.status)}</span>
                        {c.procedimento_foco && <span className="truncate text-suave">{c.procedimento_foco}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
                {!doMes.length && <li className="text-xs text-suave">Sem campanha.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
