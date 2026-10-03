// Teste multi-cliente do LOBBY jogável e dos MODOS DE JOGO.
// Uso: CREW_AFK_MS=4000 CREW_AFK_SAFE_MS=7000 (servidor) e
//      CREW_URL=ws://localhost:3032 npx tsx server/crew/lobby-test.ts

import {
  BALL_SPAWN,
  COURT,
  READY_ZONE,
  SAFE_ZONE,
  LOBBY_OBJECTS,
} from "../../src/lib/crew/lobby";
import { Bot, sleep } from "./test-bot";

const PASSWORD = "QUAD123";
let failures = 0;
function check(cond: unknown, label: string) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}
async function until(fn: () => boolean, label: string, timeout = 15000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) {
      check(false, `timeout: ${label}`);
      return false;
    }
    await sleep(20);
  }
  return true;
}

async function makeRoom(names: string[], simultaneous = false) {
  const host = new Bot(names[0]);
  await host.connect();
  host.send({ type: "create", name: host.name, password: PASSWORD });
  await until(() => !!host.state, "host recebeu estado");
  const others = names.slice(1).map((n) => new Bot(n));
  await Promise.all(others.map((b) => b.connect()));
  if (simultaneous)
    for (const b of others)
      b.send({
        type: "join",
        code: host.code,
        password: PASSWORD,
        name: b.name,
      });
  else
    for (const b of others) {
      b.send({
        type: "join",
        code: host.code,
        password: PASSWORD,
        name: b.name,
      });
      await sleep(40);
    }
  const all = [host, ...others];
  await until(
    () => all.every((b) => b.state?.players.length === names.length),
    "todos no lobby",
  );
  await sleep(200);
  for (const b of all) b.syncPos();
  return all;
}
const closeAll = (all: Bot[]) => all.forEach((b) => b.close());
const pub = (b: Bot, id: string) => b.state!.players.find((p) => p.id === id)!;

async function testSpawnAndPresence() {
  console.log("\n# Entrada simultânea de 8 jogadores e spawn");
  const all = await makeRoom(
    ["Gabriel", "Joao", "Martins", "Lucas", "Ana", "Bia", "Caio", "Duda"],
    true,
  );
  const pos = all.map((b) => b.entity(b.playerId)!);
  let minDist = Infinity;
  for (let i = 0; i < pos.length; i++)
    for (let j = i + 1; j < pos.length; j++)
      minDist = Math.min(
        minDist,
        Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y),
      );
  check(
    minDist > 30,
    `ninguém nasce em cima do outro (menor distância ${Math.round(minDist)})`,
  );
  check(
    new Set(all[0].state!.players.map((p) => p.id)).size === 8,
    "sem jogadores duplicados",
  );
  check(
    all[0].lastSnap.filter((e) => e[0] === "@ball").length === 1,
    "existe exatamente uma bola",
  );
  const ballA = all[0].entity("@ball")!;
  const ballB = all[7].entity("@ball")!;
  check(
    ballA.x === ballB.x && ballA.y === ballB.y,
    "todos veem a bola no mesmo lugar",
  );
  check(
    all[1].fx.some((f) => f.kind === "joined"),
    "aviso de entrada recebido",
  );
  closeAll(all);
}

async function testSafeZone() {
  console.log("\n# Safe Zone");
  const [a, b] = await makeRoom(["Gabriel", "Joao"]);
  await b.walkTo({ x: SAFE_ZONE.x, y: SAFE_ZONE.y });
  await until(
    () => pub(a, b.playerId).safe === true,
    "João na Safe Zone (visto pelo Gabriel)",
  );
  check(b.you.missionsDone >= 0, "missões presentes no estado");
  await b.walkTo({ x: SAFE_ZONE.x + SAFE_ZONE.r + 60, y: SAFE_ZONE.y });
  await until(
    () => pub(a, b.playerId).safe === false,
    "saiu da Safe Zone: flag desligada",
  );
  closeAll([a, b]);
}

/** Corre de `from` até `through` passando pela bola (chute). Dá a volta para não esbarrar nela antes. */
async function kick(bot: Bot, from: { x: number; y: number }, through: { x: number; y: number }) {
  bot.syncPos();
  const ball = bot.entity("@ball") ?? from;
  let side = bot.pos.y > ball.y ? 1 : -1;
  if (ball.y + side * 170 < 60 || ball.y + side * 170 > 940) side = -side;
  const detourY = Math.min(940, Math.max(60, ball.y + side * 170));
  const fx = Math.min(1340, Math.max(60, from.x));
  await bot.walkTo({ x: bot.pos.x, y: detourY });
  await bot.walkTo({ x: fx, y: detourY });
  await bot.walkTo(from);
  await bot.runStraight(from);
  await bot.runStraight(through);
}

