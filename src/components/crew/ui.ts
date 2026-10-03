// Linguagem visual cartoon do AMOUNG QUAD: contorno grosso, cantos redondos e
// "sombra sólida" embaixo, como peças de brinquedo.

export const INK = "#16172a";

/** Painel escuro com contorno e sombra sólida. */
export const panel = "rounded-2xl border-[3px] border-[#16172a] bg-[#262a45]/95 shadow-[0_4px_0_#16172a]";

/** Painel claro (cartões da tela inicial, modais). */
export const card = "rounded-3xl border-[3px] border-[#16172a] bg-[#2f3354] shadow-[0_6px_0_#16172a]";

/** Base dos botões "de brinquedo": afundam quando pressionados. */
export const toyButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-[#16172a] font-semibold shadow-[0_4px_0_#16172a] transition-[transform,box-shadow,opacity] duration-75 select-none touch-manipulation active:translate-y-[3px] active:shadow-[0_1px_0_#16172a] disabled:cursor-not-allowed disabled:saturate-[0.3] disabled:brightness-[0.6] disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_#16172a]";

export const btnPrimary = `${toyButton} bg-[#ffd23d] text-[#16172a]`;
export const btnBlue = `${toyButton} bg-[#4fb6ff] text-[#16172a]`;
export const btnGreen = `${toyButton} bg-[#3ddc84] text-[#16172a]`;
export const btnRed = `${toyButton} bg-[#ff4d5e] text-white`;
export const btnGhost = `${toyButton} bg-[#3a3f66] text-white`;

/** Campo de texto arredondado. */
export const input =
  "w-full rounded-xl border-[3px] border-[#16172a] bg-[#15172b] px-3 py-2.5 text-base text-white outline-none placeholder:text-white/30 focus:border-[#ffd23d]";
