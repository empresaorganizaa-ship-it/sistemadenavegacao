export const CAMPOS_MKT = [
  { chave: "seguidores_total", rotulo: "Seguidores (total)" },
  { chave: "seguidores_ganhos", rotulo: "Seguidores ganhos" },
  { chave: "alcance", rotulo: "Alcance" },
  { chave: "visualizacoes", rotulo: "Visualizações" },
  { chave: "engajamento", rotulo: "Engajamento (interações)" },
  { chave: "visitas_perfil", rotulo: "Visitas ao perfil" },
  { chave: "cliques_link", rotulo: "Cliques no link" },
  { chave: "dms", rotulo: "DMs recebidas" },
  { chave: "leads_instagram", rotulo: "Leads do Instagram" },
] as const;
export type CampoMkt = (typeof CAMPOS_MKT)[number]["chave"];
