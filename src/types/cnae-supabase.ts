// Tipos baseados nas tabelas do Supabase usadas no index.html

export interface CNAEItemLC {
  cnae: number;
  cnae_mascara: string;
  cnae_descricao: string;
  item_lc: string;
  grau_risco: 'ALTO' | 'MEDIO' | 'BAIXO' | null;
}

export interface ItemListaServicos {
  item_lc: string;
  descricao: string;
}

export interface ItemLCIBSCBS {
  item_lc: string;
  nbs: string | null;
  nbs_descricao: string | null;
  indop: string | null;
  local_incidencia_ibs: string | null;
  c_class_trib: string | null;
  c_class_trib_nome: string | null;
}

export type GrauRisco = 'ALTO' | 'MEDIO' | 'BAIXO' | null;

export interface RiscoExplicacao {
  titulo: string;
  classe: string;
  itens: {
    tipo: 'check' | 'x';
    texto: string;
  }[];
}
