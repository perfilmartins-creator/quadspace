"use client";

import Link from "next/link";
import { useState } from "react";
import { nav, site } from "@/config/site";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="container-edit flex items-center justify-between py-5">
        <Link
          href="#hero"
          className="font-serif text-lg tracking-tight text-ink"
          aria-label={`${site.name} — início`}
        >
          QUAD SPACE
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-8 rounded-full border border-line/70 bg-paper/80 px-6 py-2.5 backdrop-blur-md md:flex"
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
            className="hidden rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-colors hover:bg-clay sm:inline-block"
          >
            Reservar
          </a>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="menu-mobile"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line/70 bg-paper/80 backdrop-blur-md md:hidden"
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
        className={`overflow-hidden bg-paper transition-[max-height] duration-300 ease-out md:hidden ${
          isMenuOpen ? "max-h-96" : "max-h-0"
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
            className="mt-4 rounded-full bg-ink px-5 py-3 text-center text-sm text-paper"
          >
            Reservar
          </a>
        </nav>
      </div>
    </header>
  );
}
