export interface IBGESecao {
  id: string;
  descricao: string;
}

export interface IBGEDivisao {
  id: string;
  descricao: string;
  secao: IBGESecao;
}

export interface IBGEGrupo {
  id: string;
  descricao: string;
  divisao: IBGEDivisao;
}

export interface IBGECnaeResponse {
  id: string;
  descricao: string;
  grupo: IBGEGrupo;
  observacoes: string[];
}
