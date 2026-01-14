'use client';

import { IBGECnaeResponse } from '@/types/ibge';

interface CNAECardProps {
  data: IBGECnaeResponse;
}

export default function CNAECard({ data }: CNAECardProps) {
  // Formatar o ID do CNAE para exibição (ex: 86305 -> 8630-5)
  const formatCnaeId = (id: string) => {
    if (id.length === 5) {
      return `${id.slice(0, 4)}-${id.slice(4)}`;
    }
    return id;
  };

  // Processar observações para separar em categorias
  const parseObservacoes = (obs: string[]) => {
    const categorized: { title: string; items: string[] }[] = [];
    
    obs.forEach((observacao) => {
      // Detectar o tipo de observação
      if (observacao.startsWith('Esta classe compreende ainda')) {
        const content = observacao.replace('Esta classe compreende ainda - ', '').replace('Esta classe compreende ainda', '');
        categorized.push({
          title: '📌 Esta classe também compreende',
          items: content.split('\r\n- ').map(item => item.replace(/^- /, '').trim()).filter(Boolean)
        });
      } else if (observacao.startsWith('Esta classe NÃO compreende')) {
        const content = observacao.replace('Esta classe NÃO compreende - ', '').replace('Esta classe NÃO compreende', '');
        categorized.push({
          title: '🚫 Esta classe NÃO compreende',
          items: content.split('\r\n- ').map(item => item.replace(/^- /, '').trim()).filter(Boolean)
        });
      } else if (observacao.startsWith('Esta classe compreende')) {
        const content = observacao.replace('Esta classe compreende - ', '').replace('Esta classe compreende', '');
        categorized.push({
          title: '✅ Esta classe compreende',
          items: content.split('\r\n- ').map(item => item.replace(/^- /, '').trim()).filter(Boolean)
        });
      } else {
        categorized.push({
          title: '📋 Observações',
          items: [observacao]
        });
      }
    });

    return categorized;
  };

  const observacoesCategorized = parseObservacoes(data.observacoes);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header com código CNAE */}
      <div className="bg-gradient-to-r from-pv-blue-900 to-pv-blue-700 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-pv-blue-200 text-xs font-semibold uppercase tracking-wider">
              Código CNAE
            </span>
            <h2 className="text-2xl font-bold text-white">
              {formatCnaeId(data.id)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-medium">
              Seção {data.grupo.divisao.secao.id}
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-medium">
              Divisão {data.grupo.divisao.id}
            </span>
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-medium">
              Grupo {data.grupo.id}
            </span>
          </div>
        </div>
      </div>

      {/* Descrição principal */}
      <div className="px-6 py-4 bg-pv-blue-50 border-b border-pv-blue-100">
        <h3 className="text-lg font-bold text-pv-blue-900">
          {data.descricao}
        </h3>
      </div>

      {/* Hierarquia CNAE */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          📊 Hierarquia da Classificação
        </h4>
        <div className="space-y-2">
          {/* Seção */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-amber-50 to-transparent rounded-lg border-l-4 border-amber-400">
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">
              Seção {data.grupo.divisao.secao.id}
            </span>
            <span className="text-gray-700 text-sm">
              {data.grupo.divisao.secao.descricao}
            </span>
          </div>
          
          {/* Divisão */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-transparent rounded-lg border-l-4 border-blue-400 ml-4">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">
              Divisão {data.grupo.divisao.id}
            </span>
            <span className="text-gray-700 text-sm">
              {data.grupo.divisao.descricao}
            </span>
          </div>
          
          {/* Grupo */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-transparent rounded-lg border-l-4 border-purple-400 ml-8">
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">
              Grupo {data.grupo.id}
            </span>
            <span className="text-gray-700 text-sm">
              {data.grupo.descricao}
            </span>
          </div>
          
          {/* Classe (atual) */}
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50 to-transparent rounded-lg border-l-4 border-green-500 ml-12">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold shrink-0">
              Classe {formatCnaeId(data.id)}
            </span>
            <span className="text-gray-700 text-sm font-medium">
              {data.descricao}
            </span>
          </div>
        </div>
      </div>

      {/* Observações */}
      {observacoesCategorized.length > 0 && (
        <div className="px-6 py-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            📝 Detalhamento da Atividade
          </h4>
          <div className="space-y-4">
            {observacoesCategorized.map((categoria, idx) => (
              <details 
                key={idx} 
                className="group bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                open={idx === 0}
              >
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="font-semibold text-gray-800">
                    {categoria.title}
                  </span>
                  <svg 
                    className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-4 pb-4">
                  <ul className="space-y-2">
                    {categoria.items.map((item, itemIdx) => (
                      <li 
                        key={itemIdx} 
                        className={`
                          flex items-start gap-2 text-sm p-2 rounded-lg
                          ${categoria.title.includes('NÃO') 
                            ? 'bg-red-50 text-red-800 border border-red-100' 
                            : categoria.title.includes('também')
                              ? 'bg-amber-50 text-amber-800 border border-amber-100'
                              : 'bg-green-50 text-green-800 border border-green-100'
                          }
                        `}
                      >
                        <span className="mt-0.5">
                          {categoria.title.includes('NÃO') ? '✗' : '•'}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Footer com fonte */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          Fonte: IBGE - Classificação Nacional de Atividades Econômicas (CNAE 2.0)
        </p>
      </div>
    </div>
  );
}
