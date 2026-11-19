"use client";

import { useActionState, useTransition } from "react";
import { ativarCiclo, excluirCiclo, salvarCiclo, type Resultado } from "./acoes";
import { Aviso } from "@/components/ui";
import { paraCampo } from "@/lib/formatos";
import type { MetaCiclo } from "@/lib/tipos";

export function FormCiclo({ ciclo }: { ciclo?: MetaCiclo }) {
  const [estado, acao, salvando] = useActionState<Resultado, FormData>(salvarCiclo, undefined);
  const ano = new Date().getFullYear();

  return (
    <form action={acao} className="flex flex-col gap-4">
      {ciclo && <input type="hidden" name="id" value={ciclo.id} />}
      <div>
        <label className="rotulo" htmlFor="nome">Nome do ciclo</label>
        <input id="nome" name="nome" className="campo" defaultValue={ciclo?.nome ?? `Ciclo ${ano}`} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo" htmlFor="data_inicio">Início</label>
          <input id="data_inicio" name="data_inicio" type="date" className="campo" defaultValue={ciclo?.data_inicio ?? `${ano}-01-01`} required />
        </div>
        <div>
          <label className="rotulo" htmlFor="data_fim">Fim</label>
          <input id="data_fim" name="data_fim" type="date" className="campo" defaultValue={ciclo?.data_fim ?? `${ano}-12-31`} required />
        </div>
      </div>
      <div>
        <label className="rotulo" htmlFor="valor">Meta de faturamento (R$)</label>
        <input
          id="valor"
          name="valor"
          inputMode="decimal"
          className="campo"
          defaultValue={ciclo ? paraCampo(Number(ciclo.valor), 2) : ""}
          placeholder="Ex.: 600.000,00"
          required
        />
        {!ciclo && <p className="mt-1 text-xs text-suave">A meta será dividida igualmente entre os meses. Depois você pode ajustar mês a mês.</p>}
      </div>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
      <button className="botao" disabled={salvando}>{salvando ? "Salvando…" : ciclo ? "Salvar ciclo" : "Criar ciclo"}</button>
    </form>
  );
}

export function AcoesCiclo({ id, ativo }: { id: string; ativo: boolean }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-borda pt-4">
      {!ativo && (
        <button className="botao-secundario" disabled={pendente} onClick={() => iniciar(async () => void (await ativarCiclo(id)))}>
          Tornar este o ciclo ativo
        </button>
      )}
      <button
        className="botao-perigo"
        disabled={pendente}
        onClick={() => {
          if (confirm("Excluir este ciclo e as metas dos meses dele? Isso não pode ser desfeito."))
            iniciar(async () => void (await excluirCiclo(id)));
        }}
      >
        Excluir ciclo
      </button>
    </div>
  );
}
