"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Navigation from "@/components/Navigation/Navigation";
import { supabase } from "@/lib/supabase";
import { CNAEItemLC, ItemListaServicos, ItemLCIBSCBS, GrauRisco, RiscoExplicacao } from "@/types/cnae-supabase";
import { ChevronDown, ShieldCheck, ShieldAlert, ShieldX, HelpCircle, X, Search, Filter, Building2, FileText, MapPin, Coins, Info, ExternalLink } from "lucide-react";

interface ContagemRisco {
  baixo: number;
  medio: number;
  alto: number;
  loading: boolean;
}

// Função para corrigir encoding de caracteres especiais
function corrigirEncoding(texto: string): string {
  if (!texto) return texto;

  let resultado = texto;

  // Correções de combinações específicas primeiro (palavras compostas)
  resultado = resultado.replace(/ReproduÃ§Ã£o/g, 'Reprodução');
  resultado = resultado.replace(/reproduÃ§Ã£o/g, 'reprodução');
  resultado = resultado.replace(/Ã§Ã£o/g, 'ção');
  resultado = resultado.replace(/Ã§Ãµes/g, 'ções');
  resultado = resultado.replace(/nÃ£o/g, 'não');
  resultado = resultado.replace(/Ã¡vel/g, 'ável');
  resultado = resultado.replace(/Ã¡veis/g, 'áveis');

  // Caracteres individuais minúsculos
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

  // Caracteres individuais maiúsculos
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

function formatarCnaeInput(valor: string): string {
  if (!/^[\d\s\-./]*$/.test(valor)) {
    return valor;
  }

  const digits = valor.replace(/\D/g, "").slice(0, 7);
  if (digits.length <= 4) return digits;
  if (digits.length === 5) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
}

function highlightTexto(texto: string, termo: string) {
  if (!termo || termo.length < 2) return texto;

  const textoCorrigido = corrigirEncoding(texto);

  const regex = new RegExp(`(${termo})`, "gi");
  const partes = textoCorrigido.split(regex);

  return partes.map((parte, index) =>
    regex.test(parte) ? (
      <mark key={index} className="bg-pv-yellow-500/30 font-semibold rounded px-1">
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

function obterExplicacaoRisco(grauRisco: GrauRisco): RiscoExplicacao | null {
  if (!grauRisco) return null;

  const grau = grauRisco.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const explicacoes: Record<string, RiscoExplicacao> = {
    ALTO: {
      titulo: "O que isso significa?",
      classe: "alto",
      itens: [
        { tipo: "x", texto: "Obter licença ANTES de iniciar as atividades" },
        { tipo: "x", texto: "Passar por vistorias técnicas dos órgãos competentes" },
        { tipo: "x", texto: "Atender requisitos específicos de segurança, meio ambiente e vigilância sanitária" },
        { tipo: "x", texto: "Aguardar aprovação formal para começar a funcionar" },
      ],
    },
    MEDIO: {
      titulo: "O que isso significa?",
      classe: "medio",
      itens: [
        { tipo: "check", texto: "Você recebe um alvará provisório de IMEDIATO" },
        { tipo: "check", texto: "Pode iniciar atividades no ato do registro" },
        { tipo: "check", texto: "Vistorias serão realizadas posteriormente" },
        { tipo: "x", texto: "Deve atender normas específicas de sua atividade" },
      ],
    },
    BAIXO: {
      titulo: "O que isso significa?",
      classe: "baixo",
      itens: [
        { tipo: "check", texto: "Você está DISPENSADO de licenciamento prévio" },
        { tipo: "check", texto: "Pode iniciar as atividades imediatamente após registro" },
        { tipo: "check", texto: "Não necessita de vistorias técnicas iniciais" },
        { tipo: "check", texto: "Certidão de dispensa emitida automaticamente" },
      ],
    },
  };

  return explicacoes[grau] || null;
}

interface ItemComLink {
  texto: string;
  link?: string;
}

interface DetalheLicenciamento {
  titulo: string;
  subtitulo: string;
  significados: string[];
  prazosCustos: ItemComLink[];
  documentos: ItemComLink[];
  legislacao: string[];
}

const detalhesLicenciamento: Record<string, DetalheLicenciamento> = {
  BAIXO: {
    titulo: "Baixo Risco",
    subtitulo: "Dispensado de Licenciamento",
    significados: [
      "Dispensado de licenciamento prévio",
      "Não exige vistoria inicial",
      "Registro simplificado na Junta Comercial",
      "Certidão de Dispensa emitida automaticamente",
      "Processo de abertura ágil e desburocratizado",
    ],
    prazosCustos: [
      { texto: "Prazo: Imediato após registro na JUCER" },
      { texto: "Custo: Taxas de registro da JUCER, taxa Bombeiro e TFFR do município", link: "https://tax-calculator-portovelho.replit.app/" },
      { texto: "Sem necessidade de aguardar aprovações" },
    ],
    documentos: [
      { texto: "Consulta prévia de viabilidade aprovada", link: "https://www.empresafacil.ro.gov.br/" },
      { texto: "Obtenção da inscrição municipal", link: "https://www.empresafacil.ro.gov.br/" },
      { texto: "Credenciamento para emissão de NFS-e", link: "https://nfse.portovelho.ro.gov.br/#/login" },
      { texto: "Credenciamento ao Domicílio Tributário Eletrônico (DTEL)", link: "https://dtel-cartilha.vercel.app/" },
    ],
    legislacao: [
      "Lei Municipal nº 906/2022, 873/2022, 138/2001, 1.562/2003",
      "Decreto Municipal nº 19.577/2023, 16.482/2019",
      "Lei Federal nº 11.598/2007 (Redesim)",
    ],
  },
  MEDIO: {
    titulo: "Médio Risco",
    subtitulo: "Alvará Provisório",
    significados: [
      "Alvará provisório emitido imediatamente",
      "Pode iniciar atividades no ato do registro",
      "Vistoria realizada em até 180 dias",
      "Deve atender normas sanitárias, ambientais e de segurança",
      "Prazo para regularização completa: 180 dias",
    ],
    prazosCustos: [
      { texto: "Alvará provisório: imediato" },
      { texto: "Vistoria: até 180 dias após início" },
      { texto: "Regularização: até 180 dias; após esse prazo sem ação do município, o alvará vira definitivo" },
      { texto: "Custo: taxas de registro + vistoria + funcionamento + (localização, se houver estabelecimento fixo) + (ambiental e sanitária, se houver atividade)", link: "https://tax-calculator-portovelho.replit.app/" },
    ],
    documentos: [
      { texto: "Consulta prévia de viabilidade aprovada", link: "https://www.empresafacil.ro.gov.br/" },
      { texto: "Obtenção da inscrição municipal", link: "https://www.empresafacil.ro.gov.br/" },
      { texto: "Alvará do Corpo de Bombeiros" },
      { texto: "Alvará sanitário e ambiental (para algumas atividades)" },
      { texto: "Demais autorizações específicas (para algumas atividades)" },
    ],
    legislacao: [
      "Lei Municipal nº 906/2022, 873/2022, 138/2001, 1.562/2003",
      "Decreto Municipal nº 19.577/2023, 16.482/2019",
      "Resoluções específicas por atividade",
    ],
  },
  ALTO: {
    titulo: "Alto Risco",
    subtitulo: "Licença Prévia Obrigatória",
    significados: [
      "Licença prévia obrigatória antes de iniciar",
      "Não pode funcionar antes da aprovação",
      "Vistoria técnica prévia obrigatória",
      "Laudos técnicos especializados necessários",
      "Aprovação de múltiplos órgãos competentes, em especial o do Corpo de Bombeiros",
    ],
    prazosCustos: [
      { texto: "Análise: até 90 dias" },
      { texto: "Vistoria: agendada após protocolo" },
      { texto: "Aprovação final: após cumprimento de exigências" },
      { texto: "Custo: taxas + laudos técnicos + adequações", link: "https://tax-calculator-portovelho.replit.app/" },
    ],
    documentos: [
      { texto: "Projeto completo de instalações" },
      { texto: "Laudo técnico de segurança" },
      { texto: "Licença ambiental (quando aplicável)" },
      { texto: "Licença da Vigilância Sanitária (quando aplicável)" },
      { texto: "Licença do Corpo de Bombeiros (obrigatório)" },
      { texto: "Memorial descritivo das atividades" },
      { texto: "ART/RRT dos responsáveis técnicos" },
    ],
    legislacao: [
      "Lei Municipal nº 906/2022, 873/2022, 138/2001, 1.562/2003",
      "Decreto Municipal nº 19.577/2023, 16.482/2019",
      "Portarias específicas da Vigilância Sanitária",
      "Normas técnicas do Corpo de Bombeiros",
      "Legislação ambiental aplicável",
    ],
  },
};

function obterDetalhesLicenciamento(grauRisco: GrauRisco): DetalheLicenciamento | null {
  if (!grauRisco) return null;

  const grau = grauRisco.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return detalhesLicenciamento[grau] || null;
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

// Help Panel Component
interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function HelpPanel({ isOpen, onClose }: HelpPanelProps) {
  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="bg-pv-blue-900 text-white px-6 py-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ajuda e Informações</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded" aria-label="Fechar ajuda">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section>
            <h3 className="font-bold text-pv-blue-900 mb-3 flex items-center gap-2">
              <Info size={18} />
              Como usar esta ferramenta
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-pv-blue-900/80">
              <li>Digite um código CNAE ou palavras-chave da atividade</li>
              <li>Selecione uma sugestão ou clique em "Buscar"</li>
              <li>Visualize o grau de risco e informações tributárias</li>
              <li>Expanda os itens LC para ver detalhes de IBS/CBS</li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-pv-blue-900 mb-3">Glossário de Termos</h3>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-pv-blue-900">CNAE</h4>
                <p className="text-pv-blue-900/70">Classificação Nacional de Atividades Econômicas. Código que identifica a atividade principal do seu negócio.</p>
              </div>
              <div>
                <h4 className="font-semibold text-pv-blue-900">Grau de Risco</h4>
                <p className="text-pv-blue-900/70">Classificação (Baixo, Médio ou Alto) definida pela Resolução CGSIM nº 51/2019 que determina os requisitos de licenciamento.</p>
              </div>
              <div>
                <h4 className="font-semibold text-pv-blue-900">LC 116/2003</h4>
                <p className="text-pv-blue-900/70">Lei Complementar que define a lista de serviços sujeitos ao ISS (Imposto Sobre Serviços).</p>
              </div>
              <div>
                <h4 className="font-semibold text-pv-blue-900">NBS</h4>
                <p className="text-pv-blue-900/70">Nomenclatura Brasileira de Serviços. Código usado para identificar serviços em operações que envolvam a emissão de documentos fiscais.</p>
              </div>
              <div>
                <h4 className="font-semibold text-pv-blue-900">INDOP</h4>
                <p className="text-pv-blue-900/70">Indicador de local de incidência do IBS (Imposto sobre Bens e Serviços), parte da reforma tributária.</p>
              </div>
              <div>
                <h4 className="font-semibold text-pv-blue-900">IBS/CBS</h4>
                <p className="text-pv-blue-900/70">Novos impostos da Reforma Tributária que substituirão PIS, COFINS, IPI, ICMS e ISS.</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-bold text-pv-blue-900 mb-3">Perguntas Frequentes</h3>
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold text-pv-blue-900">Como encontrar meu CNAE?</h4>
                <p className="text-pv-blue-900/70">Digite palavras-chave da sua atividade ou o código se já souber.</p>
              </div>
              <div>
                <h4 className="font-semibold text-pv-blue-900">O que fazer se meu CNAE for de alto risco?</h4>
                <p className="text-pv-blue-900/70">Você precisará obter licenças antes de iniciar as atividades e passar por vistorias técnicas.</p>
              </div>
            </div>
          </section>

          <section className="bg-pv-blue-50 rounded-lg p-4">
            <h3 className="font-bold text-pv-blue-900 mb-2">Precisa de mais ajuda?</h3>
            <p className="text-sm text-pv-blue-900/80 mb-3">Entre em contato com a SEMEC:</p>
            <p className="text-sm text-pv-blue-900">
              <strong>Telefone:</strong> (69) 3901-6281<br />
              <strong>E-mail:</strong> gab.semec@portovelho.ro.gov.br
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}


// Enhanced Statistics Dashboard
interface StatisticsDashboardProps {
  contagem: ContagemRisco;
  onInfoClick: () => void;
}

function StatisticsDashboard({ contagem, onInfoClick }: StatisticsDashboardProps) {
  const total = contagem.baixo + contagem.medio + contagem.alto;

  const cards = [
    {
      tipo: "baixo",
      titulo: "Baixo Risco",
      descricao: "Dispensadas de licenciamento",
      icon: ShieldCheck,
      bgColor: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      borderColor: "border-emerald-300",
      iconBg: "bg-emerald-500",
      textColor: "text-emerald-700",
      countBg: "bg-emerald-500",
      valor: contagem.baixo,
      percentual: total > 0 ? ((contagem.baixo / total) * 100).toFixed(1) : "0",
    },
    {
      tipo: "medio",
      titulo: "Médio Risco",
      descricao: "Alvará provisório imediato",
      icon: ShieldAlert,
      bgColor: "bg-gradient-to-br from-amber-50 to-amber-100",
      borderColor: "border-amber-300",
      iconBg: "bg-amber-500",
      textColor: "text-amber-700",
      countBg: "bg-amber-500",
      valor: contagem.medio,
      percentual: total > 0 ? ((contagem.medio / total) * 100).toFixed(1) : "0",
    },
    {
      tipo: "alto",
      titulo: "Alto Risco",
      descricao: "Licença prévia obrigatória",
      icon: ShieldX,
      bgColor: "bg-gradient-to-br from-red-50 to-red-100",
      borderColor: "border-red-300",
      iconBg: "bg-red-500",
      textColor: "text-red-700",
      countBg: "bg-red-500",
      valor: contagem.alto,
      percentual: total > 0 ? ((contagem.alto / total) * 100).toFixed(1) : "0",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-8 border border-pv-gray-200">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-lg font-bold text-pv-blue-900">Atividades Cadastradas no Município de Porto Velho</h2>
          <Tooltip content="Classificação baseada na Resolução CGSIM nº 51/2019 que define os critérios de risco para licenciamento de atividades econômicas">
            <button
              onClick={onInfoClick}
              className="p-1 hover:bg-pv-gray-100 rounded-full transition"
              aria-label="Mais informações sobre grau de risco"
            >
              <HelpCircle size={18} className="text-pv-blue-700" />
            </button>
          </Tooltip>
        </div>
        <p className="text-sm text-pv-blue-700/60">Resolução CGSIM nº 51/2019</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Tooltip key={card.tipo} content={`${card.descricao} - ${card.percentual}% do total`}>
              <div
                className={`relative overflow-hidden rounded-xl ${card.bgColor} ${card.borderColor} border-2 p-5 transition-all hover:shadow-xl hover:scale-105 cursor-pointer`}
              >
                <div className="absolute -right-4 -top-4 opacity-10">
                  <Icon size={100} className={card.textColor} />
                </div>

                <div className="relative z-10">
                  <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon size={24} className="text-white" />
                  </div>

                  <h3 className={`text-lg font-bold ${card.textColor} mb-1`}>{card.titulo}</h3>
                  <p className="text-sm text-pv-blue-900/60 mb-4">{card.descricao}</p>

                  <div className="flex items-center gap-2 mb-2">
                    <div className={`${card.countBg} text-white text-2xl font-bold px-4 py-2 rounded-lg shadow-md min-w-[80px] text-center`}>
                      {contagem.loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                      ) : (
                        card.valor.toLocaleString("pt-BR")
                      )}
                    </div>
                    <span className="text-xs text-pv-blue-900/50 font-medium">atividades</span>
                  </div>

                  {!contagem.loading && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-pv-blue-900/60 mb-1">
                        <span>Percentual</span>
                        <span className="font-bold">{card.percentual}%</span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${card.iconBg} transition-all duration-500`}
                          style={{ width: `${card.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-pv-gray-200 flex flex-col sm:flex-row items-center justify-center gap-3">
        <span className="text-sm font-medium text-pv-blue-700/70">Total de atividades cadastradas:</span>
        <span className="text-2xl font-bold text-pv-blue-900 bg-pv-blue-50 px-6 py-2 rounded-xl shadow-sm">
          {contagem.loading ? "..." : total.toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
}

// Accordion Item Component (Enhanced)
interface AccordionItemProps {
  itemLc: string;
  descricao: string;
  correlacoes: ItemLCIBSCBS[];
}

function AccordionItem({ itemLc, descricao, correlacoes }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const nbsUnicos = [...new Map(correlacoes.filter((c) => c.nbs).map((c) => [c.nbs, c])).values()];
  const indopUnicos = [...new Map(correlacoes.filter((c) => c.indop).map((c) => [c.indop, c])).values()];
  const classUnicos = [...new Map(correlacoes.filter((c) => c.c_class_trib).map((c) => [c.c_class_trib, c])).values()];

  const hasDetails = nbsUnicos.length > 0 || indopUnicos.length > 0 || classUnicos.length > 0;

  return (
    <div className={`accordion-item bg-white border-2 border-pv-gray-200 rounded-xl mb-4 overflow-hidden transition-all ${isOpen ? "shadow-lg" : "hover:shadow-md"}`}>
      <div
        className="accordion-header flex items-center justify-between p-5 cursor-pointer hover:bg-pv-blue-50/50 transition gap-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-pv-yellow-500 text-pv-blue-900 px-3 py-1 rounded-lg font-bold text-sm">
              Item {itemLc}
            </span>
            {hasDetails && (
              <div className="flex items-center gap-1.5">
                {nbsUnicos.length > 0 && (
                  <Tooltip content="Possui códigos NBS">
                    <span className="text-pv-blue-700/60"><Building2 size={16} /></span>
                  </Tooltip>
                )}
                {indopUnicos.length > 0 && (
                  <Tooltip content="Possui indicadores INDOP">
                    <span className="text-pv-blue-700/60"><MapPin size={16} /></span>
                  </Tooltip>
                )}
                {classUnicos.length > 0 && (
                  <Tooltip content="Possui classificação tributária">
                    <span className="text-pv-blue-700/60"><Coins size={16} /></span>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          <div className="text-sm text-pv-blue-900/80 line-clamp-2">{descricao || "Descrição não disponível"}</div>
        </div>
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-xl bg-pv-blue-900 text-white transition-transform shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <ChevronDown size={20} />
        </div>
      </div>
      <div className={`accordion-content ${isOpen ? "max-h-[3000px]" : "max-h-0"} overflow-hidden transition-all duration-300`}>
        <div className="p-5 pt-0 border-t border-pv-gray-200 bg-gradient-to-b from-pv-blue-50/30 to-white">
          {!hasDetails && (
            <div className="text-center py-8 text-pv-blue-700/60 text-sm">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              Sem dados de IBS/CBS cadastrados para este item.
            </div>
          )}

          {nbsUnicos.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={18} className="text-pv-yellow-500" />
                <span className="text-sm font-bold text-pv-blue-900">Códigos NBS (Nomenclatura Brasileira de Serviços)</span>
                <Tooltip content="NBS é usado para identificar serviços em operações que envolvam a emissão de documentos fiscais">
                  <HelpCircle size={14} className="text-pv-blue-700/50" />
                </Tooltip>
              </div>
              {nbsUnicos.map((nbs, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-4 bg-white rounded-xl mb-3 border border-pv-gray-200 shadow-sm">
                  <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/20 px-3 py-2 rounded-lg shrink-0 border border-pv-yellow-500/30">
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
                <Tooltip content="Define onde o imposto sobre bens e serviços incide">
                  <HelpCircle size={14} className="text-pv-blue-700/50" />
                </Tooltip>
              </div>
              {indopUnicos.map((indop, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-4 bg-white rounded-xl mb-3 border border-pv-gray-200 shadow-sm">
                  <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/20 px-3 py-2 rounded-lg shrink-0 border border-pv-yellow-500/30">
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
                <Tooltip content="Categoria fiscal da atividade para fins de tributação">
                  <HelpCircle size={14} className="text-pv-blue-700/50" />
                </Tooltip>
              </div>
              {classUnicos.map((ct, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 p-4 bg-white rounded-xl mb-3 border border-pv-gray-200 shadow-sm">
                  <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/20 px-3 py-2 rounded-lg shrink-0 border border-pv-yellow-500/30">
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

interface ResultadosCNAE {
  cnaeData: CNAEItemLC[];
  itensData: ItemListaServicos[];
  ibsData: ItemLCIBSCBS[];
}

export default function ConsultaCNAEPage() {
  const [cnaeInput, setCnaeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadosCNAE | null>(null);
  const [cnaeSelecionado, setCnaeSelecionado] = useState<number>(0);
  const [contagemRisco, setContagemRisco] = useState<ContagemRisco>({
    baixo: 0,
    medio: 0,
    alto: 0,
    loading: true,
  });

  const [sugestoes, setSugestoes] = useState<CNAEItemLC[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [loadingSugestoes, setLoadingSugestoes] = useState(false);
  const [sugestaoSelecionada, setSugestaoSelecionada] = useState(-1);
  const suppressSugestoesRef = useRef(false);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isLicenciamentoModalOpen, setIsLicenciamentoModalOpen] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"relevancia" | "codigo" | "risco">("relevancia");

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("#cnae-input") && !target.closest(".dropdown-sugestoes")) {
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
      const termo = cnaeInput.trim();

      if (!termo || termo.length < 3) {
        setSugestoes([]);
        setMostrarSugestoes(false);
        return;
      }

      setLoadingSugestoes(true);

      try {
        let data;
        let error;

        const apenasNumeros = termo.replace(/\D/g, "");
        if (apenasNumeros.length >= 3 && apenasNumeros === termo.replace(/[-./\s]/g, "")) {
          const termoFormatado = formatarCnaeInput(apenasNumeros);
          const resultado = await supabase
            .from("cnae_item_lc")
            .select("cnae, cnae_mascara, cnae_descricao, grau_risco")
            .ilike("cnae_mascara", `${termoFormatado}%`)
            .limit(10);

          data = resultado.data;
          error = resultado.error;
        } else {
          const resultado = await supabase
            .from("cnae_item_lc")
            .select("cnae, cnae_mascara, cnae_descricao, grau_risco")
            .ilike("cnae_descricao", `%${termo}%`)
            .limit(10);

          data = resultado.data;
          error = resultado.error;
        }

        if (error) throw error;

        const cnaesUnicos = Array.from(new Map((data || []).map((item) => [item.cnae, item])).values());

        setSugestoes(cnaesUnicos as CNAEItemLC[]);
        setMostrarSugestoes(cnaesUnicos.length > 0 && cnaeInput.trim().length >= 3);
      } catch (err) {
        console.error("Erro ao buscar sugestões:", err);
        setSugestoes([]);
        setMostrarSugestoes(false);
      } finally {
        setLoadingSugestoes(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cnaeInput]);

  // Buscar contagem de riscos ao carregar a página
  useEffect(() => {
    async function buscarContagemRisco() {
      try {
        // Busca todos os registros com paginação para superar o limite de 1000
        let allData: { cnae: number; grau_risco: string | null }[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const from = page * pageSize;
          const to = from + pageSize - 1;

          const { data, error } = await supabase
            .from("cnae_item_lc")
            .select("cnae, grau_risco")
            .range(from, to);

          if (error) throw error;

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            page++;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        // Agrupa CNAEs únicos
        const cnaesUnicos = new Map<number, string>();
        allData.forEach((item) => {
          if (!cnaesUnicos.has(item.cnae)) {
            cnaesUnicos.set(item.cnae, item.grau_risco || "");
          }
        });

        let baixo = 0;
        let medio = 0;
        let alto = 0;

        cnaesUnicos.forEach((grau) => {
          // Normaliza: remove acentos, converte para minúsculas e remove espaços
          const grauNormalizado = grau
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

          if (grauNormalizado === "baixo") baixo++;
          else if (grauNormalizado === "medio") medio++;
          else if (grauNormalizado === "alto") alto++;
        });

        setContagemRisco({ baixo, medio, alto, loading: false });
      } catch (err) {
        console.error("Erro ao buscar contagem:", err);
        setContagemRisco({ baixo: 0, medio: 0, alto: 0, loading: false });
      }
    }

    buscarContagemRisco();
  }, []);

  const buscarCNAE = useCallback(async () => {
    const termo = cnaeInput.trim();

    if (!termo) {
      setError("Por favor, digite um código CNAE ou uma descrição de atividade.");
      return;
    }

    setLoading(true);
    setResultados(null);
    setError(null);
    setCnaeSelecionado(0);
    setFilterRisk(null);

    try {
      let cnaeData;
      let cnaeError;

      const apenasNumeros = termo.replace(/\D/g, "");
      if (apenasNumeros.length >= 4 && apenasNumeros === termo.replace(/[-./\s]/g, "")) {
        const resultado = await supabase
          .from("cnae_item_lc")
          .select("*")
          .eq("cnae", parseInt(apenasNumeros));

        cnaeData = resultado.data;
        cnaeError = resultado.error;
      } else {
        const resultado = await supabase
          .from("cnae_item_lc")
          .select("*")
          .ilike("cnae_descricao", `%${termo}%`);

        cnaeData = resultado.data;
        cnaeError = resultado.error;
      }

      if (cnaeError) throw cnaeError;

      if (!cnaeData || cnaeData.length === 0) {
        setError(`Nenhum CNAE encontrado para "${termo}". Tente usar outras palavras-chave.`);
        setLoading(false);
        return;
      }

      const itensLc = [...new Set(cnaeData.map((item) => item.item_lc))];

      const { data: itensData, error: itensError } = await supabase
        .from("itens_lista_servicos")
        .select("*")
        .in("item_lc", itensLc);

      if (itensError) throw itensError;

      const { data: ibsData, error: ibsError } = await supabase.from("item_lc_ibs_cbs").select("*").in("item_lc", itensLc);

      if (ibsError) throw ibsError;

      setResultados({
        cnaeData: cnaeData as CNAEItemLC[],
        itensData: (itensData || []) as ItemListaServicos[],
        ibsData: (ibsData || []) as ItemLCIBSCBS[],
      });
    } catch (err) {
      console.error("Erro:", err);
      setError(`Erro ao consultar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }, [cnaeInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!mostrarSugestoes || sugestoes.length === 0) {
      if (e.key === "Enter") {
        buscarCNAE();
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
          buscarCNAE();
        }
        break;
      case "Escape":
        setMostrarSugestoes(false);
        setSugestaoSelecionada(-1);
        break;
    }
  };

  const selecionarSugestao = async (cnae: CNAEItemLC) => {
    const codigoCnae = cnae.cnae.toString();
    suppressSugestoesRef.current = true;
    setCnaeInput(formatarCnaeInput(codigoCnae));
    setSugestoes([]);
    setMostrarSugestoes(false);
    setSugestaoSelecionada(-1);

    setLoading(true);
    setResultados(null);
    setError(null);
    setCnaeSelecionado(0);

    try {
      const { data: cnaeData, error: cnaeError } = await supabase
        .from("cnae_item_lc")
        .select("*")
        .eq("cnae", parseInt(codigoCnae));

      if (cnaeError) throw cnaeError;

      if (!cnaeData || cnaeData.length === 0) {
        setError(`CNAE ${codigoCnae} não encontrado na base de dados.`);
        setLoading(false);
        return;
      }

      const itensLc = [...new Set(cnaeData.map((item) => item.item_lc))];

      const { data: itensData, error: itensError } = await supabase
        .from("itens_lista_servicos")
        .select("*")
        .in("item_lc", itensLc);

      if (itensError) throw itensError;

      const { data: ibsData, error: ibsError } = await supabase.from("item_lc_ibs_cbs").select("*").in("item_lc", itensLc);

      if (ibsError) throw ibsError;

      setResultados({
        cnaeData: cnaeData as CNAEItemLC[],
        itensData: (itensData || []) as ItemListaServicos[],
        ibsData: (ibsData || []) as ItemLCIBSCBS[],
      });
    } catch (err) {
      console.error("Erro:", err);
      setError(`Erro ao consultar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  // Agrupa CNAEs únicos e aplica filtros/ordenação
  let cnaesUnicos = resultados
    ? Array.from(new Map(resultados.cnaeData.map((item) => [item.cnae, item])).values())
    : [];

  // Filtrar por risco
  if (filterRisk) {
    cnaesUnicos = cnaesUnicos.filter((cnae) => {
      const grau = cnae.grau_risco?.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return grau === filterRisk.toUpperCase();
    });
  }

  // Ordenar
  if (sortBy === "codigo") {
    cnaesUnicos.sort((a, b) => a.cnae - b.cnae);
  } else if (sortBy === "risco") {
    const riscoOrder = { "ALTO": 3, "MÉDIO": 2, "MEDIO": 2, "BAIXO": 1 };
    cnaesUnicos.sort((a, b) => {
      const riscoA = riscoOrder[a.grau_risco?.toUpperCase() as keyof typeof riscoOrder] || 0;
      const riscoB = riscoOrder[b.grau_risco?.toUpperCase() as keyof typeof riscoOrder] || 0;
      return riscoB - riscoA;
    });
  }

  const primeiro = cnaesUnicos[cnaeSelecionado];

  const dadosCNAEAtual = resultados?.cnaeData.filter((item) => item.cnae === primeiro?.cnae) || [];

  const itensMap: Record<string, string> = {};
  resultados?.itensData.forEach((item) => {
    itensMap[item.item_lc] = item.descricao;
  });

  const ibsPorItem: Record<string, ItemLCIBSCBS[]> = {};
  resultados?.ibsData.forEach((item) => {
    if (!ibsPorItem[item.item_lc]) {
      ibsPorItem[item.item_lc] = [];
    }
    ibsPorItem[item.item_lc].push(item);
  });

  // Filtra apenas itens LC que não são null
  const itensLcUnicos = dadosCNAEAtual
    ? [...new Set(dadosCNAEAtual.map((item) => item.item_lc).filter((item) => item !== null))]
    : [];

  // Verifica se o CNAE tem itens de serviço vinculados
  const temItensServico = itensLcUnicos.length > 0;

  const explicacaoRisco = primeiro ? obterExplicacaoRisco(primeiro.grau_risco) : null;
  const detalhesLicenciamentoAtual = primeiro ? obterDetalhesLicenciamento(primeiro.grau_risco) : null;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pv-gray-100 to-white">
      <Header />
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl" data-search-root>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 mb-8 border-2 border-pv-blue-900/10">
          <label htmlFor="cnae-input" className="block text-base font-bold text-pv-blue-900 mb-2">
            Buscar por Código CNAE ou Descrição da Atividade
          </label>
          <p className="text-xs text-pv-blue-700/70 mb-4 flex items-center gap-1">
            <span className="text-lg">💡</span>
            <span>Dica: Digite um código CNAE (ex: 6201501) ou palavras-chave (ex: Atividade médica ambulatorial)</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                id="cnae-input"
                value={cnaeInput}
                onChange={(e) => {
                  setCnaeInput(formatarCnaeInput(e.target.value));
                  setSugestaoSelecionada(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (sugestoes.length > 0) setMostrarSugestoes(true);
                }}
                placeholder="Digite aqui para começar a busca..."
                autoComplete="off"
                className="w-full px-5 py-4 text-base border-2 border-pv-gray-200 rounded-xl bg-white text-pv-blue-900 placeholder:text-slate-400 focus:outline-none focus:border-pv-blue-900 focus:ring-4 focus:ring-pv-blue-900/10 transition font-poppins shadow-sm"
              />

              {loadingSugestoes && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-pv-gray-200 border-t-pv-blue-900 rounded-full animate-spin"></div>
                </div>
              )}

              {/* Dropdown de Sugestões */}
              {mostrarSugestoes && sugestoes.length > 0 && (
                <div className="dropdown-sugestoes absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-md border border-pv-blue-900/15 rounded-2xl shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] z-50 max-h-[440px] overflow-hidden ring-1 ring-pv-blue-900/10">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-pv-blue-900/10 bg-white/70">
                    <span className="text-xs font-semibold text-pv-blue-900 uppercase tracking-wide">Sugestoes</span>
                    <span className="text-xs text-pv-blue-700/70">{sugestoes.length} {sugestoes.length === 1 ? "resultado" : "resultados"}</span>
                  </div>
                  <div className="overflow-y-auto max-h-[360px] py-2">
                    {sugestoes.map((sugestao, index) => (
                      <button
                        key={sugestao.cnae}
                        onClick={() => selecionarSugestao(sugestao)}
                        onMouseEnter={() => setSugestaoSelecionada(index)}
                        className={`group w-full text-left px-4 py-3 transition-all rounded-xl mx-2 border border-transparent ${
                          sugestaoSelecionada === index
                            ? "bg-gradient-to-r from-pv-blue-900 to-pv-blue-700 text-white shadow-lg"
                            : "hover:bg-pv-blue-50/70"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border min-w-[76px] text-center ${
                            sugestaoSelecionada === index
                              ? "bg-white/15 text-white border-white/30"
                              : "bg-pv-yellow-500/20 text-pv-blue-900 border-pv-yellow-500/30"
                          }`}>
                            {corrigirEncoding(sugestao.cnae_mascara)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {renderizarGrauRisco(sugestao.grau_risco)}
                            </div>
                            <p className={`text-sm line-clamp-2 ${sugestaoSelecionada === index ? "text-white/90" : "text-pv-blue-900/80"}`}>
                              {highlightTexto(sugestao.cnae_descricao, cnaeInput)}
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
              onClick={buscarCNAE}
              disabled={loading}
              className="px-8 py-4 text-base font-bold bg-pv-yellow-500 text-pv-blue-900 rounded-xl hover:bg-yellow-400 transition disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Search size={20} />
              {loading ? "Consultando..." : "Buscar"}
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <StatisticsDashboard contagem={contagemRisco} onInfoClick={() => setIsRiskModalOpen(true)} />

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

        {/* Lista de CNAEs encontrados (quando há múltiplos) */}
        {resultados && cnaesUnicos.length > 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-pv-gray-200">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-pv-blue-900 mb-2">
                {cnaesUnicos.length} {cnaesUnicos.length === 1 ? "CNAE encontrado" : "CNAEs encontrados"}
              </h3>
              <p className="text-sm text-pv-blue-700/60 mb-4">
                Selecione um CNAE para ver os detalhes completos
              </p>

              {/* Filtros e Ordenação */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-pv-blue-700" />
                  <span className="text-sm font-semibold text-pv-blue-900">Filtrar por risco:</span>
                  <button
                    onClick={() => setFilterRisk(null)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === null ? "bg-pv-blue-900 text-white" : "bg-pv-gray-100 text-pv-blue-900 hover:bg-pv-gray-200"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFilterRisk("BAIXO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === "BAIXO" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    Baixo
                  </button>
                  <button
                    onClick={() => setFilterRisk("MEDIO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === "MEDIO" ? "bg-amber-500 text-white" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    Médio
                  </button>
                  <button
                    onClick={() => setFilterRisk("ALTO")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      filterRisk === "ALTO" ? "bg-red-500 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    Alto
                  </button>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <span className="text-sm font-semibold text-pv-blue-900">Ordenar:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-pv-gray-100 text-pv-blue-900 border border-pv-gray-200 hover:bg-pv-gray-200 transition"
                  >
                    <option value="relevancia">Relevância</option>
                    <option value="codigo">Código CNAE</option>
                    <option value="risco">Grau de Risco</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
              {cnaesUnicos.map((cnae, index) => (
                <button
                  key={cnae.cnae}
                  onClick={() => setCnaeSelecionado(index)}
                  className={`text-left p-5 rounded-xl border-2 transition-all ${
                    cnaeSelecionado === index
                      ? "border-pv-blue-900 bg-gradient-to-r from-pv-blue-50 to-pv-blue-100 shadow-lg scale-[1.02]"
                      : "border-pv-gray-200 bg-white hover:border-pv-blue-400 hover:bg-pv-gray-50 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-pv-blue-900 bg-pv-yellow-500/30 px-3 py-1 rounded-lg border border-pv-yellow-500/50">
                          {corrigirEncoding(cnae.cnae_mascara)}
                        </span>
                        {renderizarGrauRisco(cnae.grau_risco)}
                      </div>
                      <p className="text-sm text-pv-blue-900/80 line-clamp-2">
                        {corrigirEncoding(cnae.cnae_descricao)}
                      </p>
                    </div>
                    {cnaeSelecionado === index && (
                      <div className="shrink-0 w-8 h-8 bg-pv-blue-900 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Resultados - CNAE Selecionado */}
        {resultados && primeiro && (
          <div className="space-y-6">
            {/* CNAE Header Card */}
            <div className="bg-gradient-to-r from-pv-blue-900 to-pv-blue-700 text-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-2xl font-bold">CNAE {corrigirEncoding(primeiro.cnae_mascara)}</h2>
                      {renderizarGrauRisco(primeiro.grau_risco)}
                    </div>
                    <p className="text-white/90 text-base leading-relaxed">{corrigirEncoding(primeiro.cnae_descricao)}</p>
                  </div>
                  {cnaesUnicos.length > 1 && (
                    <div className="shrink-0 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                      <p className="text-sm text-white/90 font-bold">
                        {cnaeSelecionado + 1} de {cnaesUnicos.length}
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-2 text-sm text-white/80 flex-wrap">
                  {temItensServico && (
                    <>
                      <span className="bg-white/10 px-3 py-1 rounded-lg">{itensLcUnicos.length} Itens LC</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{primeiro.grau_risco ? `${primeiro.grau_risco} Risco` : "Não classificado"}</span>
                  {explicacaoRisco && (
                    <>
                      <span>•</span>
                      <span>{explicacaoRisco.itens[0].texto}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* What This Means Card - NEW! */}
            {explicacaoRisco && (
              <div className={`bg-white rounded-2xl shadow-xl border-l-4 overflow-hidden ${
                explicacaoRisco.classe === "baixo" ? "border-l-emerald-500" :
                explicacaoRisco.classe === "medio" ? "border-l-amber-500" : "border-l-red-500"
              }`}>
                <div className="px-6 py-6">
                  <h3 className="text-xl font-bold text-pv-blue-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    O Que Isso Significa Para Você?
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-pv-blue-900 mb-3">Licenciamento e Funcionamento</h4>
                      <ul className="space-y-2">
                        {explicacaoRisco.itens.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-pv-blue-900/80">
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm ${
                              item.tipo === "check" ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                            }`}>
                              {item.tipo === "check" ? "✓" : "✗"}
                            </span>
                            <span>{item.texto}</span>
                          </li>
                        ))}
                      </ul>
                      {detalhesLicenciamentoAtual && (
                        <button
                          onClick={() => setIsLicenciamentoModalOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-pv-blue-900 to-pv-blue-700 rounded-xl hover:from-pv-blue-800 hover:to-pv-blue-600 transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <FileText size={18} />
                          Ver detalhes completos de licenciamento
                          <ChevronDown size={16} className="-rotate-90" />
                        </button>
                      )}
                    </div>

                    <div className="pt-4 border-t border-pv-gray-200">
                      <h4 className="font-bold text-pv-blue-900 mb-2 flex items-center gap-2">
                        <span>💼</span>
                        Seu Negócio
                      </h4>
                      <p className="text-sm text-pv-blue-900/80">
                        <strong>Atividade:</strong> {corrigirEncoding(primeiro.cnae_descricao)}
                      </p>
                    </div>

                    {temItensServico && (
                      <div className="pt-4 border-t border-pv-gray-200">
                        <h4 className="font-bold text-pv-blue-900 mb-2 flex items-center gap-2">
                          <span>📊</span>
                          Impostos e Tributos
                        </h4>
                        <ul className="text-sm text-pv-blue-900/80 space-y-1">
                          <li>• <strong>ISS/NFS-e:</strong> Consulte os Itens LC abaixo para saber a tributação aplicável</li>
                          <li>• <strong>IBS/CBS (Reforma Tributária):</strong> Verifique os códigos NBS e INDOP nos detalhes dos itens</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Reference Grid */}
            <div className={`grid grid-cols-2 ${temItensServico ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
              <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 text-center shadow-md hover:shadow-lg transition">
                <label className="block text-xs font-bold text-pv-yellow-500 uppercase tracking-wide mb-2">Código</label>
                <span className="text-2xl font-bold text-pv-blue-900">{primeiro.cnae}</span>
              </div>
              <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 text-center shadow-md hover:shadow-lg transition">
                <label className="block text-xs font-bold text-pv-yellow-500 uppercase tracking-wide mb-2">Formato</label>
                <span className="text-2xl font-bold text-pv-blue-900">{primeiro.cnae_mascara}</span>
              </div>
              {temItensServico && (
                <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 text-center shadow-md hover:shadow-lg transition">
                  <label className="block text-xs font-bold text-pv-yellow-500 uppercase tracking-wide mb-2">Itens LC</label>
                  <span className="text-2xl font-bold text-pv-blue-900">{itensLcUnicos.length}</span>
                </div>
              )}
              <div className="bg-white rounded-xl border-2 border-pv-gray-200 p-4 text-center shadow-md hover:shadow-lg transition">
                <label className="block text-xs font-bold text-pv-yellow-500 uppercase tracking-wide mb-2">Risco</label>
                <div className="flex items-center justify-center">{renderizarGrauRisco(primeiro.grau_risco)}</div>
              </div>
            </div>

            {/* Itens da Lista de Serviços - só aparece se houver itens vinculados */}
            {temItensServico ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-pv-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <FileText size={24} className="text-pv-yellow-500" />
                    <h3 className="text-lg font-bold text-pv-blue-900">Itens da Lista de Serviços (LC 116/2003)</h3>
                    <Tooltip content="Lei Complementar 116/2003 define a lista de serviços sujeitos ao ISS (Imposto Sobre Serviços)">
                      <HelpCircle size={16} className="text-pv-blue-700/50" />
                    </Tooltip>
                  </div>
                </div>

                {itensLcUnicos.map((itemLc) => (
                  <AccordionItem
                    key={itemLc}
                    itemLc={itemLc}
                    descricao={itensMap[itemLc] || "Descrição não disponível"}
                    correlacoes={ibsPorItem[itemLc] || []}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-pv-gray-200">
                <div className="flex items-center gap-3 text-pv-blue-700/60">
                  <FileText size={24} className="text-pv-yellow-500/50" />
                  <div>
                    <h3 className="text-lg font-bold text-pv-blue-900/70">Sem Itens de Serviço Vinculados</h3>
                    <p className="text-sm">Este CNAE não possui itens da Lista de Serviços (LC 116/2003) associados.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Help Button */}
      <button
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-pv-blue-900 text-white rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center z-40 hover:bg-pv-blue-700"
        aria-label="Abrir ajuda"
      >
        <HelpCircle size={28} />
      </button>

      {/* Help Panel */}
      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Risk Info Modal */}
      <Modal isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} title="O que significa Grau de Risco?">
        <div className="space-y-4 text-sm text-pv-blue-900/80">
          <p>
            O <strong>Grau de Risco</strong> é uma classificação definida pela <strong>Resolução CGSIM nº 51/2019</strong> que determina
            os requisitos de licenciamento para abertura e funcionamento de atividades econômicas.
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <h4 className="font-bold text-emerald-700 mb-2 flex items-center gap-2">
                <ShieldCheck size={20} />
                Baixo Risco
              </h4>
              <p>Atividades dispensadas de licenciamento prévio. Você pode iniciar suas atividades imediatamente após o registro.</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-bold text-amber-700 mb-2 flex items-center gap-2">
                <ShieldAlert size={20} />
                Médio Risco
              </h4>
              <p>Você recebe um alvará provisório imediato e pode iniciar as atividades. Vistorias serão realizadas posteriormente.</p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
                <ShieldX size={20} />
                Alto Risco
              </h4>
              <p>Necessário obter licença ANTES de iniciar as atividades. Exige vistorias técnicas e aprovação formal dos órgãos competentes.</p>
            </div>
          </div>

          <p className="pt-4 border-t border-pv-gray-200 text-xs text-pv-blue-700/60">
            Esta classificação visa facilitar a abertura de empresas de baixo risco enquanto mantém controles adequados para atividades que representam maiores riscos à saúde, segurança e meio ambiente.
          </p>
        </div>
      </Modal>

      {/* Licenciamento Modal - Minimalista */}
      {detalhesLicenciamentoAtual && (
        <Modal
          isOpen={isLicenciamentoModalOpen}
          onClose={() => setIsLicenciamentoModalOpen(false)}
          title={`Licenciamento - ${detalhesLicenciamentoAtual.titulo}`}
        >
          <div className="space-y-8">
            {/* Header minimalista */}
            <div className="text-center pb-6 border-b border-pv-gray-200">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                primeiro?.grau_risco?.toUpperCase() === "BAIXO"
                  ? "bg-emerald-100"
                  : primeiro?.grau_risco?.toUpperCase() === "MEDIO" || primeiro?.grau_risco?.toUpperCase() === "MÉDIO"
                  ? "bg-amber-100"
                  : "bg-red-100"
              }`}>
                {primeiro?.grau_risco?.toUpperCase() === "BAIXO" ? (
                  <ShieldCheck size={32} className="text-emerald-600" />
                ) : primeiro?.grau_risco?.toUpperCase() === "MEDIO" || primeiro?.grau_risco?.toUpperCase() === "MÉDIO" ? (
                  <ShieldAlert size={32} className="text-amber-600" />
                ) : (
                  <ShieldX size={32} className="text-red-600" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-pv-blue-900 mb-1">{detalhesLicenciamentoAtual.subtitulo}</h3>
              <p className="text-pv-blue-700/60">{detalhesLicenciamentoAtual.titulo}</p>
            </div>

            {/* O que isso significa */}
            <section>
              <h4 className="text-sm font-semibold text-pv-blue-900/50 uppercase tracking-wider mb-4">
                O que isso significa
              </h4>
              <div className="space-y-3">
                {detalhesLicenciamentoAtual.significados.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                      primeiro?.grau_risco?.toUpperCase() === "BAIXO"
                        ? "bg-emerald-100 text-emerald-700"
                        : primeiro?.grau_risco?.toUpperCase() === "MEDIO" || primeiro?.grau_risco?.toUpperCase() === "MÉDIO"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-pv-blue-900/80 pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Divider */}
            <hr className="border-pv-gray-200" />

            {/* Prazos e Custos */}
            <section>
              <h4 className="text-sm font-semibold text-pv-blue-900/50 uppercase tracking-wider mb-4">
                Prazos e Custos
              </h4>
              <div className="space-y-4">
                {detalhesLicenciamentoAtual.prazosCustos.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-pv-blue-900/40 mt-2.5"></span>
                    <div className="flex-1 space-y-2">
                      <p className="text-pv-blue-900/80">{item.texto}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative inline-flex items-center text-sm font-semibold text-pv-blue-900 before:pointer-events-none before:absolute before:left-0 before:top-[1.3em] before:h-[0.1em] before:w-full before:origin-right before:scale-x-0 before:bg-current before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] before:content-[''] hover:before:origin-left hover:before:scale-x-100"
                        >
                          Acessar
                          <svg
                            className="ml-[0.3em] size-[0.7em] translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                            fill="none"
                            viewBox="0 0 10 10"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path
                              d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004"
                              stroke="currentColor"
                              strokeWidth="1.25"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Divider */}
            <hr className="border-pv-gray-200" />

            {/* Documentos necessários */}
            <section>
              <h4 className="text-sm font-semibold text-pv-blue-900/50 uppercase tracking-wider mb-4">
                Documentos ou ações necessários
              </h4>
              <div className="space-y-4">
                {detalhesLicenciamentoAtual.documentos.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-pv-gray-50 rounded-xl">
                    <span className="shrink-0 w-8 h-8 rounded-lg bg-pv-blue-900 text-white flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-3">
                      <p className="text-pv-blue-900/80 font-medium">{item.texto}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative inline-flex items-center text-sm font-semibold text-pv-blue-900 before:pointer-events-none before:absolute before:left-0 before:top-[1.3em] before:h-[0.1em] before:w-full before:origin-right before:scale-x-0 before:bg-current before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.4,0,0.2,1)] before:content-[''] hover:before:origin-left hover:before:scale-x-100"
                        >
                          Acessar Portal
                          <svg
                            className="ml-[0.3em] size-[0.7em] translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                            fill="none"
                            viewBox="0 0 10 10"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path
                              d="M1.004 9.166 9.337.833m0 0v8.333m0-8.333H1.004"
                              stroke="currentColor"
                              strokeWidth="1.25"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Divider */}
            <hr className="border-pv-gray-200" />

            {/* Legislação */}
            <section>
              <h4 className="text-sm font-semibold text-pv-blue-900/50 uppercase tracking-wider mb-4">
                Legislação aplicável
              </h4>
              <div className="space-y-2">
                {detalhesLicenciamentoAtual.legislacao.map((item, idx) => (
                  <p key={idx} className="text-pv-blue-900/70 text-sm pl-4 border-l-2 border-pv-gray-300">
                    {item}
                  </p>
                ))}
              </div>
            </section>

            {/* Footer */}
            <div className="pt-4 border-t border-pv-gray-200">
              <p className="text-xs text-pv-blue-700/50 text-center">
                Informações baseadas na legislação vigente do município de Porto Velho - RO
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Overlay para Help Panel */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsHelpOpen(false)}
        ></div>
      )}

      <Footer />
    </div>
  );
}
