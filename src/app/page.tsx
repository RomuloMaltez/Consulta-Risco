"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import SearchModal from "@/components/SearchModal/SearchModal";
import Navigation from "@/components/Navigation/Navigation";
import { parseData, normalizarTexto, obterInfoRisco, CNAEItem } from "@/data/cnae-data";
import { DADOS_ALTO_RISCO, DADOS_MEDIO_RISCO, DADOS_BAIXO_RISCO } from "@/data/cnae-raw";

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<CNAEItem[]>([]);
  const [modalTipo, setModalTipo] = useState<"baixo" | "medio" | "alto" | null>(null);

  const altoRisco = useMemo(() => parseData(DADOS_ALTO_RISCO).map((item) => ({ ...item, risco: "alto" as const })), []);
  const medioRisco = useMemo(() => parseData(DADOS_MEDIO_RISCO).map((item) => ({ ...item, risco: "medio" as const })), []);
  const baixoRisco = useMemo(() => parseData(DADOS_BAIXO_RISCO).map((item) => ({ ...item, risco: "baixo" as const })), []);

  const buscar = useCallback(
    (termo: string) => {
      if (!termo || termo.length < 2) {
        setResults([]);
        return;
      }

      const termoNorm = normalizarTexto(termo);
      const resultados: CNAEItem[] = [];

      [altoRisco, medioRisco, baixoRisco].forEach((dados) => {
        dados.forEach((item) => {
          if (normalizarTexto(item.cnae).includes(termoNorm) || normalizarTexto(item.atividade).includes(termoNorm)) {
            resultados.push(item);
          }
        });
      });

      setResults(resultados);
    },
    [altoRisco, medioRisco, baixoRisco]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscar(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, buscar]);

  const destacarTexto = (texto: string, termo: string): React.ReactNode => {
    if (!termo) return texto;
    
    try {
      // Escape special regex characters
      const escapedTerm = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, "gi");
      const parts = texto.split(regex);
      
      return parts.map((part, index) => {
        if (regex.test(part)) {
          return <mark key={index}>{part}</mark>;
        }
        return part;
      });
    } catch (error) {
      // If regex fails, return original text
      return texto;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-pv-gray-100">
      <Header />
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl" data-search-root>
        {/* Título */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-2 text-pv-blue-900">
            📋 Consulta CNAE - Grau de Risco
          </h1>
          <p className="text-center text-slate-600">Município de Porto Velho/RO</p>
        </div>

        {/* Cards de Risco */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
            <div className="info-card baixo" onClick={() => setModalTipo("baixo")}>
              <div className="text-5xl mb-2">🟢</div>
              <h3>Baixo Risco</h3>
              <div className="count">{baixoRisco.length}</div>
              <small className="text-slate-500">Dispensadas de licenciamento</small>
            </div>
            <div className="info-card medio" onClick={() => setModalTipo("medio")}>
              <div className="text-5xl mb-2">🟡</div>
              <h3>Médio Risco</h3>
              <div className="count">{medioRisco.length}</div>
              <small className="text-slate-500">Alvará provisório imediato</small>
            </div>
            <div className="info-card alto" onClick={() => setModalTipo("alto")}>
              <div className="text-5xl mb-2">🔴</div>
              <h3>Alto Risco</h3>
              <div className="count">{altoRisco.length}</div>
              <small className="text-slate-500">Licença prévia obrigatória</small>
            </div>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 text-2xl">🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o código CNAE ou nome da atividade..."
              autoComplete="off"
              className="w-full py-4 px-5 pl-14 text-base md:text-lg border-2 border-slate-200 rounded-xl transition-all focus:outline-none focus:border-pv-blue-900 focus:ring-4 focus:ring-pv-blue-900/10"
            />
          </div>
          <div className="text-slate-500 text-sm mt-3">
            💡 Exemplos: &quot;8630-5/02&quot;, &quot;atividade&quot;, &quot;serviço&quot;, &quot;comércio&quot;
          </div>
        </div>

        {/* Contador de Resultados */}
        {results.length > 0 && (
          <div className="text-center text-pv-blue-900 text-lg mb-5 font-semibold">
            ✨ {results.length} resultado{results.length > 1 ? "s" : ""} encontrado{results.length > 1 ? "s" : ""}
          </div>
        )}

        {/* Resultados */}
        <div>
          {searchTerm.length >= 2 && results.length === 0 && (
            <div className="text-center py-16 px-5 bg-white rounded-2xl shadow-lg text-pv-blue-900 text-lg">
              😕 Nenhum resultado encontrado.
              <br />
              Tente buscar por outro termo ou código CNAE.
            </div>
          )}

          {results.map((item, index) => {
            const infoRisco = obterInfoRisco(item.risco!);
            return (
              <div key={index} className={`result-item ${item.risco}`}>
              <div className="font-mono text-lg md:text-xl font-bold text-slate-800 mb-2">
                CNAE: {destacarTexto(item.cnae, searchTerm)}
              </div>
              <div className="text-base md:text-lg text-slate-600 mb-4 leading-relaxed">
                {destacarTexto(item.atividade, searchTerm)}
              </div>
                <span className={`result-badge ${item.risco}`}>{infoRisco.titulo}</span>
                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm md:text-base leading-relaxed">
                  <strong>{infoRisco.significado}</strong>
                  <br />
                  <br />
                  <div className="whitespace-pre-line">{infoRisco.detalhes.replace(/<br>/g, '\n').replace(/<\/?strong>/g, '')}</div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="mt-4 px-5 py-2.5 bg-pv-blue-900 text-white rounded-lg text-sm font-medium transition-all hover:bg-pv-blue-700 hover:-translate-y-0.5"
                >
                  🖨️ Imprimir Resultado
                </button>
              </div>
            );
          })}
        </div>

        {/* Aviso */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
          <p className="text-sm text-amber-800 text-center">
            ⚠️ Este sistema tem caráter informativo. Para informações oficiais, consulte os órgãos competentes.
          </p>
        </div>
        </div>
      </main>

      <Footer />

      <SearchModal tipo={modalTipo} onClose={() => setModalTipo(null)} />
    </div>
  );
}
