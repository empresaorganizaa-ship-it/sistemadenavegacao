import { notFound } from "next/navigation";
import { encontrarItem } from "@/lib/navegacao";
import { EmBreve } from "@/components/ui";

// Páginas dos módulos que ainda serão construídos nas próximas fases.
export default async function PaginaEmBreve({ params }: { params: Promise<{ secao: string; pagina: string }> }) {
  const { secao, pagina } = await params;
  const item = encontrarItem(`/${secao}/${pagina}`);
  if (!item) notFound();
  return <EmBreve titulo={item.titulo} grupo={item.grupo} fase={item.fase} />;
}
