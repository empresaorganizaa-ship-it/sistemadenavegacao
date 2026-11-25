"use server";

import { revalidatePath } from "next/cache";
import { carregarContexto } from "@/lib/contexto";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ORIGEM_IMPORTACAO, avaliar, lerData, normalizarTelefone, type LinhaAvaliada, type LinhaImportada } from "@/lib/importacao";
import { data as fData, hojeBrasil } from "@/lib/formatos";

const MAX_LINHAS = 3000;

type Entrada = LinhaImportada & { linha: number; avisos?: string[] };

/** Limpa de novo tudo o que veio do navegador (nunca confiar só na prévia). */
function sanear(l: Entrada): Entrada {
  const t = (v: unknown, max: number) => {
    const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
    return s ? s.slice(0, max) : null;
  };
  return {
    linha: Number.isInteger(l.linha) ? l.linha : 0,
    nome: t(l.nome, 200) ?? "",
    whatsapp: normalizarTelefone(l.whatsapp),
    instagram: t(l.instagram, 100),
    procedimento: t(l.procedimento, 200),
    data_procedimento: lerData(l.data_procedimento ?? null),
    aniversario: lerData(l.aniversario ?? null, true),
    observacoes: typeof l.observacoes === "string" ? l.observacoes.trim().slice(0, 5000) || null : null,
    avisos: Array.isArray(l.avisos) ? l.avisos.slice(0, 5).map((a) => String(a).slice(0, 200)) : [],
  };
}

/** WhatsApps de todo o CRM do espaço e nomes de quem está sem WhatsApp. */
async function existentesDoEspaco(ws: string) {
  const supabase = await criarClienteServidor();
  const whatsapps: string[] = [];
  const nomesSemWhats: string[] = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await supabase.from("leads").select("nome, whatsapp").eq("workspace_id", ws).order("id").range(de, de + 999);
    for (const l of data ?? []) {
      if (l.whatsapp) whatsapps.push(l.whatsapp);
      else nomesSemWhats.push(l.nome);
    }
    if (!data || data.length < 1000) break;
  }
  return { whatsapps, nomesSemWhats };
}

export async function avaliarImportacao(linhas: Entrada[]): Promise<{ erro?: string; linhas?: LinhaAvaliada[]; espaco?: string }> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Você não tem permissão para importar no CRM." };
  if (!Array.isArray(linhas) || !linhas.length) return { erro: "A planilha não tem linhas para importar." };
  if (linhas.length > MAX_LINHAS) return { erro: `A planilha tem ${linhas.length} linhas. O máximo por importação é ${MAX_LINHAS}.` };
  const { whatsapps, nomesSemWhats } = await existentesDoEspaco(ctx.workspace.id);
  return { linhas: avaliar(linhas.map(sanear), whatsapps, nomesSemWhats), espaco: ctx.workspace.nome };
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export async function importarLeads(
  colunaId: string,
  linhas: Entrada[],
): Promise<{ erro?: string; importados?: number; duplicadasCrm?: number; duplicadasPlanilha?: number; semNome?: number; coluna?: string }> {
  const ctx = await carregarContexto();
  if (!ctx.podeEditarOperacional) return { erro: "Você não tem permissão para importar no CRM." };
  if (!Array.isArray(linhas) || !linhas.length) return { erro: "Nada para importar." };
  if (linhas.length > MAX_LINHAS) return { erro: `O máximo por importação é ${MAX_LINHAS} linhas.` };
  const ws = ctx.workspace.id;
  const supabase = await criarClienteServidor();

  // coluna precisa ser deste espaço
  const { data: coluna } = await supabase.from("crm_colunas").select("id, nome").eq("id", colunaId).eq("workspace_id", ws).maybeSingle();
  if (!coluna) return { erro: "Escolha uma coluna do CRM deste espaço." };

  // origem "Importação – reativação" (cria se ainda não existir)
  let { data: origem } = await supabase.from("origens_lead").select("id, ativo").eq("workspace_id", ws).eq("nome", ORIGEM_IMPORTACAO).maybeSingle();
  if (!origem) {
    const { data: ult } = await supabase.from("origens_lead").select("ordem").eq("workspace_id", ws).order("ordem", { ascending: false }).limit(1).maybeSingle();
    const { data: nova, error } = await supabase
      .from("origens_lead")
      .insert({ workspace_id: ws, nome: ORIGEM_IMPORTACAO, ordem: (ult?.ordem ?? 0) + 1 })
      .select("id, ativo")
      .single();
    if (error || !nova) return { erro: `Não foi possível criar a origem "${ORIGEM_IMPORTACAO}". Peça para quem administra o espaço criá-la em Configurações → Origens de lead.` };
    origem = nova;
  }

  // procedimento: liga ao catálogo de serviços quando o nome bate
  const { data: servicos } = await supabase.from("servicos").select("id, nome").eq("workspace_id", ws);
  const servicoPorNome = new Map((servicos ?? []).map((s) => [semAcento(s.nome), s.id]));

  // reavalia com os dados atuais do banco (evita duplicar se algo mudou desde a prévia)
  const { whatsapps, nomesSemWhats } = await existentesDoEspaco(ws);
  const avaliadas = avaliar(linhas.map(sanear), whatsapps, nomesSemWhats);
  const aImportar = avaliadas.filter((l) => l.situacao === "importar");
  const hoje = hojeBrasil().iso;
  const marca = `Importado da planilha em ${fData(hoje)}.`;

  const registros = aImportar.map((l) => {
    const servicoId = l.procedimento ? servicoPorNome.get(semAcento(l.procedimento)) ?? null : null;
    return {
      workspace_id: ws,
      coluna_id: coluna.id,
      origem_id: origem!.id,
      nome: l.nome,
      whatsapp: l.whatsapp,
      instagram: l.instagram,
      servico_id: servicoId,
      procedimento_texto: servicoId ? null : l.procedimento,
      data_procedimento: l.data_procedimento,
      aniversario: l.aniversario,
      observacoes: l.observacoes ? `${l.observacoes}\n\n${marca}` : marca,
      data_entrada: hoje,
    };
  });

  let importados = 0;
  for (let i = 0; i < registros.length; i += 500) {
    const { error } = await supabase.from("leads").insert(registros.slice(i, i + 500));
    if (error) {
      revalidatePath("/comercial/crm");
      return {
        erro: importados
          ? `A importação parou no meio: ${importados} leads foram importados e o restante não. Tente importar a planilha de novo (quem já entrou será ignorado).`
          : "Não foi possível importar. Confira a planilha e tente de novo.",
      };
    }
    importados += Math.min(500, registros.length - i);
  }

  revalidatePath("/", "layout");
  return {
    importados,
    duplicadasCrm: avaliadas.filter((l) => l.situacao === "duplicada_crm").length,
    duplicadasPlanilha: avaliadas.filter((l) => l.situacao === "duplicada_planilha").length,
    semNome: avaliadas.filter((l) => l.situacao === "sem_nome").length,
    coluna: coluna.nome,
  };
}
