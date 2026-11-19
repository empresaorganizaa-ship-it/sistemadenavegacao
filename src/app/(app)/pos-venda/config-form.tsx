"use client";

import { useActionState } from "react";
import { salvarConfigPosvenda } from "./acoes";
import { Aviso } from "@/components/ui";

export function FormConfig({ campos, valores, podeEditar }: { campos: { chave: string; rotulo: string; longo?: boolean }[]; valores: Record<string, string | null>; podeEditar: boolean }) {
  const [r, acao, salvando] = useActionState(salvarConfigPosvenda, undefined);
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2">
      <fieldset disabled={!podeEditar} className="contents">
        {campos.map((c) => (
          <div key={c.chave} className={c.longo ? "sm:col-span-2" : ""}>
            <label htmlFor={`cfg-${c.chave}`} className="rotulo">{c.rotulo}</label>
            {c.longo ? (
              <textarea id={`cfg-${c.chave}`} name={c.chave} className="campo" rows={2} defaultValue={valores[c.chave] ?? ""} />
            ) : (
              <input id={`cfg-${c.chave}`} name={c.chave} className="campo" defaultValue={valores[c.chave] ?? ""} />
            )}
          </div>
        ))}
      </fieldset>
      {r?.erro && <div className="sm:col-span-2"><Aviso tipo="erro">{r.erro}</Aviso></div>}
      {r?.ok && <div className="sm:col-span-2"><Aviso tipo="sucesso">{r.ok}</Aviso></div>}
      {podeEditar && <button className="botao self-start" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>}
    </form>
  );
}
