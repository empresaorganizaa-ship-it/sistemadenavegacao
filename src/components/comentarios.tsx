import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { primeiroNome } from "@/lib/formatos";
import { FormComentario, ApagarComentario } from "./comentarios-cliente";

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export async function Comentarios({ entidade, registroId }: { entidade: string; registroId: string }) {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("comentarios")
    .select("id, texto, created_by, created_at")
    .eq("workspace_id", ctx.workspace.id)
    .eq("entidade", entidade)
    .eq("registro_id", registroId)
    .order("created_at");

  return (
    <section className="cartao">
      <h2 className="mb-3 text-xl">Comentários {data?.length ? <span className="text-base text-suave">({data.length})</span> : null}</h2>
      <ul className="mb-4 flex flex-col gap-3">
        {(data ?? []).map((c) => (
          <li key={c.id} className="rounded-xl bg-superficie-2 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{primeiroNome(ctx.nomes[c.created_by ?? ""])}</span>
              <span className="flex items-center gap-2 text-[11px] text-suave">
                {quando(c.created_at)}
                {(c.created_by === ctx.usuario.id || ctx.podeAdministrar) && <ApagarComentario id={c.id} />}
              </span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{c.texto}</p>
          </li>
        ))}
        {!data?.length && <li className="text-sm text-suave">Nenhum comentário ainda.</li>}
      </ul>
      <FormComentario entidade={entidade} registroId={registroId} />
    </section>
  );
}
