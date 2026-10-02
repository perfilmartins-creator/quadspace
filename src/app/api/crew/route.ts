import { experimental_upgradeWebSocket } from "@vercel/functions";
import { handleConnection } from "../../../../server/crew/hub";

// Servidor multiplayer do QUAD CREW rodando na própria Vercel (WebSocket).
// As salas ficam na memória da instância; ao atingir o tempo máximo da função
// a conexão fecha e o cliente reconecta na hora com o mesmo token.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
// São Paulo: menor latência para quem joga no Recife/Brasil.
export const preferredRegion = "gru1";

export async function GET(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  const origin = request.headers.get("origin");
  return experimental_upgradeWebSocket((ws) => handleConnection(ws as unknown as Parameters<typeof handleConnection>[0], { ip, origin }), {
    maxPayload: 8 * 1024,
  });
}
