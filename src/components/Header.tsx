"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { nav, site } from "@/config/site";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || isMenuOpen
          ? "border-line bg-paper"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="container-edit flex items-center justify-between py-5">
        <Link
          href="#hero"
          className="flex items-center gap-2.5"
          aria-label={`${site.name} — início`}
        >
          <Image
            src="/brand/estrelas-preto.png"
            alt=""
            width={48}
            height={14}
          />
          <span className="text-lg tracking-tight whitespace-nowrap text-ink">
            QUAD SPACE
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-6 lg:flex lg:gap-8"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#reserva"
            className="hidden border border-ink bg-ink px-5 py-2.5 text-sm text-paper transition-colors hover:bg-paper hover:text-ink sm:inline-block"
          >
            Reservar
          </a>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-mobile"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex h-11 w-11 items-center justify-center border border-ink lg:hidden"
          >
            <span className="relative block h-3 w-4">
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-px bg-ink transition-transform duration-300 ${
                  isMenuOpen ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 h-px bg-ink transition-transform duration-300 ${
                  isMenuOpen ? "-translate-y-[6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        className={`overflow-hidden bg-paper transition-[max-height] duration-300 ease-out lg:hidden ${
          isMenuOpen ? "max-h-[32rem]" : "max-h-0"
        }`}
      >
        <nav
          aria-label="Navegação mobile"
          className="container-edit flex flex-col gap-1 border-t border-line py-6"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="border-b border-line py-3 text-lg text-ink"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#reserva"
            onClick={() => setIsMenuOpen(false)}
            className="mt-4 border border-ink bg-ink px-5 py-3 text-center text-sm text-paper"
          >
            Reservar
          </a>
        </nav>
      </div>
    </header>
  );
}
