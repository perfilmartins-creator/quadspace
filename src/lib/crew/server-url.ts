// Endereço do servidor multiplayer (definido na Vercel por NEXT_PUBLIC_CREW_SERVER_URL).
// Sem ele, em produção, o jogo mostra "em breve" em vez de tentar conectar.

export const CREW_SERVER_URL = process.env.NEXT_PUBLIC_CREW_SERVER_URL ?? "";

/** O jogo pode conectar? (sempre em desenvolvimento, que usa o servidor local). */
export const CREW_AVAILABLE = CREW_SERVER_URL !== "" || process.env.NODE_ENV !== "production";
