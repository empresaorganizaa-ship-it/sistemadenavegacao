// Links de WhatsApp e preenchimento das variáveis dos modelos de mensagem.

/** Deixa só os números e garante o 55 do Brasil na frente. */
export function numeroWhatsapp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;
  let n = telefone.replace(/\D/g, "");
  if (!n) return null;
  if (n.startsWith("0")) n = n.replace(/^0+/, "");
  if (n.length <= 11) n = "55" + n;
  return n;
}

export function linkWhatsapp(telefone: string | null | undefined, texto?: string): string | null {
  const n = numeroWhatsapp(telefone);
  if (!n) return null;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export type Variaveis = { nome?: string; procedimento?: string; data?: string; beneficio?: string };

/** Troca {nome}, {procedimento}, {data} e {beneficio} pelos valores. */
export function preencher(texto: string, v: Variaveis): string {
  return texto
    .replace(/\{nome\}/gi, v.nome?.trim().split(/\s+/)[0] || "{nome}")
    .replace(/\{procedimento\}/gi, v.procedimento || "{procedimento}")
    .replace(/\{data\}/gi, v.data || "{data}")
    .replace(/\{beneficio\}/gi, v.beneficio || "{beneficio}");
}

/** Formata um telefone para exibição: (11) 98765-4321 */
export function telefoneBonito(t: string | null | undefined): string {
  if (!t) return "";
  const n = t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return t;
}
