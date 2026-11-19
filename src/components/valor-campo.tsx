import type { Campo, Opcao } from "@/lib/entidades";
import { rotuloOpcao } from "@/lib/entidades";
import { MESES, data, reais } from "@/lib/formatos";
import { linkWhatsapp, telefoneBonito } from "@/lib/whatsapp";
import { Markdown } from "./markdown";

type Etapa = { titulo: string; descricao: string; responsavel: string; acao: string };

/** Funil desenhado como uma sequência de etapas. */
export function SequenciaEtapas({ etapas }: { etapas: Etapa[] }) {
  if (!etapas?.length) return <p className="text-sm text-suave">Nenhuma etapa cadastrada.</p>;
  return (
    <ol className="flex flex-col gap-0 lg:flex-row lg:items-stretch lg:gap-0">
      {etapas.map((e, i) => (
        <li key={i} className="relative flex lg:flex-1 lg:flex-col">
          <div className="flex flex-col items-center lg:flex-row">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destaque text-sm font-medium text-sobre-destaque">{i + 1}</span>
            {i < etapas.length - 1 && <span className="w-0.5 flex-1 bg-destaque/30 lg:h-0.5 lg:w-auto lg:flex-1" />}
          </div>
          <div className="mb-5 ml-3 min-w-0 flex-1 rounded-xl border border-borda bg-superficie-2 p-3 lg:mt-3 lg:mr-3 lg:ml-0">
            <p className="font-medium">{e.titulo || `Etapa ${i + 1}`}</p>
            {e.responsavel && <p className="text-xs text-suave">Responsável: {e.responsavel}</p>}
            {e.descricao && <p className="mt-2 text-sm whitespace-pre-wrap">{e.descricao}</p>}
            {e.acao && (
              <p className="mt-2 rounded-lg bg-superficie px-2 py-1.5 text-sm whitespace-pre-wrap">
                <span className="text-xs font-medium text-destaque-escuro">Ação: </span>
                {e.acao}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ValorCampo({ campo, valor, opcoes }: { campo: Campo; valor: unknown; opcoes?: Record<string, Opcao[]> }) {
  const vazio = valor === null || valor === undefined || valor === "" || (Array.isArray(valor) && !valor.length);
  if (vazio && campo.tipo !== "booleano") return <span className="text-suave">—</span>;
  switch (campo.tipo) {
    case "markdown":
      return <Markdown texto={String(valor)} />;
    case "textoLongo":
      return <p className="text-sm whitespace-pre-wrap">{String(valor)}</p>;
    case "dinheiro":
      return <>{reais(Number(valor))}</>;
    case "data":
      return <>{data(String(valor))}</>;
    case "mes": {
      const [a, m] = String(valor).split("-").map(Number);
      return <>{MESES[m - 1]} de {a}</>;
    }
    case "selecao":
      return <span className="etiqueta">{rotuloOpcao(campo.opcoes, valor)}</span>;
    case "relacao":
      return <>{rotuloOpcao(opcoes?.[campo.relacao!], valor)}</>;
    case "booleano":
      return <>{valor ? "Sim" : "Não"}</>;
    case "url":
      return (
        <a href={String(valor)} target="_blank" rel="noopener noreferrer" className="break-all text-destaque-escuro underline underline-offset-2">
          {String(valor)}
        </a>
      );
    case "telefone": {
      const l = linkWhatsapp(String(valor));
      return l ? (
        <a href={l} target="_blank" rel="noopener noreferrer" className="text-destaque-escuro underline underline-offset-2">
          {telefoneBonito(String(valor))}
        </a>
      ) : (
        <>{String(valor)}</>
      );
    }
    case "lista": {
      const itens = valor as string[];
      if (campo.chave === "passos")
        return (
          <ol className="ml-5 list-decimal space-y-1 text-sm">
            {itens.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
        );
      if (campo.chave === "links")
        return (
          <ul className="space-y-1 text-sm">
            {itens.map((t, i) => (
              <li key={i}>
                <a href={/^https?:/.test(t) ? t : `https://${t}`} target="_blank" rel="noopener noreferrer" className="break-all text-destaque-escuro underline underline-offset-2">{t}</a>
              </li>
            ))}
          </ul>
        );
      return (
        <div className="flex flex-wrap gap-1.5">
          {itens.map((t, i) => <span key={i} className="etiqueta">{t}</span>)}
        </div>
      );
    }
    case "etapas":
      return <SequenciaEtapas etapas={valor as Etapa[]} />;
    default:
      return <>{String(valor)}</>;
  }
}