/** Chuta a bola na direção de `target`. */
async function kickToward(bot: Bot, target: { x: number; y: number }) {
  const b = bot.entity("@ball")!;
  const dx = target.x - b.x;
  const dy = target.y - b.y;
  const d = Math.hypot(dx, dy) || 1;
  await kick(bot, { x: b.x - (dx / d) * 110, y: b.y - (dy / d) * 110 }, { x: b.x + (dx / d) * 25, y: b.y + (dy / d) * 25 });
}

async function testBallAndGoal() {
  console.log("\n# Bola, missão de chutes e gol");
  const [a, b] = await makeRoom(["Gabriel", "Joao"]);
  const ball0 = a.entity("@ball")!;
  check(
    Math.abs(ball0.x - BALL_SPAWN.x) < 2 &&
      Math.abs(ball0.y - BALL_SPAWN.y) < 2,
    "bola começa no centro",
  );
  // Primeiro chute: a bola anda para a direita.
  await kick(
    a,
    { x: BALL_SPAWN.x - 140, y: BALL_SPAWN.y },
    { x: BALL_SPAWN.x + 10, y: BALL_SPAWN.y },
  );
  await sleep(300);
  const ball1 = b.entity("@ball")!;
  check(
    ball1.x > BALL_SPAWN.x + 20,
    `bola recebeu impulso para a direita (x=${ball1.x})`,
  );
  check(
    b.fx.some((f) => f.kind === "hit"),
    "outro jogador recebeu o evento de chute",
  );
  check(
    a.you.mission?.id === "hit-3" && a.you.mission.progress >= 1,
    `missão de chutes avançou (${a.you.mission?.progress}/3)`,
  );

  // Continua empurrando até o gol da direita.
  const goalsBefore = a.state!.lobby.score.red;
  for (let i = 0; i < 16 && a.state!.lobby.score.red === goalsBefore; i++) {
    await kickToward(a, { x: COURT.x + COURT.w + 30, y: BALL_SPAWN.y });
    await sleep(1200);
  }
  await until(
    () => a.state!.lobby.score.red === goalsBefore + 1,
    "GOL marcado no gol da direita",
    4000,
  );
  check(
    b.fx.some((f) => f.kind === "goal" && f.score.red === goalsBefore + 1),
    "todos receberam o GOOOL com placar",
  );
  check(
    a.fx.filter((f) => f.kind === "goal").length === 1,
    "gol contado uma única vez",
  );
  await sleep(400);
  const reset = a.entity("@ball")!;
  check(
    Math.abs(reset.x - BALL_SPAWN.x) < 3,
    "bola voltou ao centro depois do gol",
  );
  const still1 = a.entity("@ball")!;
  await sleep(300);
  const still2 = a.entity("@ball")!;
  check(still1.x === still2.x && still1.y === still2.y, "bola fica parada um pouco depois do gol");
  // Completa a missão de 3 chutes.
  await sleep(2200);
  for (let i = 0; i < 4 && a.you.missionsDone < 1; i++) {
    await kickToward(a, { x: BALL_SPAWN.x, y: COURT.y + 40 });
    await sleep(600);
  }
  check(a.you.missionsDone >= 1, `missão "acerte a bola 3 vezes" concluída (${a.you.xp} XP)`);
  check(a.fx.some((f) => f.kind === "mission"), "aviso de MISSÃO CONCLUÍDA");

  // Dois jogadores acertando a bola quase ao mesmo tempo.
  await sleep(2500);
  await Promise.all([
    kick(
      a,
      { x: BALL_SPAWN.x - 120, y: BALL_SPAWN.y - 4 },
      { x: BALL_SPAWN.x, y: BALL_SPAWN.y },
    ),
    kick(
      b,
      { x: BALL_SPAWN.x + 120, y: BALL_SPAWN.y + 4 },
      { x: BALL_SPAWN.x, y: BALL_SPAWN.y },
    ),
  ]);
  await sleep(1500);
  const after = a.entity("@ball")!;
  const inField =
    after.x >= COURT.x - 60 &&
    after.x <= COURT.x + COURT.w + 60 &&
    after.y >= COURT.y - 5 &&
    after.y <= COURT.y + COURT.h + 5;
  check(
    inField,
    `chute simultâneo: bola continua dentro da quadra (${after.x}, ${after.y})`,
  );

  // Bola batendo na parede: chuta para cima.
  await sleep(1000);
  const bp = a.entity("@ball")!;
  await kick(a, { x: bp.x, y: bp.y + 120 }, { x: bp.x, y: bp.y - 10 });
  await sleep(2000);
  const wall = a.entity("@ball")!;
  check(
    wall.y >= COURT.y + 10,
    `bola rebateu na lateral e não atravessou (y=${wall.y})`,
  );

  // Host reseta a bola; não-host não consegue.
  b.send({ type: "resetBall" });
  await sleep(200);
  a.send({ type: "resetBall" });
  await sleep(300);
  const r = a.entity("@ball")!;
  check(
    Math.abs(r.x - BALL_SPAWN.x) < 3 && Math.abs(r.y - BALL_SPAWN.y) < 3,
    "host reseta a bola",
  );
  closeAll([a, b]);
}

