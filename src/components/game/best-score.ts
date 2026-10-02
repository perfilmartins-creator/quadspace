// Recorde do QUAD BOUNCE salvo no localStorage, exposto como store externo
// (para uso com useSyncExternalStore). Falhas de storage nunca quebram o jogo.

const STORAGE_KEY = "quad-bounce:best";

let cached: number | null = null;
const listeners = new Set<() => void>();

export function readBest(): number {
  if (cached === null) {
    let value = 0;
    try {
      value = Number.parseInt(window.localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    } catch {
      // Storage indisponível (modo privado, bloqueado etc.).
    }
    cached = Number.isFinite(value) && value > 0 ? value : 0;
  }
  return cached;
}

export function readServerBest(): number {
  return 0;
}

export function saveBest(value: number) {
  cached = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Mantém o recorde só nesta sessão.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeBest(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
