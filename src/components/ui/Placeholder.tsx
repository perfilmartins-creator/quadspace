type PlaceholderProps = {
  label: string;
  ratio?: "square" | "portrait" | "landscape";
  className?: string;
  tone?: "paper" | "ink";
};

const ratioClasses: Record<NonNullable<PlaceholderProps["ratio"]>, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-[4/3]",
};

export function Placeholder({
  label,
  ratio = "landscape",
  className = "",
  tone = "paper",
}: PlaceholderProps) {
  const toneClasses =
    tone === "ink"
      ? "bg-ink text-paper/70 [background-image:repeating-linear-gradient(135deg,rgba(251,249,244,0.06)_0px,rgba(251,249,244,0.06)_1px,transparent_1px,transparent_14px)]"
      : "bg-paper-dim text-ink-soft [background-image:repeating-linear-gradient(135deg,rgba(21,20,15,0.05)_0px,rgba(21,20,15,0.05)_1px,transparent_1px,transparent_14px)]";

  return (
    <div
      role="img"
      aria-label={`Imagem em breve: ${label}`}
      className={`relative flex items-end overflow-hidden border border-line ${ratioClasses[ratio]} ${toneClasses} ${className}`}
    >
      <span className="pointer-events-none absolute top-3 right-3 rounded-full border border-current/30 px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase opacity-60">
        Placeholder
      </span>
      <span className="relative z-10 px-4 py-3 text-sm">{label}</span>
    </div>
  );
}