async function testReadyModesCountdown() {
  console.log("\n# READY, modo de jogo, contagem e cancelamento");
  const all = await makeRoom(["Gabriel", "Joao", "Martins", "Lucas"]);
  const [host, j, m, l] = all;
  // Ready zone
  await j.walkTo({
    x: READY_ZONE.x + READY_ZONE.w / 2,
    y: READY_ZONE.y + READY_ZONE.h / 2,
  });
  await until(
    () => pub(host, j.playerId).ready === true,
    "READY ZONE: João ficou pronto depois de ~1 s",
    4000,
  );
  await j.walkTo({ x: READY_ZONE.x - 80, y: READY_ZONE.y + 40 });
  await sleep(300);
  check(pub(host, j.playerId).ready === true, "sair da zona não tira o READY");
  m.send({ type: "ready", ready: true });
  await until(() => pub(host, m.playerId).ready, "READY pelo botão");
  m.send({ type: "ready", ready: false });
  await sleep(400);
  m.send({ type: "ready", ready: false });
  await until(() => !pub(host, m.playerId).ready, "NÃO PRONTO pelo botão");

  // Modo: só o host muda.
  j.send({ type: "settings", settings: { gameMode: "hide_seek" } });
  await sleep(300);
  check(
    host.state!.settings.gameMode === "classic",
    "não-host não muda o modo",
  );
  host.send({ type: "settings", settings: { gameMode: "hide_seek" } });
  await until(
    () => all.every((b) => b.state!.settings.gameMode === "hide_seek"),
    "todos veem HIDE & SEEK na hora",
  );
  check(
    l.fx.some((f) => f.kind === "mode" && f.mode === "hide_seek"),
    "aviso MODO ALTERADO recebido",
  );
  host.send({ type: "preset", preset: "rapido" });
  await until(
    () => host.state!.settings.preset === "rapido",
    "preset RÁPIDO aplicado",
  );
  check(
    host.state!.settings.matchTime === 105,
    "preset alterou várias configurações",
  );
  host.send({ type: "settings", settings: { killCooldown: 20 } });
  await until(
    () => host.state!.settings.preset === "custom",
    "ajuste manual vira CUSTOM",
  );
  host.send({ type: "settings", settings: { gameMode: "classic" } });

  // Só quando todos estiverem READY.
  host.send({ type: "settings", settings: { requireAllReady: true } });
  await until(
    () => host.state!.settings.requireAllReady,
    "opção iniciar só com todos READY",
  );
  host.send({ type: "start" });
  await sleep(400);
  check(host.state!.phase === "lobby", "não inicia sem todos READY");
  for (const b of all) b.send({ type: "ready", ready: true });
  await until(() => host.state!.players.every((p) => p.ready), "todos READY");

  // Contagem e cancelamento.
  host.send({ type: "start" });
  await until(
    () => all.every((b) => b.state!.phase === "countdown"),
    "contagem começou para todos",
  );
  host.send({ type: "start" });
  await sleep(100);
  check(
    host.state!.countdownEndsAt !== null,
    "start repetido não cria segundo countdown",
  );
  // Ainda dá para andar durante a contagem.
  const before = j.entity(j.playerId)!;
  await j.walkTo({ x: before.x - 60, y: before.y });
  await sleep(150);
  const moved = host.entity(j.playerId)!;
  check(
    Math.abs(moved.x - before.x) > 30,
    "jogadores andam durante a contagem",
  );
  j.send({ type: "cancelStart" });
  await sleep(300);
  check(host.state!.phase === "countdown", "não-host não cancela");
  host.send({ type: "cancelStart" });
  await until(
    () => all.every((b) => b.state!.phase === "lobby"),
    "PARTIDA CANCELADA: todos de volta ao lobby",
  );
  check(
    j.fx.some((f) => f.kind === "cancel"),
    "aviso de cancelamento recebido",
  );

  // Jogador essencial cai durante a contagem → cancela.
  host.send({ type: "start" });
  await until(() => host.state!.phase === "countdown", "contagem de novo");
  l.send({ type: "leave" });
  await until(
    () => host.state!.phase === "lobby",
    "saída durante a contagem cancela (menos de 4 jogadores)",
  );
  closeAll(all);
}

