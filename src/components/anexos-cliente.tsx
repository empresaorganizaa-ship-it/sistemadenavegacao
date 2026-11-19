"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { excluirAnexo, registrarAnexo } from "@/app/(app)/acoes-entidades";
import { Aviso } from "./ui";

type Anexo = { id: string; nome: string; caminho: string; tipo: string | null; tamanho: number | null; created_by: string | null; url: string | null };

const TIPOS = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

function tamanho(b: number | null) {
  if (!b) return "";
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.ceil(b / 1024)} KB`;
}

export function ListaAnexos({
  workspaceId, entidade, registroId, podeAnexar, podeApagarTodos, euId, anexos,
}: {
  workspaceId: string;
  entidade: string;
  registroId: string;
  podeAnexar: boolean;
  podeApagarTodos: boolean;
  euId: string;
  anexos: Anexo[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  async function enviar(f: File) {
    setErro("");
    if (f.size > 10 * 1024 * 1024) return setErro("O arquivo pode ter no máximo 10 MB.");
    if (!TIPOS.includes(f.type)) return setErro("Envie imagens (PNG, JPG, WEBP, GIF) ou PDF.");
    const limpo = f.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const caminho = `${workspaceId}/${entidade}/${registroId}/${Date.now()}-${limpo}`;
    const supabase = criarClienteNavegador();
    const { error } = await supabase.storage.from("anexos").upload(caminho, f, { contentType: f.type });
    if (error) return setErro("Não foi possível enviar o arquivo.");
    const r = await registrarAnexo(entidade, registroId, { nome: f.name, caminho, tipo: f.type, tamanho: f.size });
    if (r?.erro) setErro(r.erro);
  }

  if (!anexos.length && !podeAnexar) return null;

  return (
    <section className="cartao">
      <h2 className="mb-3 text-xl">Anexos</h2>
      {anexos.length > 0 ? (
        <ul className="mb-3 grid gap-2 sm:grid-cols-2">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-borda p-2">
              <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3">
                {a.tipo?.startsWith("image/") && a.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-superficie-2 text-suave">
                    <FileText className="size-5" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{a.nome}</span>
                  <span className="text-[11px] text-suave">{tamanho(a.tamanho)}</span>
                </span>
              </a>
              {(podeApagarTodos || (podeAnexar && a.created_by === euId)) && (
                <button
                  className="p-1.5 text-suave hover:text-erro"
                  aria-label={`Apagar ${a.nome}`}
                  disabled={pendente}
                  onClick={() => confirm(`Apagar "${a.nome}"?`) && iniciar(async () => void (await excluirAnexo(a.id)))}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-suave">Nenhum arquivo anexado.</p>
      )}
      {podeAnexar && (
        <>
          <input
            ref={input}
            type="file"
            accept={TIPOS.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) iniciar(() => enviar(f));
              e.target.value = "";
            }}
          />
          <button className="botao-secundario" disabled={pendente} onClick={() => input.current?.click()}>
            <Paperclip className="size-4" /> {pendente ? "Enviando…" : "Anexar arquivo"}
          </button>
          <p className="mt-1 text-[11px] text-suave">Imagens ou PDF, até 10 MB. Não anexe fotos de pacientes.</p>
        </>
      )}
      {erro && <div className="mt-2"><Aviso tipo="erro">{erro}</Aviso></div>}
    </section>
  );
}
