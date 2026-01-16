"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { informacoesRisco } from "@/data/cnae-data";

interface SearchModalProps {
  tipo: "baixo" | "medio" | "alto" | null;
  onClose: () => void;
}

export default function SearchModal({ tipo, onClose }: SearchModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (tipo) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "auto";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [tipo, onClose]);

  if (!tipo) return null;

  const info = informacoesRisco[tipo];

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 pb-5 border-b-2 border-slate-200">
          <div className="flex items-center gap-2.5 text-xl md:text-2xl font-bold text-slate-800">
            <span>{info.titulo}</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:rotate-90"
          >
            <X size={24} />
          </button>
        </div>

        <div className="text-slate-600 leading-relaxed">
          <div className={`modal-badge ${tipo}`}>{info.badge}</div>

          {info.secoes.map((secao, index) => (
            <div key={index} className="mb-6">
              <h3 className="text-base md:text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                {secao.titulo}
              </h3>
              <ul className="list-none pl-0">
                {secao.itens.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className="py-2 pl-6 relative text-sm md:text-base before:content-['•'] before:absolute before:left-2 before:font-bold before:text-lg"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
