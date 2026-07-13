"use client";

import { type FormEvent, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { booking, site } from "@/lib/content";

const productionTypes = [
  "Fotografia",
  "Audiovisual",
  "Campanha",
  "Produção de conteúdo",
  "Workshop / Reunião",
  "Outro",
];

export function Booking() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const type = String(form.get("type") ?? "");
    const date = String(form.get("date") ?? "");
    const message = String(form.get("message") ?? "");

    const subject = `Reserva QUAD SPACE — ${type || "Produção"}`;
    const body = [
      `Nome: ${name}`,
      `E-mail: ${email}`,
      `Tipo de produção: ${type}`,
      `Data pretendida: ${date}`,
      "",
      message,
    ].join("\n");

    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    setStatus("sent");
  }

  return (
    <section id="reserva" className="bg-ink py-28 text-paper md:py-40">
      <div className="container-edit">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="mb-6 text-sm tracking-tight text-paper/60">
              {booking.kicker}
            </p>
            <h2 className="mb-6 text-balance font-serif text-4xl leading-[1.05] tracking-tightest sm:text-5xl">
              {booking.title}
            </h2>
            <p className="max-w-sm text-balance leading-relaxed text-paper/70">
              {booking.body}
            </p>

            <dl className="mt-12 space-y-4 border-t border-line-on-ink pt-8 text-sm text-paper/70">
              <div className="flex justify-between gap-4">
                <dt>E-mail</dt>
                <dd>
                  <a href={`mailto:${site.email}`} className="hover:text-paper">
                    {site.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Telefone</dt>
                <dd>
                  <a href={`tel:${site.phone}`} className="hover:text-paper">
                    {site.phone}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Endereço</dt>
                <dd className="text-right">{site.address}</dd>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-span-6 lg:col-start-7">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field label="Nome" name="name" type="text" required />
                <Field label="E-mail" name="email" type="email" required />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="type"
                    className="mb-2 block text-sm text-paper/60"
                  >
                    Tipo de produção
                  </label>
                  <select
                    id="type"
                    name="type"
                    required
                    defaultValue=""
                    className="w-full border-b border-line-on-ink bg-transparent py-3 text-paper outline-none focus-visible:border-clay [&>option]:text-ink"
                  >
                    <option value="" disabled>
                      Selecione
                    </option>
                    {productionTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label="Data pretendida" name="date" type="date" required />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm text-paper/60"
                >
                  Mensagem
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="Conte um pouco sobre a produção"
                  className="w-full resize-none border-b border-line-on-ink bg-transparent py-3 text-paper placeholder:text-paper/30 outline-none focus-visible:border-clay"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-paper px-7 py-3.5 text-sm text-ink transition-colors hover:bg-clay hover:text-paper"
              >
                Enviar solicitação
              </button>

              <p role="status" className="text-sm text-paper/60">
                {status === "sent"
                  ? "Seu app de e-mail foi aberto com os dados preenchidos — confirme o envio por lá."
                  : "Ao enviar, abriremos seu aplicativo de e-mail com a mensagem pronta."}
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-paper/60">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="w-full border-b border-line-on-ink bg-transparent py-3 text-paper outline-none focus-visible:border-clay"
      />
    </div>
  );
}
