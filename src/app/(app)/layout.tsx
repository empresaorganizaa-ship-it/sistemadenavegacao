import { carregarContexto } from "@/lib/contexto";
import { Moldura } from "@/components/moldura";
import { hojeBrasil } from "@/lib/formatos";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const ctx = await carregarContexto();
  const atual = hojeBrasil().ano;
  const anos = Array.from(new Set([atual - 2, atual - 1, atual, atual + 1, ctx.ano, ctx.workspace.ano_ativo])).sort();

  return (
    <div className="tema" style={{ "--destaque": ctx.workspace.cor_destaque } as React.CSSProperties}>
      <Moldura
        workspaceNome={ctx.workspace.nome}
        workspaceId={ctx.workspace.id}
        workspaces={ctx.workspaces.map((w) => ({ id: w.id, nome: w.nome }))}
        logoUrl={ctx.logoUrl}
        ano={ctx.ano}
        anos={anos}
        nomeUsuaria={ctx.perfil.nome}
        papel={ctx.papel}
        encerrado={ctx.workspace.status === "acompanhamento_encerrado"}
      >
        {children}
      </Moldura>
    </div>
  );
}
