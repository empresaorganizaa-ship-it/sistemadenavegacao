import Link from "next/link";
import { dataCurta, primeiroNome } from "@/lib/formatos";

export function TituloPagina({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl leading-tight lg:text-4xl">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-suave">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

/** "Inserido por Bruna em 12/03 · alterado por Monalisa em 15/03" */
export function Autoria({
  registro,
  nomes,
  className = "",
}: {
  registro: { created_by: string | null; created_at: string; updated_by?: string | null; updated_at?: string } | null | undefined;
  nomes: Record<string, string>;
  className?: string;
}) {
  if (!registro) return null;
  const criado = `Inserido por ${primeiroNome(nomes[registro.created_by ?? ""])} em ${dataCurta(registro.created_at)}`;
  const mudou =
    registro.updated_at &&
    registro.updated_by &&
    new Date(registro.updated_at).getTime() - new Date(registro.created_at).getTime() > 60_000;
  return (
    <p className={`text-[11px] text-suave ${className}`}>
      {criado}
      {mudou && ` · alterado por ${primeiroNome(nomes[registro.updated_by!])} em ${dataCurta(registro.updated_at!)}`}
    </p>
  );
}

export function BarraProgresso({ fracao }: { fracao: number | null }) {
  const pct = Math.max(0, Math.min(1, fracao ?? 0)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={`h-full rounded-full transition-all ${(fracao ?? 0) >= 1 ? "bg-sucesso" : "bg-destaque"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Aviso({ tipo = "info", children }: { tipo?: "info" | "alerta" | "erro" | "sucesso"; children: React.ReactNode }) {
  const cores = {
    info: "border-borda bg-superficie-2 text-texto",
    alerta: "border-alerta/30 bg-alerta/10 text-alerta",
    erro: "border-erro/30 bg-erro/10 text-erro",
    sucesso: "border-sucesso/30 bg-sucesso/10 text-sucesso",
  };
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cores[tipo]}`}>{children}</div>;
}

export function SomenteLeitura() {
  return (
    <Aviso>
      Você pode ver estes dados, mas não pode editá-los.
    </Aviso>
  );
}

export function EmBreve({ titulo, grupo, fase }: { titulo: string; grupo: string; fase: number }) {
  return (
    <div>
      <TituloPagina titulo={titulo} subtitulo={grupo} />
      <div className="cartao max-w-xl text-center">
        <p className="font-titulo text-2xl">Em construção</p>
        <p className="mt-2 text-sm text-suave">
          Este módulo chega na <strong>Fase {fase}</strong> do projeto.
        </p>
        <Link href="/inicio" className="botao-secundario mt-5">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
