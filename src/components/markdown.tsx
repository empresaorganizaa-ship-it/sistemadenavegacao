// Mostra texto formatado (negrito, itálico, títulos, listas, citações e links)
// a partir de Markdown simples. Não usa HTML cru: tudo vira elementos React,
// então nada digitado consegue injetar código na página.
import { Fragment, type ReactNode } from "react";

function inline(texto: string, chave: string): ReactNode[] {
  const nos: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(texto))) {
    if (m.index > ultimo) nos.push(texto.slice(ultimo, m.index));
    const k = `${chave}-${i++}`;
    if (m[2]) nos.push(<strong key={k}>{m[2]}</strong>);
    else if (m[3] || m[4]) nos.push(<em key={k}>{m[3] ?? m[4]}</em>);
    else if (m[5])
      nos.push(
        <a key={k} href={m[6]} target="_blank" rel="noopener noreferrer" className="text-destaque-escuro underline underline-offset-2">
          {m[5]}
        </a>,
      );
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) nos.push(texto.slice(ultimo));
  return nos;
}

export function Markdown({ texto, className = "" }: { texto: string | null | undefined; className?: string }) {
  if (!texto?.trim()) return null;
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let i = 0;
  let n = 0;

  while (i < linhas.length) {
    const l = linhas[i];
    const k = `b${n++}`;
    if (!l.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(l);
    if (h) {
      const nivel = h[1].length;
      const cls = nivel === 1 ? "text-2xl" : nivel === 2 ? "text-xl" : "text-lg";
      blocos.push(
        nivel === 1 ? <h2 key={k} className={`${cls} mt-4 first:mt-0`}>{inline(h[2], k)}</h2>
        : nivel === 2 ? <h3 key={k} className={`${cls} mt-4 first:mt-0`}>{inline(h[2], k)}</h3>
        : <h4 key={k} className={`${cls} mt-3 font-titulo first:mt-0`}>{inline(h[2], k)}</h4>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\s*[-*]\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*[-*]\s+/, ""));
      blocos.push(
        <ul key={k} className="ml-5 list-disc space-y-1">
          {itens.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}
        </ul>,
      );
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^\s*\d+[.)]\s+/.test(linhas[i])) itens.push(linhas[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocos.push(
        <ol key={k} className="ml-5 list-decimal space-y-1">
          {itens.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}
        </ol>,
      );
      continue;
    }
    if (/^>\s?/.test(l)) {
      const itens: string[] = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) itens.push(linhas[i++].replace(/^>\s?/, ""));
      blocos.push(
        <blockquote key={k} className="border-l-2 border-destaque bg-superficie-2 px-4 py-2 italic">
          {itens.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t, `${k}-${j}`)}</Fragment>)}
        </blockquote>,
      );
      continue;
    }
    const par: string[] = [];
    while (
      i < linhas.length &&
      linhas[i].trim() &&
      !/^(#{1,3}\s|\s*[-*]\s+|\s*\d+[.)]\s+|>)/.test(linhas[i])
    )
      par.push(linhas[i++]);
    blocos.push(
      <p key={k}>
        {par.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t, `${k}-${j}`)}</Fragment>)}
      </p>,
    );
  }

  return <div className={`flex flex-col gap-3 text-sm leading-relaxed ${className}`}>{blocos}</div>;
}
