"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { Aviso } from "@/components/ui";

function traduzirErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("rate limit") || m.includes("security purposes"))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (m.includes("invalid") && m.includes("email")) return "Este e-mail não parece válido.";
  return "Não foi possível entrar. Tente novamente.";
}

export function FormularioLogin({ erroInicial }: { erroInicial?: string }) {
  const router = useRouter();
  const [modo, setModo] = useState<"link" | "senha">("link");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(erroInicial ?? "");
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const supabase = criarClienteNavegador();
    try {
      if (modo === "link") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: `${window.location.origin}/auth/confirmar` },
        });
        if (error) throw error;
        setEnviado(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
        if (error) throw error;
        await supabase.rpc("aceitar_meus_convites");
        router.replace("/inicio");
        router.refresh();
      }
    } catch (err) {
      setErro(traduzirErro(err instanceof Error ? err.message : String(err)));
    } finally {
      setCarregando(false);
    }
  }

  if (enviado) {
    return (
      <div className="text-center">
        <p className="font-titulo text-2xl">Confira seu e-mail</p>
        <p className="mt-2 text-sm text-suave">
          Enviamos um link de acesso para <strong className="text-texto">{email}</strong>. Abra o e-mail e toque no
          link para entrar. Se não encontrar, olhe na caixa de spam.
        </p>
        <button className="botao-secundario mt-5" onClick={() => setEnviado(false)}>
          Usar outro e-mail
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-lg bg-superficie-2 p-1 text-sm">
        {(["link", "senha"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className={`rounded-md py-1.5 transition ${modo === m ? "bg-superficie font-medium shadow-sm" : "text-suave"}`}
          >
            {m === "link" ? "Link por e-mail" : "Senha"}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
        />
      </div>

      {modo === "senha" && (
        <div>
          <label htmlFor="senha" className="rotulo">Senha</label>
          <input
            id="senha"
            type="password"
            required
            autoComplete="current-password"
            className="campo"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <p className="mt-1 text-xs text-suave">
            Ainda não tem senha? Entre pelo link por e-mail e crie uma em Configurações.
          </p>
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <button className="botao w-full" disabled={carregando}>
        {carregando ? "Aguarde…" : modo === "link" ? "Receber link de acesso" : "Entrar"}
      </button>
    </form>
  );
}
