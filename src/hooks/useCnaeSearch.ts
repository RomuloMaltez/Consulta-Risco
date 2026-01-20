import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface CNAEItemSupabase {
  id: number;
  cnae: number;
  cnae_mascara: string;
  cnae_descricao: string;
  item_lc: string | null;
  grau_risco: 'ALTO' | 'MÉDIO' | 'BAIXO' | null;
}

export interface CNAECounts {
  alto: number;
  medio: number;
  baixo: number;
}

export function useCnaeSearch() {
  const [results, setResults] = useState<CNAEItemSupabase[]>([]);
  const [counts, setCounts] = useState<CNAECounts>({ alto: 0, medio: 0, baixo: 0 });
  const [loading, setLoading] = useState(false);
  const [countsLoading, setCountsLoading] = useState(true);

  // Buscar contagem por grau de risco ao carregar
  useEffect(() => {
    async function fetchCounts() {
      try {
        const [altoRes, medioRes, baixoRes] = await Promise.all([
          supabase
            .from('cnae_item_lc')
            .select('*', { count: 'exact', head: true })
            .eq('grau_risco', 'ALTO'),
          supabase
            .from('cnae_item_lc')
            .select('*', { count: 'exact', head: true })
            .eq('grau_risco', 'MÉDIO'),
          supabase
            .from('cnae_item_lc')
            .select('*', { count: 'exact', head: true })
            .eq('grau_risco', 'BAIXO'),
        ]);

        setCounts({
          alto: altoRes.count || 0,
          medio: medioRes.count || 0,
          baixo: baixoRes.count || 0,
        });
      } catch (error) {
        console.error('Erro ao buscar contagens:', error);
      } finally {
        setCountsLoading(false);
      }
    }

    fetchCounts();
  }, []);

  // Remove acentos de uma string
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Função de busca
  const buscar = useCallback(async (termo: string) => {
    if (!termo || termo.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Busca por CNAE (código ou máscara) ou por descrição
      const termoLimpo = termo.trim();
      const termoSemAcento = removeAccents(termoLimpo).toLowerCase();

      // Verifica se é busca por código numérico ou máscara
      const isCodigoBusca = /^[\d\-\/]+$/.test(termoLimpo);

      if (isCodigoBusca) {
        // Busca por código CNAE ou máscara
        const { data, error } = await supabase
          .from('cnae_item_lc')
          .select('*')
          .or(`cnae_mascara.ilike.%${termoLimpo}%,cnae.eq.${termoLimpo.replace(/\D/g, '') || 0}`)
          .order('cnae_mascara')
          .limit(50);

        if (error) {
          console.error('Erro na busca:', error);
          setResults([]);
          return;
        }

        setResults(data || []);
      } else {
        // Busca por descrição usando RPC com unaccent (se disponível) ou busca local
        // Primeiro tenta buscar todos os registros que podem corresponder
        const { data, error } = await supabase
          .rpc('search_cnae_unaccent', { search_term: termoSemAcento })
          .order('cnae_mascara')
          .limit(50);

        if (error) {
          // Se a função RPC não existir, faz busca simples com ilike
          console.warn('Função RPC não encontrada, usando busca simples:', error.message);

          const { data: dataFallback, error: errorFallback } = await supabase
            .from('cnae_item_lc')
            .select('*')
            .ilike('cnae_descricao', `%${termoLimpo}%`)
            .order('cnae_mascara')
            .limit(50);

          if (errorFallback) {
            console.error('Erro na busca fallback:', errorFallback);
            setResults([]);
            return;
          }

          setResults(dataFallback || []);
          return;
        }

        setResults(data || []);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar todos de um tipo específico de risco
  const buscarPorRisco = useCallback(async (risco: 'ALTO' | 'MÉDIO' | 'BAIXO') => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('cnae_item_lc')
        .select('*')
        .eq('grau_risco', risco)
        .order('cnae_mascara');

      if (error) {
        console.error('Erro na busca por risco:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro na busca por risco:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    counts,
    loading,
    countsLoading,
    buscar,
    buscarPorRisco,
    setResults,
  };
}
