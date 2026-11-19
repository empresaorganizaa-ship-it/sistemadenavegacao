"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Check, Copy, Trash2, Upload } from "lucide-react";
import {
  alternarOrigem, cancelarConvite, convidar, definirLogo, definirSenha, excluirEspaco, mudarStatus,
  removerMembro, salvarEspaco, salvarOrigem, salvarPerfil, type Resultado,
} from "./acoes";
import { Aviso } from "@/components/ui";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { OrigemLead, Workspace } from "@/lib/tipos";

function Mensagem({ r }: { r: Resultado }) {
  if (r?.erro) return <Aviso tipo="erro">{r.erro}</Aviso>;
  if (r?.ok) return <Aviso tipo="sucesso">{r.ok}</Aviso>;
  return null;
}

const CORES_SUGERIDAS = ["#9C7A5B", "#B08D7A", "#8C6F64", "#A3876A", "#7D8471", "#6F7D8C", "#B5838D", "#3F3A36"];

export function FormEspaco({ workspace, podeEditar }: { workspace: Workspace; podeEditar: boolean }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(salvarEspaco, undefined);
  const [cor, setCor] = useState(workspace.cor_destaque);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <fieldset disabled={!podeEditar} className="flex flex-col gap-4">
        <div>
          <label className="rotulo" htmlFor="ws-nome">Nome</label>
          <input id="ws-nome" name="nome" className="campo" defaultValue={workspace.nome} required />
        </div>
        <div>
          <span className="rotulo">Cor de destaque</span>
          <div className="flex flex-wrap items-center gap-2">
            {CORES_SUGERIDAS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCor(c)}
                className={`size-8 rounded-full border-2 transition ${cor.toLowerCase() === c.toLowerCase() ? "border-texto" : "border-transparent"}`}
                style={{ background: c }}
                aria-label={`Usar a cor ${c}`}
              />
            ))}
            <label className="ml-1 flex items-center gap-2 text-xs text-suave">
              <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="size-8 cursor-pointer rounded border border-borda" />
              Outra
            </label>
            <input type="hidden" name="cor_destaque" value={cor} />
          </div>
        </div>
        <div className="max-w-[160px]">
          <label className="rotulo" htmlFor="ws-ano">Ano ativo</label>
          <input id="ws-ano" name="ano_ativo" type="number" min={2000} max={2100} className="campo" defaultValue={workspace.ano_ativo} />
        </div>
      </fieldset>
      <Mensagem r={r} />
      {podeEditar && <button className="botao self-start" disabled={salvando}>{salvando ? "Salvando…" : "Salvar"}</button>}
    </form>
  );
}

export function FormLogo({ workspaceId, logoUrl, podeEditar }: { workspaceId: string; logoUrl: string | null; podeEditar: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [r, setR] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();

  async function enviar(arquivo: File) {
    if (arquivo.size > 2 * 1024 * 1024) return setR({ erro: "O logo pode ter no máximo 2 MB." });
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(arquivo.type))
      return setR({ erro: "Use uma imagem PNG, JPG, WEBP ou SVG." });
    const ext = arquivo.name.split(".").pop()?.toLowerCase() || "png";
    const caminho = `${workspaceId}/logo-${Date.now()}.${ext}`;
    const supabase = criarClienteNavegador();
    const { error } = await supabase.storage.from("logos").upload(caminho, arquivo, { contentType: arquivo.type });
    if (error) return setR({ erro: "Não foi possível enviar o arquivo." });
    setR(await definirLogo(caminho));
  }

  return (
    <div>
      <span className="rotulo">Logo</span>
      <div className="flex items-center gap-4">
        <div className="grid size-16 place-items-center overflow-hidden rounded-xl border border-borda bg-superficie-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo atual" className="size-full object-contain" />
          ) : (
            <span className="text-xs text-suave">sem logo</span>
          )}
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) iniciar(() => enviar(f));
                e.target.value = "";
              }}
            />
            <button type="button" className="botao-secundario" disabled={pendente} onClick={() => input.current?.click()}>
              <Upload className="size-4" /> {pendente ? "Enviando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
            {logoUrl && (
              <button type="button" className="botao-secundario" disabled={pendente} onClick={() => iniciar(async () => setR(await definirLogo(null)))}>
                Remover
              </button>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-suave">PNG, JPG, WEBP ou SVG, até 2 MB. De preferência com fundo transparente.</p>
      <div className="mt-2"><Mensagem r={r} /></div>
    </div>
  );
}

export function BlocoStatus({ encerrado, papel, podeAdministrar }: { encerrado: boolean; papel: "consultora" | "cliente"; podeAdministrar: boolean }) {
  const [r, setR] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p>
        Status:{" "}
        <span className="etiqueta">{encerrado ? "Acompanhamento encerrado" : "Em acompanhamento"}</span>
      </p>
      <p className="text-suave">
        {encerrado
          ? "A cliente edita tudo. A consultora, se ainda estiver no espaço, só pode ver."
          : "A consultora edita tudo. A cliente edita os dados do dia a dia (metas, métricas e, nas próximas fases, CRM, rotina etc.) e vê e comenta os entregáveis."}
      </p>
      {podeAdministrar && !encerrado && papel === "consultora" && (
        <button
          className="botao-secundario self-start"
          disabled={pendente}
          onClick={() => {
            if (confirm("Encerrar o acompanhamento? A cliente passa a editar tudo e você fica somente com acesso de leitura."))
              iniciar(async () => setR(await mudarStatus("acompanhamento_encerrado")));
          }}
        >
          Encerrar acompanhamento
        </button>
      )}
      {podeAdministrar && encerrado && (
        <button
          className="botao-secundario self-start"
          disabled={pendente}
          onClick={() => {
            if (confirm("Reabrir o acompanhamento? A consultora volta a editar tudo."))
              iniciar(async () => setR(await mudarStatus("em_acompanhamento")));
          }}
        >
          Reabrir acompanhamento
        </button>
      )}
      <Mensagem r={r} />
    </div>
  );
}

