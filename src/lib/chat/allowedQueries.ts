/**
 * Consultas permitidas para o chatbot
 * Atualizado com base no schema real do Supabase via MCP
 */

import { supabase } from '../supabase';

export type QueryId =
  | 'cnae_to_item'
  | 'item_to_details'
  | 'search_text'
  | 'cnae_details'
  | 'search_by_risk'
  | 'item_to_nbs'
  | 'cnae_full_info'
  | 'cnae_by_mascara'
  | 'search_nbs'
  | 'list_items_by_group';

export interface QueryParams {
  cnae?: string;
  cnae_mascara?: string;
  item_lc?: string;
  q?: string;
  grau_risco?: 'ALTO' | 'MEDIO' | 'MÉDIO' | 'BAIXO';
  group?: string;
  limit?: number;
}

export interface QueryResult {
  success: boolean;
  data?: any[] | any;
  error?: string;
  summary?: string;
}

/**
 * Normaliza o grau de risco para o formato do banco (com acento)
 */
function normalizeRisco(risco: string): string {
  const upper = risco.toUpperCase().trim();
  if (upper === 'MEDIO') return 'MÉDIO';
  return upper;
}

/**
 * Mapa de consultas permitidas baseado no schema real:
 * - cnae_item_lc (1733 rows): cnae, cnae_mascara, cnae_descricao, item_lc, grau_risco
 * - itens_lista_servicos (200 rows): item_lc, descricao
 * - item_lc_ibs_cbs (1742 rows): item_lc, nbs, nbs_descricao, indop, local_incidencia_ibs, cclass_trib, nome_cclass_trib
 */
