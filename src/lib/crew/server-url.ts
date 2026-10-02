// Endereço do servidor multiplayer. Por padrão o próprio site (rota /api/crew
// na Vercel); NEXT_PUBLIC_CREW_SERVER_URL aponta para um servidor dedicado.

export const CREW_SERVER_URL = process.env.NEXT_PUBLIC_CREW_SERVER_URL ?? "";

/** O jogo está disponível (servidor na própria Vercel ou dedicado). */
export const CREW_AVAILABLE = true;
