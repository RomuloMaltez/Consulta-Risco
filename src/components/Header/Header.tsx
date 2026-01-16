import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";
import { WhatsappIcon } from "../icons/WhatsappIcon";

export default function Header() {
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
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Faixa verde/amarela */}
      <div aria-hidden="true" className="h-5 w-full border-b-4 border-[#FFDD00] bg-pv-green-600" />
    </>
  );
}
