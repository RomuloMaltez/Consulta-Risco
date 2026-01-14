export interface CNAEItem {
  cnae: string;
  atividade: string;
  risco?: "alto" | "medio" | "baixo";
}

export interface RiscoInfo {
  titulo: string;
  badge: string;
  secoes: {
    titulo: string;
    itens: string[];
  }[];
}

export const informacoesRisco: Record<string, RiscoInfo> = {
  baixo: {
    titulo: "🟢 BAIXO RISCO",
    badge: "Dispensado de Licenciamento",
    secoes: [
      {
        titulo: "📋 O que isso significa:",
        itens: [
          "Dispensado de licenciamento prévio",
          "Não exige vistoria inicial",
          "Registro simplificado na Junta Comercial",
          "Certidão de Dispensa emitida automaticamente",
          "Processo de abertura ágil e desburocratizado",
        ],
      },
      {
        titulo: "⏱️ Prazos e Custos:",
        itens: [
          "Prazo: Imediato após registro",
          "Custo: Taxas de registro da JUCER, taxa Bombeiro e TFFR do município",
          "Sem necessidade de aguardar aprovações",
        ],
      },
      {
        titulo: "📄 Documentos ou ações necessários:",
        itens: [
          "Consulta prévia de viabilidade aprovada",
          "Obtenção da inscrição municipal",
          "Credenciamento para emissão de NFS-e",
          "Credenciamento ao Domicílio Tributário Eletrônico (DTEL)",
        ],
      },
      {
        titulo: "⚖️ Legislação aplicável:",
        itens: [
          "Lei Municipal nº 906/2022, 873/2022, 138/2001, 1.562/2003",
          "Decreto Municipal nº 19.577/2023, 16.482/2019",
          "Lei Federal nº 11.598/2007 (Redesim)",
        ],
      },
    ],
  },
  medio: {
    titulo: "🟡 MÉDIO RISCO",
    badge: "Alvará Provisório",
    secoes: [
      {
        titulo: "📋 O que isso significa:",
        itens: [
          "Alvará provisório emitido imediatamente",
          "Pode iniciar atividades no ato do registro",
          "Vistoria realizada em até 180 dias",
          "Deve atender normas sanitárias, ambientais e de segurança",
          "Prazo para regularização completa: 180 dias",
        ],
      },
      {
        titulo: "⏱️ Prazos e Custos:",
        itens: [
          "Alvará provisório: Imediato",
          "Vistoria: Até 180 dias após início",
          "Regularização: Até 180 dias, após esse prazo sem ação do município, o alvará vira definitivo",
          "Custo: Taxas de registro + de vistoria + de funcionamento + (de localização, se houver estabelecimento fixo) + (ambiental e sanitária, se houver atividade)",
        ],
      },
      {
        titulo: "📄 Documentos ou ações necessários:",
        itens: [
          "Consulta prévia de viabilidade aprovada",
          "Obtenção da inscrição municipal",
          "Alvará do Corpo de Bombeiros",
          "Alvará sanitário e ambiental (para algumas atividades)",
          "Demais autorizações específicas (para algumas atividades)",
        ],
      },
      {
        titulo: "⚖️ Legislação aplicável:",
        itens: [
          "Lei Municipal nº 906/2022, 873/2022, 138/2001, 1.562/2003",
          "Decreto Municipal nº 19.577/2023, 16.482/2019",
          "Resoluções específicas por atividade",
        ],
      },
    ],
  },
  alto: {
    titulo: "🔴 ALTO RISCO",
    badge: "Licença Prévia Obrigatória",
    secoes: [
      {
        titulo: "📋 O que isso significa:",
        itens: [
          "Licença prévia OBRIGATÓRIA antes de iniciar",
          "NÃO pode funcionar antes da aprovação",
          "Vistoria técnica prévia obrigatória",
          "Laudos técnicos especializados necessários",
          "Aprovação de múltiplos órgãos competentes, em especial o do Corpo de Bombeiros",
        ],
      },
      {
        titulo: "⏱️ Prazos e Custos:",
        itens: [
          "Análise: Até 90 dias",
          "Vistoria: Agendada após protocolo",
          "Aprovação final: Após cumprimento de exigências",
          "Custo: Taxas + laudos técnicos + adequações",
        ],
      },
      {
        titulo: "📄 Documentos necessários:",
        itens: [
          "Projeto completo de instalações",
          "Laudo técnico de segurança",
          "Licença ambiental (quando aplicável)",
          "Licença da Vigilância Sanitária (quando aplicável)",
          "Licença do Corpo de Bombeiros (obrigatório)",
          "Memorial descritivo das atividades",
          "ART/RRT dos responsáveis técnicos",
        ],
      },
      {
        titulo: "⚖️ Legislação aplicável:",
        itens: [
          "Lei Municipal nº 906/2022, 873/2022, 138/2001, 1.562/2003",
          "Decreto Municipal nº 19.577/2023, 16.482/2019",
          "Portarias específicas da Vigilância Sanitária",
          "Normas técnicas do Corpo de Bombeiros",
          "Legislação ambiental aplicável",
        ],
      },
    ],
  },
};

export function parseData(dataString: string): CNAEItem[] {
  return dataString
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const parts = line.split("|");
      if (parts.length === 2) {
        return {
          cnae: parts[0].trim(),
          atividade: parts[1].trim(),
        };
      }
      return null;
    })
    .filter((item): item is CNAEItem => item !== null);
}

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function obterInfoRisco(risco: string) {
  const infos: Record<string, { titulo: string; significado: string; detalhes: string }> = {
    alto: {
      titulo: "🔴 ALTO RISCO - Licença Prévia Obrigatória",
      significado: "O que isso significa?",
      detalhes: `Para atividades de <strong>ALTO RISCO</strong>, você precisa:<br>
                ✓ Obter licença ANTES de iniciar as atividades<br>
                ✓ Passar por vistorias técnicas dos órgãos competentes<br>
                ✓ Atender requisitos específicos de segurança, meio ambiente e vigilância sanitária<br>
                ✓ Aguardar aprovação formal para começar a funcionar`,
    },
    baixo: {
      titulo: "🟢 BAIXO RISCO - Dispensado de Licenciamento",
      significado: "O que isso significa?",
      detalhes: `Para atividades de <strong>BAIXO RISCO</strong>:<br>
                ✓ Você está DISPENSADO de licenciamento prévio<br>
                ✓ Pode iniciar as atividades imediatamente após registro<br>
                ✓ Não necessita de vistorias técnicas iniciais<br>
                ✓ Processo simplificado de abertura`,
    },
    medio: {
      titulo: "🟡 MÉDIO RISCO - Alvará Provisório",
      significado: "O que isso significa?",
      detalhes: `Para atividades de <strong>MÉDIO RISCO</strong>:<br>
                ✓ Você recebe um alvará provisório de IMEDIATO<br>
                ✓ Pode iniciar as atividades enquanto aguarda vistoria<br>
                ✓ Vistorias serão realizadas posteriormente<br>
                ✓ Deve atender normas específicas de sua atividade`,
    },
  };
  return infos[risco];
}
