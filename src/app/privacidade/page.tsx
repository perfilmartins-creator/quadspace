import type { Metadata } from "next";
import Link from "next/link";
import { contact, site } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <main className="container-edit py-32 md:py-40">
      <Link
        href="/"
        className="text-sm text-ink-soft transition-colors hover:text-ink"
      >
        ← Voltar para o site
      </Link>

      <h1 className="mt-8 text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
        Política de privacidade
      </h1>

      <div className="mt-10 max-w-2xl space-y-6 leading-relaxed text-ink-soft">
        <p>
          A {site.name} coleta apenas os dados que você envia diretamente por
          e-mail, WhatsApp ou Instagram para tratar de reservas e dúvidas
          sobre o estúdio. Não vendemos nem compartilhamos esses dados com
          terceiros.
        </p>
        <p>
          O site não utiliza cookies de rastreamento nem ferramentas de
          publicidade. Eventuais dados de navegação ficam a cargo da
          infraestrutura de hospedagem, para fins exclusivos de segurança e
          desempenho.
        </p>
        <p>
          Para solicitar a exclusão de dados enviados por você, entre em
          contato em{" "}
          <a href={`mailto:${contact.email}`} className="underline">
            {contact.email}
          </a>
          .
        </p>
        <p className="text-sm text-ink-faint">
          Este texto é um resumo simples e não substitui uma política de
          privacidade revisada por um profissional jurídico.
        </p>
      </div>
    </main>
  );
}
