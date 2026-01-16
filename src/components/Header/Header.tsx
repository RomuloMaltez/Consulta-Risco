"use client";

import { useState, useCallback, useEffect, useRef, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Instagram, Search } from "lucide-react";
import { WhatsappIcon } from "../icons/WhatsappIcon";

const SEARCH_ROOT_SELECTOR = "[data-search-root]";
const HIGHLIGHT_ATTRIBUTE = "data-search-highlight";
const HIGHLIGHT_CLASS_NAME = "site-search-highlight";

const getSearchRoots = () => {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLElement>(SEARCH_ROOT_SELECTOR));
};

const openDetailsAncestors = (element: HTMLElement) => {
  let parent: HTMLElement | null = element.parentElement;
  while (parent) {
    if (parent instanceof HTMLDetailsElement) {
      parent.open = true;
    }
    parent = parent.parentElement;
  }
};

const collectTextNodes = (root: HTMLElement): Text[] => {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (
        parent.closest(`[${HIGHLIGHT_ATTRIBUTE}]`) ||
        parent.closest("[data-search-ignore='true']") ||
        parent.closest("script, style") ||
        parent.closest("[aria-hidden='true']")
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let currentNode = walker.nextNode();
  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  return nodes;
};

const highlightNodeMatches = (node: Text, normalizedTerm: string, hits: HTMLElement[]) => {
  if (!node.data || !normalizedTerm) return;
  const termLength = normalizedTerm.length;
  let currentNode = node;
  let remainingText = currentNode.data;
  let matchIndex = remainingText.toLowerCase().indexOf(normalizedTerm);

  while (matchIndex !== -1) {
    const matchNode = currentNode.splitText(matchIndex);
    const afterMatchNode = matchNode.splitText(termLength);
    const highlight = document.createElement("mark");
    highlight.className = HIGHLIGHT_CLASS_NAME;
    highlight.setAttribute(HIGHLIGHT_ATTRIBUTE, "true");
    highlight.setAttribute("tabindex", "-1");
    matchNode.parentNode?.insertBefore(highlight, matchNode);
    highlight.appendChild(matchNode);
    openDetailsAncestors(highlight);
    hits.push(highlight);
    currentNode = afterMatchNode;
    remainingText = currentNode.data ?? "";
    matchIndex = remainingText.toLowerCase().indexOf(normalizedTerm);
  }
};

const highlightMatches = (term: string) => {
  if (typeof document === "undefined") return [];
  const normalizedTerm = term.toLowerCase();
  if (!normalizedTerm) return [];
  const hits: HTMLElement[] = [];
  const roots = getSearchRoots();
  roots.forEach((root) => {
    const textNodes = collectTextNodes(root);
    textNodes.forEach((node) => highlightNodeMatches(node, normalizedTerm, hits));
  });
  return hits;
};

const clearHighlights = () => {
  if (typeof document === "undefined") return;
  const highlights = document.querySelectorAll<HTMLElement>(`mark[${HIGHLIGHT_ATTRIBUTE}]`);
  highlights.forEach((highlight) => {
    const parent = highlight.parentNode;
    if (!parent) return;
    const textContent = highlight.textContent ?? "";
    parent.replaceChild(document.createTextNode(textContent), highlight);
    if (parent instanceof Element || parent instanceof DocumentFragment) {
      parent.normalize();
    }
  });
  getSearchRoots().forEach((root) => root.normalize());
};

export default function Header() {
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchFormRef = useRef<HTMLFormElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, 4000);
  }, []);

  const handleSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedQuery = query.trim();

      if (trimmedQuery.length < 3) {
        clearHighlights();
        showFeedback("Por favor, informe ao menos 3 caracteres para buscar.");
        return;
      }

      if (typeof document === "undefined") {
        showFeedback("Não foi possível executar a busca.");
        return;
      }

      const hasSearchableContent = getSearchRoots().length > 0;
      if (!hasSearchableContent) {
        showFeedback("Não há conteúdo disponível para pesquisa nesta página.");
        return;
      }

      clearHighlights();
      const hits = highlightMatches(trimmedQuery);

      if (!hits.length) {
        showFeedback("Nenhum resultado encontrado.");
        return;
      }

      const firstHit = hits[0];
      firstHit.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof firstHit.focus === "function") {
        firstHit.focus({ preventScroll: true });
      }

      showFeedback(hits.length === 1 ? "1 resultado encontrado." : `${hits.length} resultados encontrados.`);
    },
    [query, showFeedback]
  );

  useEffect(() => {
    if (!query.trim()) {
      clearHighlights();
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchFormRef.current &&
        !searchFormRef.current.contains(e.target as Node) &&
        searchButtonRef.current &&
        !searchButtonRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      clearHighlights();
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-2 py-2 lg:grid lg:grid-cols-[200px_minmax(0,1fr)_240px] lg:items-center lg:gap-4">
          {/* Logo */}
          <div className="order-1 flex w-full items-center justify-center lg:order-1 lg:w-auto lg:justify-center">
            <Link href="/" aria-label="Ir para a página inicial da SEMEC Porto Velho" className="shrink-0">
              <Image
                src="/logo-semec.svg"
                alt="Logo SEMEC Porto Velho"
                width={144}
                height={144}
                className="h-28 w-auto lg:h-36"
                priority
              />
            </Link>
          </div>

          {/* Ilustração */}
          <div className="order-3 flex w-full items-center justify-center lg:order-2">
            <Image
              src="/PortoVelhoPintura.svg"
              alt="Ilustração de Porto Velho"
              width={800}
              height={200}
              className="w-full h-auto max-h-44 lg:max-h-56 xl:max-h-64"
              priority
            />
          </div>

          {/* Ícones e Busca */}
          <div className="order-2 flex flex-col gap-3 lg:order-3 lg:items-center">
            <div className="flex w-full items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                {/* Instagram */}
                <a
                  href="https://www.instagram.com/semec.pvh/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram da SEMEC"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-rose-100 bg-rose-50 text-[#E1306C] shadow-sm transition hover:border-rose-200 hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E1306C]"
                >
                  <Instagram size={24} aria-hidden />
                </a>
                {/* WhatsApp */}
                <a
                  href="https://api.whatsapp.com/send?phone=556999425251"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp da SEMEC"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                >
                  <WhatsappIcon size={24} aria-hidden />
                </a>
                {/* Botão de Busca */}
                <button
                  ref={searchButtonRef}
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  aria-label="Abrir busca"
                  className="inline-flex h-14 w-14 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pv-blue-900"
                >
                  <Search size={24} aria-hidden />
                </button>
              </div>
            </div>
            {/* Formulário de Busca Retrátil */}
            {isSearchOpen && (
              <form
                ref={searchFormRef}
                className="absolute top-[80px] left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
                onSubmit={handleSearch}
                aria-label="Barra de busca do portal"
              >
                <div className="flex w-full items-center rounded-md border border-slate-200 bg-white shadow-lg focus-within:border-pv-blue-900 focus-within:ring-2 focus-within:ring-pv-blue-900/10">
                  <label htmlFor="site-search" className="sr-only">
                    O que você procura?
                  </label>
                  <span className="pl-3 text-slate-500">
                    <Search size={18} aria-hidden />
                  </span>
                  <input
                    id="site-search"
                    name="search"
                    type="search"
                    minLength={3}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="O que você procura?"
                    className="w-full border-0 bg-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded-r-md bg-pv-yellow-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
                  >
                    Buscar
                  </button>
                </div>
                {feedback && <p className="mt-2 text-xs font-medium text-pv-blue-900">{feedback}</p>}
              </form>
            )}
          </div>
        </div>
      </header>
      {/* Faixa verde/amarela */}
      <div aria-hidden="true" className="h-5 w-full border-b-4 border-[#FFDD00] bg-pv-green-600" />
    </>
  );
}
