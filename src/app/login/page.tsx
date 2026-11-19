import { FormularioLogin } from "./formulario";

export const metadata = { title: "Entrar · Acompanhamento Comercial" };

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl">Acompanhamento Comercial</h1>
          <p className="mt-2 text-sm text-suave">Entre para acessar o seu espaço.</p>
        </div>
        <div className="cartao">
          <FormularioLogin erroInicial={erro === "link" ? "Este link de acesso expirou ou já foi usado. Peça um novo." : undefined} />
        </div>
      </div>
    </main>
  );
}