export const allowedQueries = {
  /**
   * Consulta CNAE -> Item LC + Risco
   */
  cnae_to_item: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.cnae) {
      return { success: false, error: 'CNAE não fornecido' };
    }

    try {
      const cleanCnae = params.cnae.replace(/[^\d]/g, '');

      const { data, error } = await supabase
        .from('cnae_item_lc')
        .select(`
          cnae,
          cnae_mascara,
          cnae_descricao,
          item_lc,
          grau_risco,
          itens_lista_servicos (
            item_lc,
            descricao
          )
        `)
        .eq('cnae', cleanCnae)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei o CNAE ${params.cnae} na base de dados.`
        };
      }

      return {
        success: true,
        data,
        summary: `Encontrei ${data.length} resultado(s) para o CNAE ${params.cnae}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao consultar CNAE'
      };
    }
  },

  /**
   * Consulta detalhes do CNAE
   */
  cnae_details: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.cnae) {
      return { success: false, error: 'CNAE não fornecido' };
    }

    try {
      const cleanCnae = params.cnae.replace(/[^\d]/g, '');

      const { data, error } = await supabase
        .from('cnae_item_lc')
        .select('cnae, cnae_mascara, cnae_descricao, item_lc, grau_risco')
        .eq('cnae', cleanCnae)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei o CNAE ${params.cnae} na base de dados.`
        };
      }

      return {
        success: true,
        data,
        summary: `Informações do CNAE ${params.cnae}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao consultar CNAE'
      };
    }
  },

  /**
   * Consulta Item LC -> Detalhes básicos
   */
  item_to_details: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.item_lc) {
      return { success: false, error: 'Item LC não fornecido' };
    }

    try {
      const { data, error } = await supabase
        .from('itens_lista_servicos')
        .select('item_lc, descricao')
        .eq('item_lc', params.item_lc)
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei o item ${params.item_lc} na base de dados.`
        };
      }

      return {
        success: true,
        data,
        summary: `Detalhes do item ${params.item_lc}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao consultar item'
      };
    }
  },

  /**
   * Consulta Item LC -> NBS/IBS/CBS completo
   * Retorna: NBS, INDOP, Local de Incidência do IBS, Classificação Tributária
   */
  item_to_nbs: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.item_lc) {
      return { success: false, error: 'Item LC não fornecido' };
    }

    try {
      const { data, error } = await supabase
        .from('item_lc_ibs_cbs')
        .select(`
          item_lc,
          nbs,
          nbs_descricao,
          ps_onerosa,
          adq_exterior,
          indop,
          local_incidencia_ibs,
          cclass_trib,
          nome_cclass_trib
        `)
        .eq('item_lc', params.item_lc)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei dados de NBS/IBS/CBS para o item ${params.item_lc}.`
        };
      }

      return {
        success: true,
        data,
        summary: `Dados completos de NBS/IBS/CBS do item ${params.item_lc}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao consultar NBS/IBS/CBS'
      };
    }
  },

  /**
   * Busca por texto livre
   */
  search_text: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.q) {
      return { success: false, error: 'Termo de busca não fornecido' };
    }

    try {
      const searchTerm = `%${params.q}%`;

      // Buscar em itens_lista_servicos
      const { data: itemsData, error: itemsError } = await supabase
        .from('itens_lista_servicos')
        .select('item_lc, descricao')
        .ilike('descricao', searchTerm)
        .limit(10);

      if (itemsError) throw itemsError;

      // Buscar em cnae_item_lc
      const { data: cnaeData, error: cnaeError } = await supabase
        .from('cnae_item_lc')
        .select('cnae, cnae_mascara, cnae_descricao, item_lc, grau_risco')
        .or(`cnae_descricao.ilike.${searchTerm}`)
        .limit(10);

      if (cnaeError) throw cnaeError;

      const totalResults = (itemsData?.length || 0) + (cnaeData?.length || 0);

      if (totalResults === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei resultados para "${params.q}".`
        };
      }

      return {
        success: true,
        data: {
          items: itemsData || [],
          cnaes: cnaeData || []
        },
        summary: `Encontrei ${totalResults} resultado(s) para "${params.q}".`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar'
      };
    }
  },

  /**
   * Busca CNAEs por grau de risco
   * Corrigido: normaliza MEDIO -> MÉDIO (banco usa acento)
   */
  search_by_risk: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.grau_risco) {
      return { success: false, error: 'Grau de risco não fornecido' };
    }

    try {
      const riscoNormalizado = normalizeRisco(params.grau_risco);

      const { data, error } = await supabase
        .from('cnae_item_lc')
        .select('cnae, cnae_mascara, cnae_descricao, item_lc, grau_risco')
        .eq('grau_risco', riscoNormalizado)
        .limit(params.limit || 20);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei CNAEs com grau de risco ${params.grau_risco}.`
        };
      }

      return {
        success: true,
        data,
        summary: `Encontrei ${data.length} CNAE(s) com grau de risco ${riscoNormalizado}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar por grau de risco'
      };
    }
  },

  /**
   * CNAE completo: Item LC + Risco + NBS/IBS/CBS (tudo junto)
   * Para quando o usuário quer TODAS as informações de um CNAE
   */
  cnae_full_info: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.cnae) {
      return { success: false, error: 'CNAE não fornecido' };
    }

    try {
      const cleanCnae = params.cnae.replace(/[^\d]/g, '');

      // 1. Buscar CNAE -> Item LC + Risco
      const { data: cnaeData, error: cnaeError } = await supabase
        .from('cnae_item_lc')
        .select(`
          cnae,
          cnae_mascara,
          cnae_descricao,
          item_lc,
          grau_risco,
          itens_lista_servicos (
            item_lc,
            descricao
          )
        `)
        .eq('cnae', cleanCnae)
        .limit(5);

      if (cnaeError) throw cnaeError;

      if (!cnaeData || cnaeData.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei o CNAE ${params.cnae} na base de dados.`
        };
      }

      // 2. Para cada item_lc encontrado, buscar NBS/IBS/CBS
      const itemLcs = [...new Set(cnaeData.map((c: any) => c.item_lc).filter(Boolean))];

      let nbsData: any[] = [];
      if (itemLcs.length > 0) {
        const { data: nbs, error: nbsError } = await supabase
          .from('item_lc_ibs_cbs')
          .select(`
            item_lc,
            nbs,
            nbs_descricao,
            ps_onerosa,
            adq_exterior,
            indop,
            local_incidencia_ibs,
            cclass_trib,
            nome_cclass_trib
          `)
          .in('item_lc', itemLcs)
          .limit(20);

        if (!nbsError && nbs) {
          nbsData = nbs;
        }
      }

      return {
        success: true,
        data: {
          cnae: cnaeData,
          nbs_ibs_cbs: nbsData
        },
        summary: `Informações completas do CNAE ${params.cnae}: ${cnaeData.length} registro(s) CNAE e ${nbsData.length} código(s) NBS/IBS/CBS.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao consultar informações completas do CNAE'
      };
    }
  },

  /**
   * Busca CNAE pela máscara formatada (ex: 6920-6/01)
   */
  cnae_by_mascara: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.cnae_mascara) {
      return { success: false, error: 'Máscara do CNAE não fornecida' };
    }

    try {
      const searchMask = `%${params.cnae_mascara}%`;

      const { data, error } = await supabase
        .from('cnae_item_lc')
        .select(`
          cnae,
          cnae_mascara,
          cnae_descricao,
          item_lc,
          grau_risco,
          itens_lista_servicos (
            item_lc,
            descricao
          )
        `)
        .ilike('cnae_mascara', searchMask)
        .limit(10);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei CNAEs com a máscara "${params.cnae_mascara}".`
        };
      }

      return {
        success: true,
        data,
        summary: `Encontrei ${data.length} CNAE(s) para a máscara "${params.cnae_mascara}".`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar CNAE por máscara'
      };
    }
  },

  /**
   * Busca NBS por texto/descrição
   */
  search_nbs: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.q) {
      return { success: false, error: 'Termo de busca não fornecido' };
    }

    try {
      const searchTerm = `%${params.q}%`;

      const { data, error } = await supabase
        .from('item_lc_ibs_cbs')
        .select(`
          item_lc,
          nbs,
          nbs_descricao,
          ps_onerosa,
          adq_exterior,
          indop,
          local_incidencia_ibs,
          cclass_trib,
          nome_cclass_trib
        `)
        .ilike('nbs_descricao', searchTerm)
        .limit(15);

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei códigos NBS relacionados a "${params.q}".`
        };
      }

      return {
        success: true,
        data,
        summary: `Encontrei ${data.length} código(s) NBS relacionados a "${params.q}".`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar NBS'
      };
    }
  },

  /**
   * Lista itens LC de um grupo (ex: todos de 17.XX)
   */
  list_items_by_group: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.group) {
      return { success: false, error: 'Grupo não fornecido' };
    }

    try {
      const groupNum = params.group.replace(/[^\d]/g, '');
      const groupStart = parseFloat(groupNum);
      const groupEnd = groupStart + 1;

      const { data, error } = await supabase
        .from('itens_lista_servicos')
        .select('item_lc, descricao')
        .gte('item_lc', groupStart)
        .lt('item_lc', groupEnd)
        .order('item_lc', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          success: true,
          data: [],
          summary: `Não encontrei itens no grupo ${params.group}.`
        };
      }

      return {
        success: true,
        data,
        summary: `Encontrei ${data.length} item(ns) no grupo ${params.group}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao listar itens do grupo'
      };
    }
  }
};

/**
 * Executa uma consulta permitida
 */
export async function executeQuery(queryId: QueryId, params: QueryParams): Promise<QueryResult> {
  const queryFn = allowedQueries[queryId];

  if (!queryFn) {
    return {
      success: false,
      error: `Consulta não permitida: ${queryId}`
    };
  }

  return await queryFn(params);
}
