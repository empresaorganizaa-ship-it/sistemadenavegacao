import {
  BarChart3, Briefcase, HeartHandshake, Home, Megaphone, Settings, Target, type LucideProps,
} from "lucide-react";

const MAPA = {
  inicio: Home,
  metas: Target,
  metricas: BarChart3,
  marketing: Megaphone,
  comercial: Briefcase,
  posvenda: HeartHandshake,
  configuracoes: Settings,
} as const;

export function IconeMenu({ nome, ...props }: { nome: string } & LucideProps) {
  const Icone = MAPA[nome as keyof typeof MAPA] ?? Home;
  return <Icone aria-hidden {...props} />;
}
