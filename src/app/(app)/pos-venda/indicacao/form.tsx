"use client";

import { useActionState, useState } from "react";
import { registrarIndicacao } from "../acoes";
import { Aviso } from "@/components/ui";

export function FormIndicacao({ pacientes }: { pacientes: { id: string; nome: string }[] }) {
  const [r, acao, salvando] = useActionState(registrarIndicacao, undefined);
  const [nova, setNova] = useState(true);
  return (
    <form action={acao} className="grid gap-3 sm:grid-cols-2" key={r?.ok}>
      <div className="sm:col-span-2">
        <label htmlFor="ind-quem" className="rotulo">Quem indicou</label>
        <select id="ind-quem" name="indicadora_id" className="campo" required defaultValue="">
          <option value="" disabled>Escolha a paciente…</option>
          {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>
      <div className="flex gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="radio" checked={nova} onChange={() => setNova(true)} className="accent-[var(--destaque)]" /> Indicada nova</label>
        <label className="flex items-center gap-2"><input type="radio" checked={!nova} onChange={() => setNova(false)} className="accent-[var(--destaque)]" /> Já está no CRM</label>
      </div>
      {nova ? (
        <>
          <div>
            <label htmlFor="ind-nome" className="rotulo">Nome da indicada</label>
            <input id="ind-nome" name="nome" className="campo" required />
          </div>
          <div>
            <label htmlFor="ind-zap" className="rotulo">WhatsApp</label>
            <input id="ind-zap" name="whatsapp" type="tel" className="campo" placeholder="(11) 98765-4321" />
          </div>
          <p className="text-xs text-suave sm:col-span-2">A indicada entra automaticamente no CRM, na primeira coluna, com origem &quot;Indicação&quot;.</p>
        </>
      ) : (
        <div className="sm:col-span-2">
          <label htmlFor="ind-exist" className="rotulo">Indicada</label>
          <select id="ind-exist" name="indicada_id" className="campo" required defaultValue="">
            <option value="" disabled>Escolha…</option>
            {pacientes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
      )}
      {r?.erro && <div className="sm:col-span-2"><Aviso tipo="erro">{r.erro}</Aviso></div>}
      {r?.ok && <div className="sm:col-span-2"><Aviso tipo="sucesso">{r.ok}</Aviso></div>}
      <button className="botao self-start" disabled={salvando}>{salvando ? "Registrando…" : "Registrar indicação"}</button>
    </form>
  );
}
