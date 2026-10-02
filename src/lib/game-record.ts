// Recorde global do QUAD BOUNCE (compartilhado por todos os jogadores).
// Guardado como um JSON privado no Vercel Blob. Uso exclusivo do servidor
// (importado só pela rota /api/game/record).

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";

const RECORD_PATH = "quad-bounce/record.json";

/** Teto absoluto aceito para uma pontuação (em metros). */
const MAX_SCORE = 100_000;
/** Subida máxima possível no jogo é ~13 m/s; damos folga generosa. */
const MAX_METERS_PER_SECOND = 20;
const SCORE_GRACE = 20;
/** Validade do token de partida. */
const TOKEN_MAX_AGE_MS = 6 * 60 * 60 * 1000;

type StoredRecord = { best: number; updatedAt: string };

export function isRecordStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function secret() {
  return createHash("sha256")
    .update(`quad-bounce-run:${process.env.BLOB_READ_WRITE_TOKEN ?? ""}`)
    .digest();
}

function sign(issuedAt: number) {
  return createHmac("sha256", secret()).update(String(issuedAt)).digest("base64url");
}

/** Token assinado com o horário de início da partida. */
export function issueRunToken(now = Date.now()) {
  return `${now}.${sign(now)}`;
}

/** Valida o token e se a pontuação é possível no tempo decorrido. */
export function isPlausibleScore(score: number, token: string, now = Date.now()) {
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return false;
  const [issuedRaw, signature] = token.split(".");
  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt) || !signature) return false;

  const expected = Buffer.from(sign(issuedAt));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;

  const elapsed = now - issuedAt;
  if (elapsed < 0 || elapsed > TOKEN_MAX_AGE_MS) return false;
  return score <= (elapsed / 1000) * MAX_METERS_PER_SECOND + SCORE_GRACE;
}

async function readStored(): Promise<{ best: number; etag: string | null }> {
  const result = await get(RECORD_PATH, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) return { best: 0, etag: null };
  const data = (await new Response(result.stream).json()) as Partial<StoredRecord>;
  const best = Number.isInteger(data.best) && (data.best ?? 0) > 0 ? (data.best as number) : 0;
  return { best, etag: result.blob.etag };
}

export async function readRecord(): Promise<number> {
  return (await readStored()).best;
}

/**
 * Registra a pontuação se ela superar o recorde atual. Escrita condicional
 * (ETag) evita que dois recordes simultâneos se sobrescrevam.
 */
export async function submitRecord(score: number): Promise<{ best: number; isRecord: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readStored();
    if (score <= current.best) return { best: current.best, isRecord: false };

    const body: StoredRecord = { best: score, updatedAt: new Date().toISOString() };
    try {
      await put(RECORD_PATH, JSON.stringify(body), {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
        cacheControlMaxAge: 60,
        ...(current.etag ? { ifMatch: current.etag } : { allowOverwrite: false }),
      });
      return { best: score, isRecord: true };
    } catch (error) {
      // Outro jogador gravou ao mesmo tempo: relê e tenta de novo.
      if (error instanceof BlobPreconditionFailedError || isAlreadyExists(error)) continue;
      throw error;
    }
  }
  return { best: await readRecord(), isRecord: false };
}

function isAlreadyExists(error: unknown) {
  return error instanceof Error && /already exists/i.test(error.message);
}
