'use client';

import { useState } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Navigation from '@/components/Navigation/Navigation';
import CNAECard from '@/components/CNAECard/CNAECard';
import { IBGECnaeResponse } from '@/types/ibge';

export default function ConsultaIBGE() {
  const [cnaeInput, setCnaeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IBGECnaeResponse | null>(null);
  const [history, setHistory] = useState<IBGECnaeResponse[]>([]);

  // Formatar input do CNAE (remover traço e espaços)
  const formatCnaeInput = (input: string) => {
    return input.replace(/[-\s\/]/g, '');
  };

  // Consultar API do IBGE
  const fetchCNAE = async (codigo: string) => {
    const formattedCode = formatCnaeInput(codigo);
    
    if (!formattedCode || formattedCode.length < 4) {
      setError('Digite um código CNAE válido (mínimo 4 dígitos)');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Formatar o código para a API (ex: 86305 -> 8630-5)
      let apiCode = formattedCode;
      if (formattedCode.length === 5) {
        apiCode = `${formattedCode.slice(0, 4)}-${formattedCode.slice(4)}`;
      } else if (formattedCode.length === 4) {
        apiCode = formattedCode;
      }

      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v2/cnae/classes/${apiCode}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Código CNAE não encontrado. Verifique se o código está correto.');
        }
        throw new Error('Erro ao consultar a API do IBGE. Tente novamente.');
      }

      const data: IBGECnaeResponse = await response.json();
      setResult(data);
      
      // Adicionar ao histórico se não existir
      if (!history.find(h => h.id === data.id)) {
        setHistory(prev => [data, ...prev].slice(0, 5));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCNAE(cnaeInput);
  };

  const handleHistoryClick = (item: IBGECnaeResponse) => {
    setResult(item);
    setCnaeInput(item.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-pv-gray-100">
      <Header />
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-pv-blue-900 mb-2">
            🔍 Consulta CNAE - API IBGE
          </h1>
          <p className="text-gray-600">
            Consulte informações detalhadas sobre qualquer código CNAE diretamente na base oficial do IBGE
          </p>
        </div>

        {/* Formulário de busca */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cnae" className="block text-sm font-semibold text-gray-700 mb-2">
                Código CNAE
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7h-3a2 2 0 0 1-2-2V2"/>
                      <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/>
                      <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    id="cnae"
                    value={cnaeInput}
                    onChange={(e) => setCnaeInput(e.target.value)}
                    placeholder="Ex: 8630-5, 86305, 4711-3/02"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pv-blue-500 focus:ring-2 focus:ring-pv-blue-200 outline-none transition-all text-gray-800"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-pv-blue-900 hover:bg-pv-blue-800 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.3-4.3"/>
                      </svg>
                      <span>Consultar</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                💡 Digite o código CNAE com ou sem traços. Exemplos: 8630-5, 86305, 4711-3/02
              </p>
            </div>
          </form>

          {/* Exemplos rápidos */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">🚀 Exemplos rápidos:</p>
            <div className="flex flex-wrap gap-2">
              {['8630-5', '4711-3', '6201-5', '4723-7', '5611-2'].map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    setCnaeInput(code);
                    fetchCNAE(code);
                  }}
                  className="px-3 py-1.5 text-xs bg-pv-blue-50 hover:bg-pv-blue-100 text-pv-blue-700 rounded-lg transition-colors font-medium"
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Histórico de consultas */}
        {history.length > 0 && !result && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              📜 Últimas consultas
            </h3>
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-pv-blue-50 rounded-lg transition-colors border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-pv-blue-900">
                        {item.id.length === 5 ? `${item.id.slice(0, 4)}-${item.id.slice(4)}` : item.id}
                      </span>
                      <span className="text-gray-600 ml-2 text-sm">
                        {item.descricao.length > 50 ? item.descricao.slice(0, 50) + '...' : item.descricao}
                      </span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <span className="text-red-500 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" x2="12" y1="8" y2="12"/>
                <line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
            </span>
            <div>
              <h4 className="font-semibold text-red-800">Erro na consulta</h4>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-pv-blue-100 rounded-full mb-4">
              <svg className="animate-spin h-8 w-8 text-pv-blue-900" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Consultando API do IBGE...</p>
          </div>
        )}

        {/* Resultado */}
        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">
                ✅ Resultado da Consulta
              </h3>
              <button
                onClick={() => setResult(null)}
                className="text-sm text-pv-blue-600 hover:text-pv-blue-800 font-medium flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
                Nova consulta
              </button>
            </div>
            <CNAECard data={result} />
          </div>
        )}

        {/* Estado inicial */}
        {!result && !loading && !error && history.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pv-blue-100 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pv-blue-900">
                <path d="M20 7h-3a2 2 0 0 1-2-2V2"/>
                <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z"/>
                <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8"/>
                <circle cx="14" cy="11" r="3"/>
                <path d="m18 15-2.5-2.5"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-pv-blue-900 mb-2">
              Consulte qualquer código CNAE
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Digite um código CNAE no campo acima para obter informações detalhadas diretamente 
              da base oficial do IBGE, incluindo descrição, hierarquia e observações.
            </p>
          </div>
        )}

        {/* Informações adicionais */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </span>
            <div>
              <h4 className="font-semibold text-amber-800">Sobre esta consulta</h4>
              <p className="text-amber-700 text-sm">
                Os dados são obtidos diretamente da API oficial do IBGE ({' '}
                <a 
                  href="https://servicodados.ibge.gov.br/api/v2/cnae/classes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-900"
                >
                  servicodados.ibge.gov.br
                </a>
                ). A CNAE 2.0 é a classificação oficial adotada pelo sistema estatístico nacional 
                e pelos órgãos gestores de cadastros e registros da Administração Pública.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