type Pessoa = { id: string; nome: string; email: string; papel: "consultora" | "cliente" };

export function Pessoas({
  pessoas, convites, euId, podeAdministrar, site,
}: {
  pessoas: Pessoa[];
  convites: { id: string; email: string; papel: "consultora" | "cliente" }[];
  euId: string;
  podeAdministrar: boolean;
  site: string;
}) {
  const [r, acao, enviando] = useActionState<Resultado, FormData>(convidar, undefined);
  const [pendente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const textoConvite = (email: string) =>
    `Olá! Criei o seu acesso ao nosso sistema de acompanhamento comercial. Entre em ${site} com o e-mail ${email} e toque em "Receber link de acesso". O link chega no seu e-mail.`;

  return (
    <div className="flex flex-col gap-5">
      <ul className="divide-y divide-borda">
        {pessoas.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {p.nome || p.email} {p.id === euId && <span className="text-xs font-normal text-suave">(você)</span>}
              </p>
              <p className="truncate text-xs text-suave">{p.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="etiqueta">{p.papel}</span>
              {(podeAdministrar || p.id === euId) && pessoas.length > 1 && (
                <button
                  className="p-1.5 text-suave hover:text-erro"
                  aria-label={p.id === euId ? "Sair deste espaço" : `Remover ${p.nome}`}
                  title={p.id === euId ? "Sair deste espaço" : "Remover acesso"}
                  disabled={pendente}
                  onClick={() => {
                    const msg = p.id === euId ? "Sair deste espaço? Você perde o acesso." : `Remover o acesso de ${p.nome || p.email}?`;
                    if (confirm(msg)) iniciar(async () => void (await removerMembro(p.id)));
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </li>
        ))}
        {convites.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate">{c.email}</p>
              <p className="text-xs text-suave">Convite pendente: ainda não entrou</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="etiqueta opacity-70">{c.papel}</span>
              {podeAdministrar && (
                <button
                  className="p-1.5 text-suave hover:text-erro"
                  aria-label={`Cancelar convite de ${c.email}`}
                  disabled={pendente}
                  onClick={() => iniciar(async () => void (await cancelarConvite(c.id)))}
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {podeAdministrar && (
        <form action={acao} className="flex flex-col gap-3 rounded-xl bg-superficie-2 p-4">
          <p className="text-sm font-medium">Convidar pessoa</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input name="email" type="email" required placeholder="email@exemplo.com" className="campo" aria-label="E-mail" />
            <select name="papel" className="campo" defaultValue="cliente" aria-label="Papel">
              <option value="cliente">Cliente (dentista ou secretária)</option>
              <option value="consultora">Consultora</option>
            </select>
          </div>
          <button className="botao self-start" disabled={enviando}>{enviando ? "Convidando…" : "Convidar"}</button>
          {r?.erro && <Aviso tipo="erro">{r.erro}</Aviso>}
          {r?.ok && (
            <Aviso tipo="sucesso">
              <p>Convite criado! Agora envie esta mensagem para a pessoa (por WhatsApp, por exemplo):</p>
              <p className="mt-2 rounded bg-superficie p-2 text-texto">{textoConvite(r.ok)}</p>
              <button
                type="button"
                className="botao-secundario mt-2"
                onClick={() => {
                  navigator.clipboard.writeText(textoConvite(r.ok!));
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
              >
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Copiado" : "Copiar mensagem"}
              </button>
            </Aviso>
          )}
        </form>
      )}
    </div>
  );
}

export function Origens({ origens, podeEditar }: { origens: OrigemLead[]; podeEditar: boolean }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(salvarOrigem, undefined);
  const [pendente, iniciar] = useTransition();
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-borda">
        {origens.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 py-2">
            {editando === o.id ? (
              <form action={(fd) => { acao(fd); setEditando(null); }} className="flex flex-1 gap-2">
                <input type="hidden" name="id" value={o.id} />
                <input name="nome" defaultValue={o.nome} className="campo py-1.5" autoFocus aria-label="Nome da origem" />
                <button className="botao py-1.5">Salvar</button>
                <button type="button" className="botao-secundario py-1.5" onClick={() => setEditando(null)}>Cancelar</button>
              </form>
            ) : (
              <>
                <span className={o.ativo ? "" : "text-suave line-through"}>{o.nome}</span>
                {podeEditar && (
                  <div className="flex gap-3 text-xs">
                    <button className="text-suave hover:text-texto" onClick={() => setEditando(o.id)}>Renomear</button>
                    <button
                      className="text-suave hover:text-texto"
                      disabled={pendente}
                      onClick={() => iniciar(async () => void (await alternarOrigem(o.id, !o.ativo)))}
                    >
                      {o.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {podeEditar && (
        <form action={acao} className="flex gap-2">
          <input name="nome" placeholder="Nova origem (ex.: Parceria)" className="campo" aria-label="Nova origem" />
          <button className="botao shrink-0" disabled={salvando}>Adicionar</button>
        </form>
      )}
      <Mensagem r={r} />
      {podeEditar && <p className="text-xs text-suave">Desativar esconde a origem dos próximos meses, mas mantém o histórico.</p>}
    </div>
  );
}

export function FormPerfil({ nome }: { nome: string }) {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(salvarPerfil, undefined);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <div>
        <label className="rotulo" htmlFor="perfil-nome">Seu nome</label>
        <input id="perfil-nome" name="nome" className="campo" defaultValue={nome} required />
        <p className="mt-1 text-xs text-suave">Aparece em &quot;Inserido por…&quot; nos registros.</p>
      </div>
      <Mensagem r={r} />
      <button className="botao self-start" disabled={salvando}>Salvar nome</button>
    </form>
  );
}

export function FormSenha() {
  const [r, acao, salvando] = useActionState<Resultado, FormData>(definirSenha, undefined);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <p className="text-sm font-medium">Definir ou trocar senha</p>
      <p className="-mt-2 text-xs text-suave">Opcional: com uma senha você entra sem precisar esperar o link por e-mail.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="senha" type="password" autoComplete="new-password" placeholder="Nova senha (mín. 8)" className="campo" aria-label="Nova senha" />
        <input name="confirmar" type="password" autoComplete="new-password" placeholder="Repita a senha" className="campo" aria-label="Repita a senha" />
      </div>
      <Mensagem r={r} />
      <button className="botao-secundario self-start" disabled={salvando}>Salvar senha</button>
    </form>
  );
}

export function ZonaPerigo({ nome }: { nome: string }) {
  const [texto, setTexto] = useState("");
  const [r, setR] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm" htmlFor="confirma-exclusao">
        Para confirmar, digite o nome do espaço: <strong>{nome}</strong>
      </label>
      <input id="confirma-exclusao" className="campo" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <button
        className="botao-perigo self-start"
        disabled={pendente || texto.trim() !== nome}
        onClick={() => iniciar(async () => setR(await excluirEspaco(texto)))}
      >
        Excluir espaço definitivamente
      </button>
      <Mensagem r={r} />
    </div>
  );
}