async function testClassicFlowAndReturn() {
  console.log("\n# Clássico → resultado → volta ao lobby → nova partida");
  const all = await makeRoom(["Gabriel", "Joao", "Martins", "Lucas"]);
  const [host] = all;
  host.send({
    type: "settings",
    settings: { killCooldown: 10, discussionTime: 0 },
  });
  const kickBall = all[1];
  await kick(
    kickBall,
    { x: BALL_SPAWN.x - 120, y: BALL_SPAWN.y },
    { x: BALL_SPAWN.x, y: BALL_SPAWN.y },
  );
  host.send({ type: "start" });
  await until(
    () => all.every((b) => b.state!.phase === "playing"),
    "partida clássica começou",
    9000,
  );
  const roles = all.map((b) => b.you.role);
  check(
    roles.filter((r) => r === "infiltrator").length === 1,
    "exatamente 1 infiltrado",
  );
  check(
    all.every((b) => b.lastSnap.every((e) => e[0] !== "@ball")),
    "bola não existe dentro da partida",
  );
  check(
    all.every((b) => !b.state!.players.some((p) => p.safe)),
    "Safe Zone não vaza para a partida",
  );
  const round = host.state!.round;
  // Infiltrado abandona → fim.
  const inf = all.find((b) => b.you.role === "infiltrator")!;
  inf.send({ type: "leave" });
  const rest = all.filter((b) => b !== inf);
  await until(
    () => rest.every((b) => b.state!.phase === "ended"),
    "partida terminou",
  );
  check(rest[0].state!.end?.mode === "classic", "resultado informa o modo");
  // Qualquer jogador leva todos ao lobby.
  rest[1].send({ type: "backToLobby" });
  await until(
    () => rest.every((b) => b.state!.phase === "lobby"),
    "todos voltaram ao lobby",
  );
  const s = rest[0].state!;
  check(
    s.players.every((p) => p.alive && !p.ready && !p.role),
    "estado da partida limpo (vivos, sem role, não prontos)",
  );
  check(s.settings.killCooldown === 10, "configurações mantidas");
  check(s.code === host.code, "mesmo código de sala");
  await sleep(200);
  const ball = rest[0].entity("@ball")!;
  check(
    Math.abs(ball.x - BALL_SPAWN.x) < 3 && Math.abs(ball.y - BALL_SPAWN.y) < 3,
    "bola reapareceu resetada",
  );
  // Entra mais um para iniciar de novo.
  const extra = new Bot("Novo");
  await extra.connect();
  extra.send({
    type: "join",
    code: host.code,
    password: PASSWORD,
    name: "Novo",
  });
  const all2 = [...rest, extra];
  await until(
    () => all2.every((b) => b.state?.players.length === 4),
    "novo jogador no lobby",
  );
  const newHost = all2.find((b) => b.state!.hostId === b.playerId)!;
  newHost.send({ type: "start" });
  await until(
    () => all2.every((b) => b.state!.phase === "playing"),
    "nova partida começou",
    9000,
  );
  check(
    all2[0].state!.round === round + 1,
    "rodada nova (sem eventos antigos)",
  );
  closeAll(all2);
}

