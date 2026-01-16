/**
 * Consultas permitidas para o chatbot
 * Atualizado com base no schema real do Supabase via MCP
 */

import { supabase } from '../supabase';

export type QueryId = 'cnae_to_item' | 'item_to_details' | 'search_text' | 'cnae_details' | 'search_by_risk' | 'item_to_nbs';

export interface QueryParams {
  cnae?: string;
  cnae_mascara?: string;
  item_lc?: string;
  q?: string;
  grau_risco?: 'ALTO' | 'MEDIO' | 'BAIXO';
  limit?: number;
}

export interface QueryResult {
  success: boolean;
  data?: any[] | any;
  error?: string;
  summary?: string;
}

/**
 * Mapa de consultas permitidas baseado no schema real:
 * - cnae_item_lc (1733 rows): cnae, cnae_mascara, cnae_descricao, item_lc, grau_risco
 * - itens_lista_servicos (200 rows): item_lc, descricao
 * - item_lc_ibs_cbs (1739 rows): item_lc, nbs, nbs_descricao, indop, local_incidencia_ibs, cclass_trib, nome_cclass_trib
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
   * Novo: baseado no schema real (campo grau_risco em cnae_item_lc)
   */
  search_by_risk: async (params: QueryParams): Promise<QueryResult> => {
    if (!params.grau_risco) {
      return { success: false, error: 'Grau de risco não fornecido' };
    }

    try {
      const { data, error } = await supabase
        .from('cnae_item_lc')
        .select('cnae, cnae_mascara, cnae_descricao, item_lc, grau_risco')
        .eq('grau_risco', params.grau_risco)
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
        summary: `Encontrei ${data.length} CNAE(s) com grau de risco ${params.grau_risco}.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao buscar por grau de risco'
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
