"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Navigation from "@/components/Navigation/Navigation";
import { supabase } from "@/lib/supabase";
import { CNAEItemLC, ItemListaServicos, ItemLCIBSCBS, GrauRisco } from "@/types/cnae-supabase";
import { ChevronDown, ShieldCheck, ShieldAlert, ShieldX, HelpCircle, X, Search, Filter, Building2, FileText, MapPin, Coins, List, Hash } from "lucide-react";

interface ContagemItens {
  total: number;
  loading: boolean;
}

// Função para corrigir encoding de caracteres especiais
function corrigirEncoding(texto: string): string {
  if (!texto) return texto;

  let resultado = texto;

  resultado = resultado.replace(/ReproduÃ§Ã£o/g, 'Reprodução');
  resultado = resultado.replace(/reproduÃ§Ã£o/g, 'reprodução');
  resultado = resultado.replace(/Ã§Ã£o/g, 'ção');
  resultado = resultado.replace(/Ã§Ãµes/g, 'ções');
  resultado = resultado.replace(/nÃ£o/g, 'não');
  resultado = resultado.replace(/Ã¡vel/g, 'ável');
  resultado = resultado.replace(/Ã¡veis/g, 'áveis');
  resultado = resultado.replace(/Ã§/g, 'ç');
  resultado = resultado.replace(/Ã¡/g, 'á');
  resultado = resultado.replace(/Ã /g, 'à');
  resultado = resultado.replace(/Ã¢/g, 'â');
  resultado = resultado.replace(/Ã£/g, 'ã');
  resultado = resultado.replace(/Ã©/g, 'é');
  resultado = resultado.replace(/Ã¨/g, 'è');
  resultado = resultado.replace(/Ãª/g, 'ê');
  resultado = resultado.replace(/Ã­/g, 'í');
  resultado = resultado.replace(/Ã¬/g, 'ì');
  resultado = resultado.replace(/Ã³/g, 'ó');
  resultado = resultado.replace(/Ã²/g, 'ò');
  resultado = resultado.replace(/Ã´/g, 'ô');
  resultado = resultado.replace(/Ãµ/g, 'õ');
  resultado = resultado.replace(/Ãº/g, 'ú');
  resultado = resultado.replace(/Ã¹/g, 'ù');
  resultado = resultado.replace(/Ã¼/g, 'ü');
  resultado = resultado.replace(/Ã‡/g, 'Ç');
  resultado = resultado.replace(/Ã/g, 'Á');
  resultado = resultado.replace(/Ã€/g, 'À');
  resultado = resultado.replace(/Ã‚/g, 'Â');
  resultado = resultado.replace(/Ãƒ/g, 'Ã');
  resultado = resultado.replace(/Ã‰/g, 'É');
  resultado = resultado.replace(/Ãˆ/g, 'È');
  resultado = resultado.replace(/ÃŠ/g, 'Ê');
  resultado = resultado.replace(/Ã/g, 'Í');
  resultado = resultado.replace(/ÃŒ/g, 'Ì');
  resultado = resultado.replace(/Ã"/g, 'Ó');
  resultado = resultado.replace(/Ã'/g, 'Ò');
  resultado = resultado.replace(/Ã"/g, 'Ô');
  resultado = resultado.replace(/Ã•/g, 'Õ');
  resultado = resultado.replace(/Ãš/g, 'Ú');
  resultado = resultado.replace(/Ã™/g, 'Ù');
  resultado = resultado.replace(/Ãœ/g, 'Ü');

  return resultado;
}

function formatarItemLcInput(valor: string): string {
  if (!/^[\d\s.,]*$/.test(valor)) {
    return valor;
  }

  const digits = valor.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

function highlightTexto(texto: string, termo: string) {
  if (!termo || termo.length < 2) return texto;

  const textoCorrigido = corrigirEncoding(texto);

  // Escape caracteres especiais do regex
  const termoEscapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${termoEscapado})`, "gi");
  const partes = textoCorrigido.split(regex);

  return partes.map((parte, index) =>
    regex.test(parte) ? (
      <mark key={index} className="bg-pv-yellow-500/35 text-pv-blue-900 font-semibold px-1 rounded-sm ring-1 ring-pv-yellow-500/40">
        {parte}
      </mark>
    ) : (
      parte
    )
  );
}

function renderizarGrauRisco(grauRisco: GrauRisco) {
  if (!grauRisco) {
    return <span className="grau-risco-badge indefinido">Não classificado</span>;
  }

  const grau = grauRisco.toUpperCase();

  switch (grau) {
    case "ALTO":
      return <span className="grau-risco-badge alto">Alto Risco</span>;
    case "MEDIO":
    case "MÉDIO":
      return <span className="grau-risco-badge medio">Médio Risco</span>;
    case "BAIXO":
      return <span className="grau-risco-badge baixo">Baixo Risco</span>;
    default:
      return <span className="grau-risco-badge indefinido">{grauRisco}</span>;
  }
}

// Tooltip Component
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  return <>{children}</>;
}

// Modal Component
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
        <div className="sticky top-0 bg-white border-b border-pv-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl font-bold text-pv-blue-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-pv-gray-100 rounded-lg transition"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Statistics Dashboard para Itens LC
interface StatisticsDashboardProps {
  contagem: ContagemItens;
  onInfoClick: () => void;
}

function StatisticsDashboard({ contagem, onInfoClick }: StatisticsDashboardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-8 border border-pv-gray-200">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-pv-blue-900">Itens de Serviço Cadastrados</h2>
          <Tooltip content="Itens da Lista de Serviços conforme Lei Complementar 116/2003">
            <button
              onClick={onInfoClick}
              className="p-1 hover:bg-pv-gray-100 rounded-full transition"
              aria-label="Mais informações"
            >
              <HelpCircle size={18} className="text-pv-blue-700" />
            </button>
          </Tooltip>
        </div>
        <p className="text-sm text-pv-blue-700/60">Lei Complementar 116/2003</p>
      </div>

      <div className="flex justify-center">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-pv-blue-50 to-pv-blue-100 border-2 border-pv-blue-300 p-6 transition-all hover:shadow-xl max-w-md w-full">
          <div className="absolute -right-4 -top-4 opacity-10">
            <List size={100} className="text-pv-blue-700" />
          </div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-pv-blue-900 rounded-xl flex items-center justify-center mb-4 shadow-lg">
              <List size={24} className="text-white" />
            </div>

            <h3 className="text-lg font-bold text-pv-blue-900 mb-1">Total de Itens LC</h3>
            <p className="text-sm text-pv-blue-900/60 mb-4">Serviços da LC 116/2003</p>

            <div className="flex items-center gap-2 mb-2">
              <div className="bg-pv-blue-900 text-white text-2xl font-bold px-4 py-2 rounded-lg shadow-md min-w-[80px] text-center">
                {contagem.loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                ) : (
                  contagem.total.toLocaleString("pt-BR")
                )}
              </div>
              <span className="text-xs text-pv-blue-900/50 font-medium">itens cadastrados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// CNAE Card Component
interface CNAECardProps {
  cnae: CNAEItemLC;
  termo: string;
}

function CNAECard({ cnae, termo }: CNAECardProps) {
  return (
    <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 hover:shadow-lg hover:border-pv-blue-400 transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/30 px-3 py-1 rounded-lg border border-pv-yellow-500/50">
              {corrigirEncoding(cnae.cnae_mascara)}
            </span>
            {renderizarGrauRisco(cnae.grau_risco)}
          </div>
          <p className="text-sm text-pv-blue-900/80 line-clamp-2">
            {highlightTexto(cnae.cnae_descricao, termo)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-pv-blue-700/60">
        <Hash size={14} />
        <span>Código: {cnae.cnae}</span>
      </div>
    </div>
  );
}

// Accordion para IBS/CBS
interface IBSCBSAccordionProps {
  ibsData: ItemLCIBSCBS[];
}

function IBSCBSAccordion({ ibsData }: IBSCBSAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const nbsUnicos = [...new Map(ibsData.filter((c) => c.nbs).map((c) => [c.nbs, c])).values()];
  const indopUnicos = [...new Map(ibsData.filter((c) => c.indop).map((c) => [c.indop, c])).values()];
  const classUnicos = [...new Map(ibsData.filter((c) => c.c_class_trib).map((c) => [c.c_class_trib, c])).values()];

  const hasDetails = nbsUnicos.length > 0 || indopUnicos.length > 0 || classUnicos.length > 0;

  if (!hasDetails) {
    return (
      <div className="text-center py-4 text-pv-blue-700/60 text-sm">
        <FileText size={24} className="mx-auto mb-2 opacity-30" />
        Sem dados de IBS/CBS cadastrados para este item.
      </div>
    );
  }

  return (
    <div className={`bg-white border-2 border-pv-gray-200 rounded-xl overflow-hidden transition-all ${isOpen ? "shadow-lg" : "hover:shadow-md"}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-pv-blue-50/50 transition gap-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Coins size={20} className="text-pv-yellow-500" />
          <span className="font-bold text-pv-blue-900">Informações IBS/CBS</span>
          <div className="flex items-center gap-1.5">
            {nbsUnicos.length > 0 && (
              <span className="text-xs bg-pv-blue-100 text-pv-blue-700 px-2 py-0.5 rounded">{nbsUnicos.length} NBS</span>
            )}
            {indopUnicos.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{indopUnicos.length} INDOP</span>
            )}
            {classUnicos.length > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{classUnicos.length} Class.</span>
            )}
          </div>
        </div>
        <div
          className={`w-8 h-8 flex items-center justify-center rounded-lg bg-pv-blue-900 text-white transition-transform shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={18} />
        </div>
      </div>

      <div className={`${isOpen ? "max-h-[2000px]" : "max-h-0"} overflow-hidden transition-all duration-300`}>
        <div className="p-4 pt-0 border-t border-pv-gray-200 bg-gradient-to-b from-pv-blue-50/30 to-white">
          {nbsUnicos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={18} className="text-pv-yellow-500" />
                <span className="text-sm font-bold text-pv-blue-900">Códigos NBS</span>
              </div>
              {nbsUnicos.map((nbs, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 bg-white rounded-xl mb-2 border border-pv-gray-200">
                  <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/20 px-3 py-1 rounded-lg shrink-0">
                    {nbs.nbs}
                  </span>
                  <span className="text-sm text-pv-blue-900/80">{nbs.nbs_descricao || "N/A"}</span>
                </div>
              ))}
            </div>
          )}

          {indopUnicos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} className="text-pv-yellow-500" />
                <span className="text-sm font-bold text-pv-blue-900">INDOP - Local de Incidência IBS</span>
              </div>
              {indopUnicos.map((indop, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 bg-white rounded-xl mb-2 border border-pv-gray-200">
                  <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/20 px-3 py-1 rounded-lg shrink-0">
                    {indop.indop}
                  </span>
                  <span className="text-sm text-pv-blue-900/80">{indop.local_incidencia_ibs || "N/A"}</span>
                </div>
              ))}
            </div>
          )}

          {classUnicos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins size={18} className="text-pv-yellow-500" />
                <span className="text-sm font-bold text-pv-blue-900">Classificação Tributária</span>
              </div>
              {classUnicos.map((ct, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-3 bg-white rounded-xl mb-2 border border-pv-gray-200">
                  <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/20 px-3 py-1 rounded-lg shrink-0">
                    {ct.c_class_trib}
                  </span>
                  <span className="text-sm text-pv-blue-900/80">{ct.c_class_trib_nome || "N/A"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ResultadosItemLC {
  itemData: ItemListaServicos;
  cnaesVinculados: CNAEItemLC[];
  ibsData: ItemLCIBSCBS[];
}

export default function ConsultaItemLCPage() {
  const [itemInput, setItemInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadosItemLC | null>(null);
  const [contagemItens, setContagemItens] = useState<ContagemItens>({
    total: 0,
    loading: true,
  });

  const [sugestoes, setSugestoes] = useState<ItemListaServicos[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [sugestaoSelecionada, setSugestaoSelecionada] = useState(-1);
  const suppressSugestoesRef = useRef(false);

  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#item-input") && !target.closest(".dropdown-sugestoes")) {
        setMostrarSugestoes(false);
        setSugestaoSelecionada(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Buscar sugestões com debounce
  useEffect(() => {
    if (suppressSugestoesRef.current) {
      suppressSugestoesRef.current = false;
      setSugestoes([]);
      setMostrarSugestoes(false);
      setLoadingSugestoes(false);
      return;
    }

    const timer = setTimeout(async () => {
      // Garante que itemInput é string
      const termoStr = String(itemInput || "");
      const termo = termoStr.trim();

      if (!termo || termo.length < 2) {
        setSugestoes([]);
        setMostrarSugestoes(false);
        return;
      }

      setLoadingSugestoes(true);

      try {
        let data;
        let error;

        // Verifica se é um número (código do item)
        const isNumero = /^[\d.,]+$/.test(termo);

        if (isNumero) {
          // Busca por código do item - usa gte/lte para range de números
          const termoFormatado = parseFloat(termo.replace(",", "."));
          const limiteInferior = termoFormatado;
          const limiteSuperior = termoFormatado + 0.99;

          const resultado = await supabase
            .from("itens_lista_servicos")
            .select("item_lc, descricao")
            .gte("item_lc", limiteInferior)
            .lte("item_lc", limiteSuperior)
            .order("item_lc")
            .limit(10);

          data = resultado.data;
          error = resultado.error;
        } else {
          // Busca por descrição
          const resultado = await supabase
            .from("itens_lista_servicos")
            .select("item_lc, descricao")
            .ilike("descricao", `%${termo}%`)
            .limit(10);

          data = resultado.data;
          error = resultado.error;
        }

        if (error) throw error;

        setSugestoes((data || []) as ItemListaServicos[]);
        setMostrarSugestoes((data || []).length > 0 && termo.length >= 2);
      } catch (err) {
        console.error("Erro ao buscar sugestões:", err);
        setSugestoes([]);
        setMostrarSugestoes(false);
      } finally {
        setLoadingSugestoes(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [itemInput]);

  // Buscar contagem de itens ao carregar a página
  useEffect(() => {
    async function buscarContagemItens() {
      try {
        const { count, error } = await supabase
          .from("itens_lista_servicos")
          .select("*", { count: "exact", head: true });

        if (error) throw error;

        setContagemItens({ total: count || 0, loading: false });
      } catch (err) {
        console.error("Erro ao buscar contagem:", err);
        setContagemItens({ total: 0, loading: false });
      }
    }

    buscarContagemItens();
  }, []);

  const buscarItemLC = useCallback(async () => {
    const termoStr = String(itemInput || "");
    const termo = termoStr.trim();

    if (!termo) {
      setError("Por favor, digite um código de item ou uma descrição de serviço.");
      return;
    }

    setLoading(true);
    setResultados(null);
    setError(null);
    setFilterRisk(null);

    try {
      let itemData;
      let itemError;

      // Verifica se é um número (código do item)
      const isNumero = /^[\d.,]+$/.test(termo);

      if (isNumero) {
        // Busca por código do item
        const termoFormatado = termo.replace(",", ".");
        const resultado = await supabase
          .from("itens_lista_servicos")
          .select("*")
          .eq("item_lc", parseFloat(termoFormatado))
          .single();

        itemData = resultado.data;
        itemError = resultado.error;
      } else {
        // Busca por descrição (pega o primeiro resultado)
        const resultado = await supabase
          .from("itens_lista_servicos")
          .select("*")
          .ilike("descricao", `%${termo}%`)
          .limit(1)
          .single();

        itemData = resultado.data;
        itemError = resultado.error;
      }

      if (itemError || !itemData) {
        setError(`Nenhum item de serviço encontrado para "${termo}". Tente usar outras palavras-chave.`);
        setLoading(false);
        return;
      }

      // Busca todos os CNAEs vinculados a este item LC
      const { data: cnaesData, error: cnaesError } = await supabase
        .from("cnae_item_lc")
        .select("*")
        .eq("item_lc", itemData.item_lc);

      if (cnaesError) throw cnaesError;

      // Busca dados de IBS/CBS para este item
      const { data: ibsData, error: ibsError } = await supabase
        .from("item_lc_ibs_cbs")
        .select("*")
        .eq("item_lc", itemData.item_lc);

      if (ibsError) throw ibsError;

      setResultados({
        itemData: itemData as ItemListaServicos,
        cnaesVinculados: (cnaesData || []) as CNAEItemLC[],
        ibsData: (ibsData || []) as ItemLCIBSCBS[],
      });
    } catch (err) {
      console.error("Erro:", err);
      setError(`Erro ao consultar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }, [itemInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!mostrarSugestoes || sugestoes.length === 0) {
      if (e.key === "Enter") {
        buscarItemLC();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSugestaoSelecionada((prev) => (prev < sugestoes.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSugestaoSelecionada((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (sugestaoSelecionada >= 0) {
          selecionarSugestao(sugestoes[sugestaoSelecionada]);
        } else {
          buscarItemLC();
        }
        break;
      case "Escape":
        setMostrarSugestoes(false);
        setSugestaoSelecionada(-1);
        break;
    }
  };

  const selecionarSugestao = async (item: ItemListaServicos) => {
    suppressSugestoesRef.current = true;
    setItemInput(formatarItemLcInput(String(item.item_lc)));
    setSugestoes([]);
    setMostrarSugestoes(false);
    setSugestaoSelecionada(-1);

    setLoading(true);
    setResultados(null);
    setError(null);

    try {
      // Busca todos os CNAEs vinculados a este item LC
      const { data: cnaesData, error: cnaesError } = await supabase
        .from("cnae_item_lc")
        .select("*")
        .eq("item_lc", parseFloat(item.item_lc));

      if (cnaesError) throw cnaesError;

      // Busca dados de IBS/CBS para este item
      const { data: ibsData, error: ibsError } = await supabase
        .from("item_lc_ibs_cbs")
        .select("*")
        .eq("item_lc", parseFloat(item.item_lc));

      if (ibsError) throw ibsError;

      setResultados({
        itemData: item,
        cnaesVinculados: (cnaesData || []) as CNAEItemLC[],
        ibsData: (ibsData || []) as ItemLCIBSCBS[],
      });
    } catch (err) {
      console.error("Erro:", err);
      setError(`Erro ao consultar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  // Filtra CNAEs por risco
  let cnaesExibidos = resultados?.cnaesVinculados || [];

  if (filterRisk) {
    cnaesExibidos = cnaesExibidos.filter((cnae) => {
      const grau = cnae.grau_risco?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return grau === filterRisk.toUpperCase();
    });
  }

  // Agrupa CNAEs únicos
  const cnaesUnicos = [...new Map(cnaesExibidos.map((item) => [item.cnae, item])).values()];

  // Contagem por risco
  const contagemRisco = {
    baixo: [...new Map((resultados?.cnaesVinculados || []).filter(c => c.grau_risco?.toUpperCase() === "BAIXO").map(c => [c.cnae, c])).values()].length,
    medio: [...new Map((resultados?.cnaesVinculados || []).filter(c => {
      const g = c.grau_risco?.toUpperCase();
      return g === "MEDIO" || g === "MÉDIO";
    }).map(c => [c.cnae, c])).values()].length,
    alto: [...new Map((resultados?.cnaesVinculados || []).filter(c => c.grau_risco?.toUpperCase() === "ALTO").map(c => [c.cnae, c])).values()].length,
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pv-gray-100 to-white">
      <Header />
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-8 border-2 border-pv-blue-900/10">
          <label htmlFor="item-input" className="block text-base font-bold text-pv-blue-900 mb-2">
            Buscar por Código do Item ou Descrição do Serviço
          </label>
          <p className="text-xs text-pv-blue-700/70 mb-4 flex items-center gap-1">
            <span className="text-lg">💡</span>
            <span>Dica: Digite um código (ex: 1.01) ou palavras-chave (ex: Análise e desenvolvimento de sistemas)</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0 relative">
              <input
                type="text"
                id="item-input"
                value={itemInput}
                onChange={(e) => {
                  setItemInput(formatarItemLcInput(e.target.value));
                  setSugestaoSelecionada(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (sugestoes.length > 0) setMostrarSugestoes(true);
                }}
                placeholder="Digite aqui para começar a busca..."
                autoComplete="off"
                className="w-full min-w-0 px-5 pr-20 py-4 text-base border-2 border-pv-gray-200 rounded-xl bg-white text-pv-blue-900 placeholder:text-slate-400 focus:outline-none focus:border-pv-blue-900 focus:ring-4 focus:ring-pv-blue-900/10 transition font-poppins shadow-sm"
              />

              {loadingSugestoes && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-pv-gray-200 border-t-pv-blue-900 rounded-full animate-spin"></div>
                </div>
              )}

              {/* Dropdown de Sugestões - Minimalista */}
              {mostrarSugestoes && sugestoes.length > 0 && (
                <div className="dropdown-sugestoes absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-md border border-pv-blue-900/15 rounded-2xl shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] z-50 max-h-[440px] overflow-hidden ring-1 ring-pv-blue-900/10">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-pv-blue-900/10 bg-white/70">
                    <span className="text-xs font-semibold text-pv-blue-900 uppercase tracking-wide">Sugestoes</span>
                    <span className="text-xs text-pv-blue-700/70">{sugestoes.length} {sugestoes.length === 1 ? "resultado" : "resultados"}</span>
                  </div>
                  <div className="overflow-y-auto max-h-[360px] py-2">
                    {sugestoes.map((sugestao, index) => (
                      <button
                        key={sugestao.item_lc}
                        onClick={() => selecionarSugestao(sugestao)}
                        onMouseEnter={() => setSugestaoSelecionada(index)}
                        className={`group w-full text-left px-4 py-3 transition-all rounded-xl mx-2 border border-transparent ${
                          sugestaoSelecionada === index
                            ? "bg-gradient-to-r from-pv-blue-900 to-pv-blue-700 text-white shadow-lg"
                            : "hover:bg-pv-blue-50/70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border min-w-[72px] text-center ${
                            sugestaoSelecionada === index
                              ? "bg-white/15 text-white border-white/30"
                              : "bg-pv-yellow-500/20 text-pv-blue-900 border-pv-yellow-500/30"
                          }`}>
                            {sugestao.item_lc}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm line-clamp-2 ${sugestaoSelecionada === index ? "text-white/90" : "text-pv-blue-900/80"}`}>
                              {highlightTexto(sugestao.descricao, itemInput)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-pv-blue-900/10 px-4 py-2 text-xs text-pv-blue-700/60 flex items-center justify-between bg-white/70">
                    <span>Up/Down navegar - Enter selecionar</span>
                    <span>Esc fechar</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={buscarItemLC}
              disabled={loading}
              className="px-8 py-4 text-base font-bold bg-pv-yellow-500 text-pv-blue-900 rounded-xl hover:bg-yellow-400 transition disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Search size={20} />
              {loading ? "Consultando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <StatisticsDashboard contagem={contagemItens} onInfoClick={() => setIsInfoModalOpen(true)} />

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-pv-gray-200 border-t-pv-blue-900 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-pv-blue-700/70 text-base font-medium">Consultando base de dados...</p>
          </div>
        )}

        {/* Mensagem de Erro */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-start gap-3">
            <ShieldX size={24} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Ops! Algo deu errado</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {resultados && (
          <div className="space-y-6">
            {/* Item LC Header Card */}
            <div className="bg-gradient-to-r from-pv-blue-900 to-pv-blue-700 text-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="bg-pv-yellow-500 text-pv-blue-900 px-4 py-1 rounded-lg font-bold text-lg">
                        Item {resultados.itemData.item_lc}
                      </span>
                    </div>
                    <p className="text-white/90 text-base leading-relaxed">{corrigirEncoding(resultados.itemData.descricao)}</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-2 text-sm text-white/80 flex-wrap">
                  <span className="bg-white/10 px-3 py-1 rounded-lg">{cnaesUnicos.length} CNAEs vinculados</span>
                  <span>•</span>
                  <span>LC 116/2003</span>
                </div>
              </div>
            </div>

            {/* Quick Reference Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 text-center shadow-md hover:shadow-lg transition">
                <label className="block text-xs font-bold text-pv-yellow-500 uppercase tracking-wide mb-2">Item LC</label>
                <span className="text-2xl font-bold text-pv-blue-900">{resultados.itemData.item_lc}</span>
              </div>
              <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 text-center shadow-md hover:shadow-lg transition">
                <label className="block text-xs font-bold text-pv-yellow-500 uppercase tracking-wide mb-2">CNAEs</label>
                <span className="text-2xl font-bold text-pv-blue-900">{[...new Map((resultados.cnaesVinculados || []).map(c => [c.cnae, c])).values()].length}</span>
              </div>
              <div className="bg-white rounded-xl border-2 border-emerald-400 p-4 text-center shadow-md hover:shadow-lg transition bg-emerald-50">
                <label className="block text-xs font-bold text-emerald-600 uppercase tracking-wide mb-2">Baixo Risco</label>
                <span className="text-2xl font-bold text-emerald-700">{contagemRisco.baixo}</span>
              </div>
              <div className="bg-white rounded-xl border-2 border-red-400 p-4 text-center shadow-md hover:shadow-lg transition bg-red-50">
                <label className="block text-xs font-bold text-red-600 uppercase tracking-wide mb-2">Alto Risco</label>
                <span className="text-2xl font-bold text-red-700">{contagemRisco.alto}</span>
              </div>
            </div>

            {/* IBS/CBS Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-pv-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Coins size={24} className="text-pv-yellow-500" />
                <h3 className="text-lg font-bold text-pv-blue-900">Informações Tributárias (IBS/CBS)</h3>
                <Tooltip content="Dados da Reforma Tributária: NBS, INDOP e Classificação Tributária">
                  <HelpCircle size={16} className="text-pv-blue-700/50" />
                </Tooltip>
              </div>
              <IBSCBSAccordion ibsData={resultados.ibsData} />
            </div>

            {/* CNAEs Vinculados Section */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-pv-gray-200">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <FileText size={24} className="text-pv-yellow-500" />
                  <h3 className="text-lg font-bold text-pv-blue-900">CNAEs Vinculados a este Item</h3>
                </div>

                {/* Filtros de Risco */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter size={16} className="text-pv-blue-700" />
                  <span className="text-sm font-semibold text-pv-blue-900">Filtrar:</span>
                  <button
                    onClick={() => setFilterRisk(null)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === null ? "bg-pv-blue-900 text-white" : "bg-pv-gray-100 text-pv-blue-900 hover:bg-pv-gray-200"
                    }`}
                  >
                    Todos ({[...new Map((resultados.cnaesVinculados || []).map(c => [c.cnae, c])).values()].length})
                  </button>
                  <button
                    onClick={() => setFilterRisk("BAIXO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === "BAIXO" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    Baixo ({contagemRisco.baixo})
                  </button>
                  <button
                    onClick={() => setFilterRisk("MEDIO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === "MEDIO" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    Médio ({contagemRisco.medio})
                  </button>
                  <button
                    onClick={() => setFilterRisk("ALTO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === "ALTO" ? "bg-red-500 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    Alto ({contagemRisco.alto})
                  </button>
                </div>
              </div>

              {cnaesUnicos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                  {cnaesUnicos.map((cnae) => (
                    <CNAECard key={cnae.cnae} cnae={cnae} termo={itemInput} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-pv-blue-700/60">
                  <FileText size={48} className="mx-auto mb-4 opacity-30" />
                  <p>Nenhum CNAE encontrado com o filtro selecionado.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Info Modal */}
      <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="O que são Itens da Lista de Serviços?">
        <div className="space-y-4 text-sm text-pv-blue-900/80">
          <p>
            Os <strong>Itens da Lista de Serviços</strong> são códigos definidos pela <strong>Lei Complementar 116/2003</strong>
            que identificam os serviços sujeitos ao ISS (Imposto Sobre Serviços).
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-pv-blue-50 rounded-lg border border-pv-blue-200">
              <h4 className="font-bold text-pv-blue-700 mb-2 flex items-center gap-2">
                <List size={20} />
                Estrutura do Código
              </h4>
              <p>O código é formado por dois números separados por ponto. Ex: <strong>1.01</strong> = Subitem 01 do Item 1.</p>
            </div>

            <div className="p-4 bg-pv-yellow-50 rounded-lg border border-pv-yellow-200">
              <h4 className="font-bold text-pv-yellow-700 mb-2 flex items-center gap-2">
                <Building2 size={20} />
                Relação com CNAEs
              </h4>
              <p>Cada item de serviço pode estar vinculado a múltiplos CNAEs (Classificação Nacional de Atividades Econômicas).</p>
            </div>
          </div>

          <p className="pt-4 border-t border-pv-gray-200 text-xs text-pv-blue-700/60">
            Esta ferramenta permite consultar quais atividades econômicas (CNAEs) estão relacionadas a cada item de serviço.
          </p>
        </div>
      </Modal>

      <Footer />
    </div>
  );
}
