"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, LogOut, Menu as MenuIcone, X } from "lucide-react";
import { MENU } from "@/lib/navegacao";
import { IconeMenu } from "./icones";
import { MARCA } from "@/lib/marca";
import { escolherAno, escolherWorkspace, sair } from "@/app/(app)/acoes-gerais";

type Props = {
  children: React.ReactNode;
  workspaceNome: string;
  workspaceId: string;
  workspaces: { id: string; nome: string }[];
  logoUrl: string | null;
  ano: number;
  anos: number[];
  nomeUsuaria: string;
  papel: "consultora" | "cliente";
  encerrado: boolean;
};

function NavLista({ aoClicar }: { aoClicar?: () => void }) {
  const pathname = usePathname();
  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    <nav className="flex flex-col gap-1 text-sm" aria-label="Menu principal">
      {MENU.map((g) =>
        g.href ? (
          <Link
            key={g.titulo}
            href={g.href}
            onClick={aoClicar}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
              ativo(g.href) ? "bg-destaque-suave font-medium text-destaque-escuro" : "text-texto hover:bg-superficie-2"
            }`}
          >
            <IconeMenu nome={g.icone} className="size-4 shrink-0" />
            {g.titulo}
          </Link>
        ) : (
          <div key={g.titulo} className="mt-3">
            <div className="flex items-center gap-3 px-3 py-1 text-xs font-medium tracking-wide text-suave uppercase">
              <IconeMenu nome={g.icone} className="size-4 shrink-0" />
              {g.titulo}
            </div>
            <div className="mt-1 flex flex-col gap-0.5 border-l border-borda pl-2 ml-5">
              {g.itens!.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  onClick={aoClicar}
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${
                    ativo(i.href) ? "bg-destaque-suave font-medium text-destaque-escuro" : "text-texto hover:bg-superficie-2"
                  }`}
                >
                  {i.titulo}
                </Link>
              ))}
            </div>
          </div>
        ),
      )}
    </nav>
  );
}

export function Moldura(p: Props) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const pathname = usePathname();

  const marca = (
    <div className="flex items-center gap-3">
      {p.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.logoUrl} alt="" className="size-9 rounded-lg object-contain" />
      ) : (
        // sem logo da cliente: usa o símbolo da marca
        <div className="grid size-9 place-items-center rounded-lg bg-destaque">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/marca/logo-branco.png" alt="" className="size-5 object-contain" />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-titulo text-lg leading-tight">{p.workspaceNome}</div>
        <div className="text-[11px] text-suave">
          {p.encerrado ? "Gestão comercial" : MARCA.nome}
        </div>
      </div>
    </div>
  );

  const seletorWorkspace = (classe: string) =>
    p.workspaces.length > 1 && (
      <label className={`relative ${classe}`}>
        <span className="sr-only">Cliente</span>
        <select
          value={p.workspaceId}
          disabled={pendente}
          onChange={(e) => iniciar(() => escolherWorkspace(e.target.value))}
          className="campo appearance-none py-1.5 pr-8"
        >
          {p.workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nome}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-suave" />
      </label>
    );

  const rodape = (
    <div className="mt-auto border-t border-borda pt-4 text-sm">
      {seletorWorkspace("mx-3 mb-4 block lg:hidden")}
      <div className="px-3 text-xs text-suave">Logada como</div>
      <div className="truncate px-3 font-medium">
        {p.nomeUsuaria} <span className="text-xs font-normal text-suave">· {p.papel}</span>
      </div>
      <form action={sair}>
        <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-suave hover:bg-superficie-2 hover:text-texto">
          <LogOut className="size-4" /> Sair
        </button>
      </form>
    </div>
  );

  const BARRA_INFERIOR = MENU.filter((g) => g.href && g.href !== "/configuracoes");

  return (
    <div className="min-h-dvh lg:flex">
      {/* Menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-borda bg-superficie px-3 py-5 lg:flex">
        <div className="px-2">{marca}</div>
        <NavLista />
        {rodape}
      </aside>

      {/* Gaveta (celular) */}
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-texto/30" onClick={() => setAberto(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col gap-6 overflow-y-auto bg-superficie px-3 py-5 shadow-xl">
            <div className="flex items-start justify-between px-2">
              {marca}
              <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="p-1 text-suave">
                <X className="size-5" />
              </button>
            </div>
            <NavLista aoClicar={() => setAberto(false)} />
            {rodape}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-borda bg-fundo/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            onClick={() => setAberto(true)}
            className="-ml-1 p-1 text-texto lg:hidden"
            aria-label="Abrir menu"
          >
            <MenuIcone className="size-6" />
          </button>
          <div className="min-w-0 flex-1 lg:hidden">
            <div className="truncate font-titulo text-lg">{p.workspaceNome}</div>
          </div>
          {seletorWorkspace("hidden lg:block")}
          <div className="hidden flex-1 lg:block" />
          <label className="relative">
            <span className="sr-only">Ano</span>
            <select
              value={p.ano}
              disabled={pendente}
              onChange={(e) => iniciar(() => escolherAno(Number(e.target.value)))}
              className="campo appearance-none py-1.5 pr-8 font-medium"
              title="Ano exibido em metas e métricas"
            >
              {p.anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-suave" />
          </label>
        </header>

        {p.encerrado && p.papel === "consultora" && (
          <div className="border-b border-borda bg-superficie-2 px-4 py-2 text-center text-xs text-suave lg:px-8">
            Acompanhamento encerrado: você está vendo este espaço somente para leitura.
          </div>
        )}

        <main className={`flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pb-10 ${pendente ? "opacity-60" : ""}`}>{p.children}</main>

        {/* Menu inferior (celular) */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-borda bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Atalhos"
        >
          {BARRA_INFERIOR.map((g) => {
            const ativo = pathname.startsWith(g.href!);
            return (
              <Link
                key={g.href}
                href={g.href!}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${ativo ? "text-destaque-escuro" : "text-suave"}`}
              >
                <IconeMenu nome={g.icone} className="size-5" />
                {g.titulo === "Métricas comerciais" ? "Métricas" : g.titulo}
              </Link>
            );
          })}
          <button onClick={() => setAberto(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-suave">
            <MenuIcone className="size-5" />
            Mais
          </button>
        </nav>
      </div>
    </div>
  );
}