async function testHideSeek() {
  console.log("\n# Hide & Seek");
  const all = await makeRoom(["Gabriel", "Joao", "Martins", "Lucas"]);
  const [host] = all;
  host.send({
    type: "settings",
    settings: {
      gameMode: "hide_seek",
      hideTime: 5,
      matchTime: 60,
      killCooldown: 10,
      taskTimeBonus: 3,
    },
  });
  await until(
    () => host.state!.settings.hideTime === 5,
    "configurações do H&S",
  );
  host.send({ type: "start" });
  await until(
    () => all.every((b) => b.state!.phase === "playing"),
    "partida H&S começou",
    9000,
  );
  const hunter = all.find((b) => b.you.role === "infiltrator")!;
  const runners = all.filter((b) => b !== hunter);
  check(
    all.filter((b) => b.you.role === "infiltrator").length === 1,
    "exatamente 1 caçador",
  );
  check(
    runners.every(
      (b) =>
        b.state!.players.find((p) => p.id === hunter.playerId)?.role ===
        "infiltrator",
    ),
    "todos sabem quem é o caçador",
  );
  check(
    !!host.state!.timer && host.state!.timer.releaseAt !== null,
    "cronômetro e liberação do caçador",
  );
  check(
    hunter.you.speed === host.state!.settings.hunterSpeed,
    "velocidade do caçador aplicada",
  );
  await until(
    () => Date.now() > host.state!.frozenUntil + 200,
    "fim da revelação",
    6000,
  );
  for (const b of all) b.syncPos();
  // Caçador preso até ser liberado.
  const p0 = { ...hunter.pos };
  hunter.send({ type: "move", x: p0.x + 20, y: p0.y });
  await sleep(300);
  const p1 = host.entity(hunter.playerId)!;
  check(Math.abs(p1.x - p0.x) < 2, "caçador não anda antes de ser liberado");
  // Reunião não existe.
  runners[0].send({ type: "emergency" });
  await sleep(200);
  check(host.state!.phase === "playing", "sem reuniões no H&S");
  await until(
    () => Date.now() > (host.state!.timer?.releaseAt ?? 0) + 300,
    "CAÇADOR LIBERADO",
    8000,
  );
  hunter.syncPos();
  for (const victim of runners) {
    victim.syncPos();
    await hunter.walkTo({ x: victim.pos.x + 20, y: victim.pos.y }, 1.5);
    await until(() => Date.now() > hunter.you.killReadyAt, "recarga", 12000);
    hunter.syncPos();
    victim.syncPos();
    await hunter.walkTo({ x: victim.pos.x + 20, y: victim.pos.y }, 1.5);
    hunter.send({ type: "kill", targetId: victim.playerId });
    await until(
      () => victim.you.alive === false || host.state!.phase === "ended",
      `${victim.name} foi pego`,
      4000,
    );
    check(host.state!.bodies.length === 0, "sem corpos no H&S");
    if (host.state!.phase === "ended") break;
  }
  await until(() => host.state!.phase === "ended", "fim do H&S", 5000);
  check(
    host.state!.end?.winner === "infiltrator" &&
      host.state!.end.reason === "caught",
    "caçador venceu por pegar todos",
  );
  host.send({ type: "backToLobby" });
  closeAll(all);
}

async function testHideSeekTime() {
  console.log("\n# Hide & Seek por tempo e Infecção");
  const all = await makeRoom(["Gabriel", "Joao", "Martins", "Lucas"]);
  const [host] = all;
  host.send({
    type: "settings",
    settings: { gameMode: "hide_seek", hideTime: 5, matchTime: 60 },
  });
  await until(() => host.state!.settings.gameMode === "hide_seek", "H&S");
  host.send({ type: "start" });
  await until(() => host.state!.phase === "playing", "partida", 9000);
  const endsAt = host.state!.timer!.endsAt;
  check(endsAt - Date.now() > 55_000, "cronômetro da partida configurado");
  // (Fim por tempo levaria 60 s; aqui só confirmamos o cronômetro. O caçador abandona e os fugitivos vencem.)
  const hunter = all.find((b) => b.you.role === "infiltrator")!;
  hunter.send({ type: "leave" });
  const rest = all.filter((b) => b !== hunter);
  await until(
    () =>
      rest[0].state!.phase === "ended" && rest[0].state!.end?.winner === "crew",
    "fugitivos vencem se o caçador sai",
  );
  rest[0].send({ type: "backToLobby" });
  await until(() => rest[0].state!.phase === "lobby", "lobby");
  const extra = new Bot("Novo");
  await extra.connect();
  extra.send({
    type: "join",
    code: host.code,
    password: PASSWORD,
    name: "Novo",
  });
  const all2 = [...rest, extra];
  await until(
    () => all2.every((b) => b.state?.players.length === 4),
    "4 no lobby",
  );
  const newHost = all2.find((b) => b.state!.hostId === b.playerId)!;
  newHost.send({
    type: "settings",
    settings: { gameMode: "infection", matchTime: 60, killCooldown: 10 },
  });
  await until(
    () => newHost.state!.settings.gameMode === "infection",
    "modo infecção",
  );
  newHost.send({ type: "start" });
  await until(
    () => all2.every((b) => b.state!.phase === "playing"),
    "infecção começou",
    9000,
  );
  await until(
    () => Date.now() > newHost.state!.frozenUntil + 3300,
    "infectado pronto",
    9000,
  );
  for (const b of all2) b.syncPos();
  const zero = all2.find((b) => b.you.role === "infiltrator")!;
  const target = all2.find((b) => b !== zero)!;
  target.syncPos();
  await zero.walkTo({ x: target.pos.x + 20, y: target.pos.y }, 1.5);
  zero.send({ type: "kill", targetId: target.playerId });
  await until(
    () => target.you.role === "infiltrator",
    "quem é pego vira INFECTADO",
  );
  check(target.you.alive, "infectado continua vivo (e caçando)");
  check(
    newHost.state!.players.filter((p) => p.role === "infiltrator").length === 2,
    "todos veem 2 infectados",
  );
  closeAll(all2);
}

