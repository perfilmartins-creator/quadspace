import {
  isPlausibleScore,
  isRecordStorageConfigured,
  issueRunToken,
  readRecord,
  submitRecord,
} from "@/lib/game-record";

const noStore = { "Cache-Control": "no-store" };

function unavailable() {
  return Response.json({ error: "record-unavailable" }, { status: 503, headers: noStore });
}

/** Recorde global atual + token para a próxima partida. */
export async function GET() {
  if (!isRecordStorageConfigured()) return unavailable();
  try {
    const best = await readRecord();
    return Response.json({ best, token: issueRunToken() }, { headers: noStore });
  } catch (error) {
    console.error("[quad-bounce] falha ao ler recorde", error);
    return unavailable();
  }
}

/** Envia a pontuação de uma partida: { score, token }. */
export async function POST(request: Request) {
  if (!isRecordStorageConfigured()) return unavailable();

  let score: unknown;
  let token: unknown;
  try {
    ({ score, token } = await request.json());
  } catch {
    return Response.json({ error: "invalid-body" }, { status: 400, headers: noStore });
  }
  if (typeof score !== "number" || typeof token !== "string" || !isPlausibleScore(score, token)) {
    return Response.json({ error: "invalid-score" }, { status: 400, headers: noStore });
  }

  try {
    const result = await submitRecord(score);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    console.error("[quad-bounce] falha ao gravar recorde", error);
    return unavailable();
  }
}
