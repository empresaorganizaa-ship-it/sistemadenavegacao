import Image from "next/image";
import { FormularioLogin } from "./formulario";
import { MARCA } from "@/lib/marca";

export const metadata = { title: "Entrar" };

function Capa({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-destaque text-sobre-destaque ${compacta ? "h-64" : "h-full"}`}>
      {MARCA.fotoCapa && (
        <Image src={MARCA.fotoCapa} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      )}
      {/* camada vermelha por cima da foto para o texto branco ter contraste */}
      <div
        className={`absolute inset-0 ${MARCA.fotoCapa ? "bg-gradient-to-t from-destaque via-destaque/60 to-destaque/10" : ""}`}
      />
      <div className={`relative flex h-full flex-col justify-end ${compacta ? "p-6" : "p-12"}`}>
        {MARCA.logoClaro && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={MARCA.logoClaro} alt={MARCA.nome} className={`${compacta ? "mb-4 h-14" : "mb-8 h-28"} w-auto self-start`} />
        )}
        <h1 className={`${compacta ? "text-3xl" : "text-5xl"} leading-tight text-sobre-destaque`}>{MARCA.nome}</h1>
        <p className={`mt-2 max-w-md text-sobre-destaque/85 ${compacta ? "text-sm" : "text-base"}`}>{MARCA.frase}</p>
      </div>
    </div>
  );
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="hidden lg:block">
        <Capa />
      </div>
      <div className="lg:hidden">
        <Capa compacta />
      </div>
      <div className="flex items-start justify-center px-4 py-10 lg:items-center">
        <div className="w-full max-w-sm">
          <h2 className="mb-1 text-3xl">Entrar</h2>
          <p className="mb-6 text-sm text-suave">Acesse o seu espaço de acompanhamento.</p>
          <div className="cartao">
            <FormularioLogin
              erroInicial={erro === "link" ? "Este link de acesso expirou ou já foi usado. Peça um novo." : undefined}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
