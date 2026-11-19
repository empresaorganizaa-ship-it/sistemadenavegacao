import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaAnexos } from "./anexos-cliente";

export async function Anexos({ entidade, registroId }: { entidade: string; registroId: string }) {
  const ctx = await carregarContexto();
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("anexos")
    .select("id, nome, caminho, tipo, tamanho, created_by")
    .eq("workspace_id", ctx.workspace.id)
    .eq("entidade", entidade)
    .eq("registro_id", registroId)
    .order("created_at");

  const caminhos = (data ?? []).map((a) => a.caminho);
  const assinados = caminhos.length ? (await supabase.storage.from("anexos").createSignedUrls(caminhos, 60 * 60)).data : [];
  const urls = Object.fromEntries((assinados ?? []).map((s) => [s.path, s.signedUrl]));

  return (
    <ListaAnexos
      workspaceId={ctx.workspace.id}
      entidade={entidade}
      registroId={registroId}
      podeAnexar={ctx.podeEditarOperacional}
      podeApagarTodos={ctx.podeAdministrar}
      euId={ctx.usuario.id}
      anexos={(data ?? []).map((a) => ({ ...a, url: urls[a.caminho] ?? null }))}
    />
  );
}
