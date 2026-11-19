"use client";

import { useActionState, useTransition } from "react";
import { criarEspaco, criarExemplo, type Resultado } from "./acoes";
import { Aviso } from "@/components/ui";

export function CriarEspaco({ compacto = false }: { compacto?: boolean }) {
  const [estado, acao, criando] = useActionState<Resultado, FormData>(criarEspaco, undefined);
  const [gerando, iniciar] = useTransition();

  return (
    <div className={compacto ? "" : "mt-4"}>
      <form action={acao} className="flex flex-col gap-3">
        <div>
          <label htmlFor="nome-espaco" className="rotulo">Nome da cliente ou do consultório</label>
          <input id="nome-espaco" name="nome" className="campo" placeholder="Ex.: Dra. Ana Souza — HOF" required />
        </div>
        {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <button className="botao" disabled={criando}>{criando ? "Criando…" : "Criar espaço"}</button>
      </form>
      <div className="mt-4 border-t border-borda pt-4">
        <p className="text-xs text-suave">
          Quer só ver como o sistema fica? Crie um espaço de teste já preenchido com números de exemplo.
        </p>
        <button
          className="botao-secundario mt-2 w-full"
          disabled={gerando}
          onClick={() => iniciar(async () => void (await criarExemplo()))}
        >
          {gerando ? "Gerando…" : "Criar espaço de exemplo"}
        </button>
      </div>
    </div>
  );
}