async function testEmotesInteractAfkHost() {
  console.log("\n# Emotes, interações, AFK e troca de host");
  const all = await makeRoom(["Gabriel", "Joao", "Martins"]);
  const [host, j, m] = all;
  j.send({ type: "emote", emote: "wave" });
  j.send({ type: "emote", emote: "fire" });
  await sleep(400);
  check(
    host.emotes.filter((e) => e.playerId === j.playerId).length === 1,
    "emote chega a todos com anti-spam",
  );
  const coffee = LOBBY_OBJECTS.find((o) => o.id === "coffee")!;
  await m.walkTo(coffee.pos);
  m.send({ type: "interact", objectId: "coffee" });
  await sleep(300);
  check(
    host.fx.some((f) => f.kind === "coffee"),
    "interação com a máquina de café",
  );
  m.send({ type: "interact", objectId: "tv" });
  await sleep(300);
  check(
    !host.fx.some((f) => f.kind === "tv"),
    "interação longe do objeto é ignorada",
  );
  // AFK (servidor de teste com CREW_AFK_MS=4000 e CREW_AFK_SAFE_MS=7000).
  await until(() => pub(host, m.playerId).afk, "jogador parado vira AFK", 9000);
  await until(
    () => pub(host, m.playerId).safe,
    "AFK longo vai para a Safe Zone",
    9000,
  );
  m.syncPos();
  await m.walkTo({ x: m.pos.x + 200, y: m.pos.y });
  await until(
    () => !pub(host, m.playerId).afk && !pub(host, m.playerId).safe,
    "voltou a andar: sai do AFK e da Safe Zone",
  );
  // Transferência manual e automática de host.
  host.send({ type: "transferHost", playerId: j.playerId });
  await until(
    () => host.state!.hostId === j.playerId,
    "host transferido manualmente",
  );
  j.close();
  await until(
    () => host.state!.hostId !== j.playerId,
    "host caiu: novo host após alguns segundos",
    15000,
  );
  check(
    host.fx.some((f) => f.kind === "host"),
    "aviso de NOVO HOST",
  );
  closeAll(all);
}

async function main() {
  const t0 = Date.now();
  const only = process.argv[2];
  const tests: [string, () => Promise<void>][] = [
    ["spawn", testSpawnAndPresence],
    ["safe", testSafeZone],
    ["ball", testBallAndGoal],
    ["ready", testReadyModesCountdown],
    ["classic", testClassicFlowAndReturn],
    ["hide", testHideSeek],
    ["time", testHideSeekTime],
    ["social", testEmotesInteractAfkHost],
  ];
  for (const [name, fn] of tests) {
    if (only && only !== name) continue;
    try {
      await fn();
    } catch (error) {
      failures++;
      console.log(`  ✗ erro em ${name}:`, error);
    }
  }
  console.log(
    failures === 0
      ? `\nTUDO OK em ${Math.round((Date.now() - t0) / 1000)}s`
      : `\n${failures} FALHA(S)`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

void main();
