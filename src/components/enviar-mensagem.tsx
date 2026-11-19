"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Gaveta } from "./gaveta";
import { CATEGORIAS_MENSAGEM, rotuloOpcao } from "@/lib/entidades";
import { linkWhatsapp, preencher, type Variaveis } from "@/lib/whatsapp";

export type Modelo = { id: string; titulo: string; categoria: string; texto: string };
export type Paciente = { id: string; nome: string; whatsapp: string | null; procedimento?: string | null };

/** Escolhe um modelo, preenche as variáveis e abre o WhatsApp (ou copia). */
export function EnviarMensagem({
  paciente,
  pacientes,
  modelos,
  categoria,
  modeloInicial,
  variaveis = {},
  rotulo = "Enviar mensagem",
  classe = "botao-secundario",
  aoEnviar,
}: {
  paciente?: Paciente;
  pacientes?: Paciente[];
  modelos: Modelo[];
  categoria?: string;
  modeloInicial?: string;
  variaveis?: Variaveis;
  rotulo?: string;
  classe?: string;
  aoEnviar?: () => void;
}) {
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);
  const ordenados = useMemo(
    () => [...modelos].sort((a, b) => Number(b.categoria === categoria) - Number(a.categoria === categoria)),
    [modelos, categoria],
  );
  const [modeloId, setModeloId] = useState(modeloInicial ?? ordenados[0]?.id ?? "");
  const [pacienteId, setPacienteId] = useState(paciente?.id ?? "");
  const p = paciente ?? pacientes?.find((x) => x.id === pacienteId);
  const modelo = modelos.find((m) => m.id === modeloId);
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);

  const preenchido = modelo ? preencher(modelo.texto, { nome: p?.nome, procedimento: p?.procedimento ?? undefined, ...variaveis }) : "";
  const final = texto || preenchido;
  const zap = linkWhatsapp(p?.whatsapp, final);

  return (
    <>
      <button type="button" className={classe} onClick={() => { setTexto(""); setAberta(true); }}>
        <MessageCircle className="size-4" /> {rotulo}
      </button>
      <Gaveta aberta={aberta} aoFechar={fechar} titulo={p && paciente ? `Mensagem para ${p.nome.split(" ")[0]}` : "Enviar mensagem"}>
        <div className="flex flex-col gap-4">
          {!paciente && (
            <div>
              <label className="rotulo" htmlFor="em-paciente">Paciente</label>
              <select id="em-paciente" className="campo" value={pacienteId} onChange={(e) => { setPacienteId(e.target.value); setTexto(""); }}>
                <option value="">Escolha a paciente…</option>
                {(pacientes ?? []).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="rotulo" htmlFor="em-modelo">Modelo</label>
            <select id="em-modelo" className="campo" value={modeloId} onChange={(e) => { setModeloId(e.target.value); setTexto(""); }}>
              {ordenados.map((m) => (
                <option key={m.id} value={m.id}>{rotuloOpcao(CATEGORIAS_MENSAGEM, m.categoria)} · {m.titulo}</option>
              ))}
            </select>
            {!modelos.length && <p className="mt-1 text-xs text-suave">Cadastre modelos em Pós-venda → Modelos de mensagem.</p>}
          </div>
          <div>
            <label className="rotulo" htmlFor="em-texto">Mensagem (pode ajustar antes de enviar)</label>
            <textarea id="em-texto" className="campo" rows={7} value={final} onChange={(e) => setTexto(e.target.value)} />
            {/\{(nome|procedimento|data|beneficio)\}/i.test(final) && (
              <p className="mt-1 text-xs text-alerta">Ainda há variáveis sem valor, entre chaves {"{ }"}. Ajuste o texto antes de enviar.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {zap ? (
              <a href={zap} target="_blank" rel="noopener noreferrer" className="botao" onClick={() => aoEnviar?.()}>
                <MessageCircle className="size-4" /> Abrir no WhatsApp
              </a>
            ) : (
              <span className="text-sm text-suave">{p ? "Esta paciente não tem WhatsApp cadastrado." : "Escolha a paciente para abrir no WhatsApp."}</span>
            )}
            <button
              type="button"
              className="botao-secundario"
              onClick={() => {
                navigator.clipboard.writeText(final);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Copiado" : "Copiar texto"}
            </button>
          </div>
        </div>
      </Gaveta>
    </>
  );
}
