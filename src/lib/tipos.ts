export type Papel = "consultora" | "cliente";
export type StatusWorkspace = "em_acompanhamento" | "acompanhamento_encerrado";

export type Workspace = {
  id: string;
  nome: string;
  status: StatusWorkspace;
  cor_destaque: string;
  logo_path: string | null;
  ano_ativo: number;
};

export type Perfil = { id: string; nome: string; email: string };

export type Auditoria = {
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
};

export type MetaCiclo = Auditoria & {
  id: string;
  workspace_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  valor: number;
  ativo: boolean;
};

export type MetaMes = Auditoria & {
  id: string;
  ciclo_id: string;
  mes: string;
  valor: number;
};

export type OrigemLead = { id: string; nome: string; ordem: number; ativo: boolean };
