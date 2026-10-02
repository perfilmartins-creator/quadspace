// Recorde global (de todos os jogadores), lido de /api/game/record e exposto
// como store externo para useSyncExternalStore. Se a API falhar, o jogo
// continua normalmente usando só o recorde local.

const ENDPOINT = "/api/game/record";

/** null = ainda não carregado ou indisponível. */
let globalBest: number | null = null;
let runToken: string | null = null;
const listeners = new Set<() => void>();

function setGlobalBest(value: number) {
  if (value === globalBest) return;
  globalBest = value;
  listeners.forEach((listener) => listener());
}

export function readGlobalBest(): number | null {
  return globalBest;
}

export function readServerGlobalBest(): number | null {
  return null;
}

export function subscribeGlobalBest(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isValidBest(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Atualiza o recorde global e pega um token novo para a próxima partida. */
export async function refreshGlobalRecord() {
  try {
    const response = await fetch(ENDPOINT, { cache: "no-store" });
    if (!response.ok) return;
    const data: { best?: unknown; token?: unknown } = await response.json();
    if (typeof data.token === "string") runToken = data.token;
    if (isValidBest(data.best)) setGlobalBest(data.best);
  } catch {
    // Sem rede: segue com o recorde local.
  }
}

/** Envia a pontuação. Retorna se ela virou o novo recorde global (null = sem resposta). */
export async function submitGlobalScore(score: number): Promise<boolean | null> {
  const token = runToken;
  if (!token) return null;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, token }),
      keepalive: true,
    });
    if (!response.ok) return null;
    const data: { best?: unknown; isRecord?: unknown } = await response.json();
    if (isValidBest(data.best)) setGlobalBest(data.best);
    return data.isRecord === true;
  } catch {
    return null;
  }
}
