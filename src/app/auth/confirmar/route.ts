import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";

// O link do e-mail de acesso chega aqui. Aceita os dois formatos do Supabase:
//  - ?token_hash=...&type=email  (recomendado: funciona mesmo abrindo o e-mail em outro aparelho)
//  - ?code=...                   (padrão do Supabase)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  // Volta para o mesmo endereço em que o link foi aberto (para não perder o login)
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : request.nextUrl.origin;
  const ir = (caminho: string) => NextResponse.redirect(new URL(caminho, base));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await criarClienteServidor();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) return ir("/login?erro=link");

  await supabase.rpc("aceitar_meus_convites");
  return ir("/inicio");
}
