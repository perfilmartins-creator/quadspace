// Teste de ponta a ponta do servidor do QUAD CREW com vários clientes reais.
// Uso: CREW_URL=ws://localhost:3031 npx tsx server/crew/smoke-test.ts

import { CRITICAL_PANELS, EMERGENCY_POS, LIGHTS_PANEL, VENTS, taskById } from "../../src/lib/crew/map";
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

async function makeRoom(names: string[]) {
  const host = new Bot(names[0]);
  await host.connect();
  host.send({ type: "create", name: host.name, password: PASSWORD });
  await until(() => !!host.state, "host recebeu estado");
  const others: Bot[] = [];
  for (const n of names.slice(1)) {
    const b = new Bot(n);
    await b.connect();
    b.send({ type: "join", code: host.code, password: PASSWORD, name: n });
    others.push(b);
  }
  const all = [host, ...others];
  await until(() => all.every((b) => b.state?.players.length === names.length), "todos no lobby");
  return all;
}

async function startGame(all: Bot[]) {
  all[0].send({ type: "start" });
  await until(() => all.every((b) => b.state?.phase === "playing"), "partida começou", 8000);
  await until(() => Date.now() > all[0].state!.frozenUntil + 200, "fim da revelação", 6000);
  for (const b of all) b.syncPos();
}

// ---------- Cenários ----------

async function testJoinValidation() {
  console.log("\n# Entrada na sala e validações");
  const all = await makeRoom(["Gabriel", "Martins"]);
  const [host] = all;
  check(host.state!.hostId === host.playerId, "criador é o HOST");
  check(/^[A-HJ-NP-Z2-9]{4}$/.test(host.code), `código curto gerado (${host.code})`);

  const probe = new Bot("Probe");
  await probe.connect();
  probe.send({ type: "join", code: "ZZZZ", password: PASSWORD, name: "Lucas" });
  probe.send({ type: "join", code: host.code, password: "errada", name: "Lucas" });
  await sleep(300);
  probe.send({ type: "join", code: host.code, password: PASSWORD, name: "<b>x</b>" });
  await sleep(200);
  probe.send({ type: "join", code: host.code, password: PASSWORD, name: "martins" });
  await sleep(300);
  check(probe.errors.includes("ROOM_NOT_FOUND"), "sala não encontrada");
  check(probe.errors.includes("WRONG_PASSWORD"), "senha incorreta");
  check(probe.errors.includes("INVALID_NAME"), "nome inválido (HTML) rejeitado");
  check(probe.errors.includes("NAME_TAKEN"), "nome repetido rejeitado");

  host.send({ type: "settings", settings: { maxPlayers: 4 } });
  const c = new Bot("Lavinia");
  const d = new Bot("Joao");
  await c.connect();
  await d.connect();
  c.send({ type: "join", code: host.code, password: PASSWORD, name: c.name });
  d.send({ type: "join", code: host.code, password: PASSWORD, name: d.name });
  await until(() => !!c.state && !!d.state, "4 jogadores");
  probe.send({ type: "join", code: host.code, password: PASSWORD, name: "Lucas" });
  await sleep(300);
  check(probe.errors.includes("ROOM_FULL"), "sala cheia");

  const everyone = [...all, c, d];
  check(everyone.every((b) => b.raw.every((m) => !m.includes(PASSWORD))), "senha nunca enviada a nenhum cliente");

  host.send({ type: "settings", settings: { maxPlayers: 10 } });
  all[1].send({ type: "start" });
  await sleep(300);
  check(host.state!.phase === "lobby", "só o host pode iniciar");
  await startGame(everyone);
  probe.send({ type: "join", code: host.code, password: PASSWORD, name: "Lucas" });
  await sleep(300);
  check(probe.errors.includes("GAME_STARTED"), "partida já iniciada");
  for (const b of [...everyone, probe]) b.close();
}

async function testBruteForce() {
  console.log("\n# Proteção contra força bruta na senha");
  const [host] = await makeRoom(["Host"]);
  const attacker = new Bot("Atk");
  await attacker.connect();
  for (let i = 0; i < 12; i++) {
    attacker.send({ type: "join", code: host.code, password: `tentativa${i}`, name: "Atk" });
    await sleep(60);
  }
  await sleep(500);
  check(attacker.errors.includes("RATE_LIMITED"), "tentativas erradas em excesso são bloqueadas");
  host.close();
  attacker.close();
}

async function testFullGameAndPrivacy() {
  console.log("\n# Partida completa: papéis, privacidade, eliminação, report, votação");
  const all = await makeRoom(["Ana", "Bia", "Caio", "Davi", "Eva"]);
  const [host] = all;
  host.send({ type: "settings", settings: { discussionTime: 0, votingTime: 15, revealRoleOnEject: true, anonymousVotes: false } });
  await sleep(200);
  host.send({ type: "chat", channel: "lobby", text: "<script>alert(1)</script> oi" });
  await until(() => all.every((b) => b.chats.length > 0), "chat do lobby entregue");
  check(all[1].chats[0].text.includes("<script>"), "chat chega como texto (o cliente nunca interpreta HTML)");

  await startGame(all);
  const infiltrators = all.filter((b) => b.you.role === "infiltrator");
  const crew = all.filter((b) => b.you.role === "crew");
  check(infiltrators.length === 1 && crew.length === 4, "1 infiltrado para 5 jogadores");
  check(all.every((b) => b.you.tasks.length === 4), "cada jogador recebeu 4 tarefas");
  const leaks = crew.some((b) => b.raw.some((m) => m.includes('"role":"infiltrator"') && !m.includes(`"id":"${b.playerId}","role"`)));
  check(!leaks, "nenhum CREW recebe o papel de outro jogador");
  check(crew.every((b) => b.state!.players.every((p) => p.role === undefined)), "lista pública sem papéis");

  const impostor = infiltrators[0];
  const victim = crew[0];

  // Teletransporte não é aceito.
  const before = { ...impostor.pos };
  impostor.send({ type: "move", x: before.x + 600, y: before.y });
  await sleep(200);
  check(impostor.corrections > 0 && Math.abs(impostor.pos.x - before.x) < 200, `teletransporte é limitado pelo servidor (${Math.abs(impostor.pos.x - before.x).toFixed(0)} de 600)`);

  // Atravessar parede não é aceito (parede leste do lounge em x = 640).
  await impostor.walkTo({ x: 600, y: 800 });
  for (const x of [622, 644, 666, 688]) {
    impostor.send({ type: "move", x, y: 800 });
    await sleep(70);
  }
  await sleep(200);
  impostor.syncPos();
  check(impostor.pos.x <= 640 - 14 + 0.5, `não atravessa parede (x=${impostor.pos.x.toFixed(0)})`);

  // Cooldown inicial impede eliminação imediata.
  await impostor.walkTo({ x: victim.pos.x + 30, y: victim.pos.y });
  impostor.send({ type: "kill", targetId: victim.playerId });
  await sleep(300);
  check(victim.you.alive, "eliminação bloqueada durante cooldown inicial");

  await until(() => Date.now() >= impostor.you.killReadyAt, "cooldown acabar", 25000);
  // Fora do alcance.
  const farCrew = crew[1];
  impostor.send({ type: "kill", targetId: farCrew.playerId });
  await sleep(150);
  check(farCrew.you.alive, "eliminação fora do alcance é recusada");

  victim.syncPos();
  await impostor.walkTo({ x: victim.pos.x + 25, y: victim.pos.y });
  // Duas mensagens iguais em sequência (duplicação de evento).
  impostor.send({ type: "kill", targetId: victim.playerId });
  impostor.send({ type: "kill", targetId: victim.playerId });
  await until(() => victim.you.alive === false, "vítima eliminada");
  check(impostor.state!.bodies.length === 1, "apenas um corpo criado (sem duplicação)");
  check(victim.killed.includes(victim.playerId), "vítima recebeu o evento de eliminação");

  // Fantasma não aparece para vivos.
  await sleep(300);
  check(!crew[1].snapIds.has(victim.playerId), "vivos não recebem posição do fantasma");
  check(victim.snapIds.size === all.length, "fantasma vê todos");

  // Chat de fantasma só para mortos.
  victim.send({ type: "chat", channel: "ghost", text: "sou um fantasma" });
  await sleep(300);
  check(victim.chats.some((c) => c.channel === "ghost"), "fantasma recebe chat de fantasmas");
  check(!crew[1].chats.some((c) => c.channel === "ghost"), "vivos não recebem chat de fantasmas");

  // Report.
  const reporter = crew[1];
  const body = reporter.state!.bodies[0];
  await reporter.walkTo({ x: body.x + 40, y: body.y });
  reporter.send({ type: "report", bodyId: body.id });
  await until(() => all.every((b) => b.state?.phase === "meeting"), "reunião aberta");
  check(reporter.state!.meeting!.reason === "report", "reunião por report");
  check(reporter.state!.players.find((p) => p.id === victim.playerId)!.alive === false, "morte revelada na reunião");

  await until(() => host.state!.meeting?.stage === "voting", "votação liberada", 5000);
  victim.send({ type: "vote", target: impostor.playerId });
  reporter.send({ type: "chat", channel: "meeting", text: "foi ele!" });
  for (const b of all.filter((b) => b.you.alive)) {
    const target = b === impostor ? reporter.playerId : impostor.playerId;
    b.send({ type: "vote", target });
    b.send({ type: "vote", target: "skip" }); // voto duplicado é ignorado
  }
  await until(() => host.state!.meeting?.stage === "result", "resultado da votação", 5000);
  const result = host.state!.meeting!.result!;
  check(result.ejectedId === impostor.playerId, "infiltrado recebeu mais votos");
  check(result.tally[impostor.playerId] === 3, "votos duplicados e de mortos ignorados (3 votos)");
  check(!!result.votes, "votos visíveis quando não anônimos");
  check(all.some((b) => b.chats.some((c) => c.channel === "meeting")), "chat da reunião funcionando");

  await until(() => host.state!.phase === "ejecting", "expulsão", 6000);
  check(host.state!.eject?.role === "infiltrator", "papel revelado após votação");
  await until(() => host.state!.phase === "ended", "fim de partida", 8000);
  check(host.state!.end?.winner === "crew", "CREW venceu ao expulsar o infiltrado");
  check(host.state!.end?.infiltrators[0].id === impostor.playerId, "resultado mostra o infiltrado");
  check(crew[1].state!.players.every((p) => p.role !== undefined), "papéis revelados no fim");

  // Rematch: papéis redistribuídos.
  host.send({ type: "backToLobby" });
  await until(() => all.every((b) => b.state?.phase === "lobby" && b.you.role === null), "todos de volta ao lobby");
  const firstRound = host.state!.round;
  await startGame(all);
  check(host.state!.round === firstRound + 1, "nova rodada iniciada");
  check(all.filter((b) => b.you.role === "infiltrator").length === 1, "papéis redistribuídos");
  for (const b of all) b.close();
}

async function testTasksWin() {
  console.log("\n# Vitória por tarefas (validação de distância e duração)");
  const all = await makeRoom(["T1", "T2", "T3", "T4"]);
  all[0].send({ type: "settings", settings: { tasksPerPlayer: 2 } });
  await sleep(200);
  await startGame(all);
  const crew = all.filter((b) => b.you.role === "crew");
  const imp = all.find((b) => b.you.role === "infiltrator")!;

  // Concluir sem estar no local é recusado.
  const t0 = crew[0].you.tasks[0].id;
  crew[0].send({ type: "taskStart", taskId: t0 });
  crew[0].send({ type: "taskComplete", taskId: t0 });
  await sleep(300);
  check(!crew[0].you.tasks[0].done, "tarefa longe da estação é recusada");

  // Infiltrado concluindo tarefa falsa não conta no progresso.
  const fake = imp.you.tasks[0].id;
  await imp.walkTo(taskById(fake)!.pos);
  imp.send({ type: "taskStart", taskId: fake });
  await sleep(1700);
  imp.send({ type: "taskComplete", taskId: fake });
  await sleep(200);
  check(imp.state!.tasks.done === 0, "tarefas do infiltrado não contam");

  await Promise.all(
    crew.map(async (b) => {
      for (const t of b.you.tasks) {
        await b.walkTo(taskById(t.id)!.pos);
        b.send({ type: "taskStart", taskId: t.id });
        b.send({ type: "taskComplete", taskId: t.id }); // rápido demais: recusado
        await sleep(1700);
        b.send({ type: "taskComplete", taskId: t.id });
        b.send({ type: "taskComplete", taskId: t.id }); // duplicado
        await sleep(150);
      }
    }),
  );
  await until(() => all[0].state?.phase === "ended", "fim por tarefas", 20000);
  check(all[0].state!.end?.winner === "crew" && all[0].state!.end?.reason === "tasks", "CREW venceu por tarefas");
  check(all[0].state!.end?.tasksDone === 6, "contagem de tarefas sem duplicação (6/6)");
  for (const b of all) b.close();
}

async function testSabotage() {
  console.log("\n# Sabotagens: apagão, portas, sistema offline (correção em dupla)");
  const all = await makeRoom(["S1", "S2", "S3", "S4"]);
  await startGame(all);
  const imp = all.find((b) => b.you.role === "infiltrator")!;
  const crew = all.filter((b) => b.you.role === "crew");
  crew[0].send({ type: "sabotage", kind: "lights" });
  await sleep(200);
  check(!crew[0].state!.sabotage.lights, "CREW não pode sabotar");
  await until(() => Date.now() >= imp.you.sabotageReadyAt, "cooldown de sabotagem", 25000);

  imp.send({ type: "sabotage", kind: "lights" });
  await until(() => crew[0].state!.sabotage.lights, "apagão ativo");
  crew[0].send({ type: "fixLights" });
  await sleep(200);
  check(crew[0].state!.sabotage.lights, "não corrige longe do quadro de luz");
  await crew[0].walkTo(LIGHTS_PANEL);
  crew[0].send({ type: "fixLights" });
  await until(() => !crew[0].state!.sabotage.lights, "luzes corrigidas");

  // Força o cooldown para testar o crítico.
  await until(() => Date.now() >= imp.state!.you.sabotageReadyAt, "cooldown 2", 35000);
  imp.send({ type: "sabotage", kind: "critical" });
  await until(() => !!crew[0].state!.sabotage.critical, "sistema offline ativo");
  check(!!crew[0].state!.sabotage.critical && crew[0].state!.sabotage.critical.endsAt > Date.now(), "contagem do crítico");
  crew[1].send({ type: "emergency" });
  await sleep(200);
  check(crew[1].state!.phase === "playing", "não pode convocar reunião durante sabotagem crítica");

  const [a, b] = crew;
  await Promise.all([a.walkTo(CRITICAL_PANELS[0].pos), b.walkTo(CRITICAL_PANELS[1].pos)]);
  // Só um painel não resolve.
  a.send({ type: "panel", panelId: "servidor" });
  await sleep(1500);
  check(!!a.state!.sabotage.critical, "um painel sozinho não resolve");
  for (let i = 0; i < 4; i++) {
    a.send({ type: "panel", panelId: "servidor" });
    b.send({ type: "panel", panelId: "roteador" });
    await sleep(300);
  }
  await until(() => !a.state!.sabotage.critical, "sistema restaurado com dois jogadores");
  check(a.state!.phase === "playing", "partida continua");

  // Reunião de emergência na mesa central.
  await a.walkTo({ x: EMERGENCY_POS.x, y: EMERGENCY_POS.y - 70 });
  a.send({ type: "emergency" });
  await until(() => a.state!.phase === "meeting", "reunião de emergência");
  check(a.you.emergencyLeft === 0, "limite de 1 reunião por jogador");
  for (const x of all) x.close();
}

async function testCriticalTimeout() {
  console.log("\n# Sabotagem crítica não resolvida: infiltrado vence");
  const all = await makeRoom(["C1", "C2", "C3", "C4"]);
  await startGame(all);
  const imp = all.find((b) => b.you.role === "infiltrator")!;
  await until(() => Date.now() >= imp.you.sabotageReadyAt, "cooldown", 25000);
  imp.send({ type: "sabotage", kind: "critical" });
  await until(() => all[0].state?.phase === "ended", "fim por sabotagem", 50000);
  check(all[0].state!.end?.winner === "infiltrator" && all[0].state!.end?.reason === "sabotage", "infiltrado venceu por sabotagem");
  for (const x of all) x.close();
}

async function testReconnectAndHost() {
  console.log("\n# Reconexão, sessão duplicada e transferência de host");
  const all = await makeRoom(["R1", "R2", "R3", "R4"]);
  await startGame(all);
  const [host, p2] = all;
  const role = p2.you.role;

  // Queda breve de internet.
  p2.ws.terminate();
  await until(() => host.state!.players.find((p) => p.id === p2.playerId)?.connected === false, "jogador marcado como desconectado");
  check(host.state!.players.some((p) => p.id === p2.playerId), "não é removido imediatamente");
  const again = new Bot("R2");
  await again.connect();
  again.send({ type: "resume", code: p2.code, playerId: p2.playerId, token: p2.token });
  await until(() => !!again.state, "reconectou");
  check(again.playerId === p2.playerId && again.you.role === role, "volta à mesma partida com o mesmo papel");
  await until(() => host.state!.players.find((p) => p.id === p2.playerId)?.connected === true, "conectado de novo");

  // Token errado não reconecta.
  const thief = new Bot("thief");
  await thief.connect();
  thief.send({ type: "resume", code: p2.code, playerId: p2.playerId, token: "x".repeat(32) });
  await sleep(300);
  check(thief.errors.includes("SESSION_EXPIRED") && !thief.state, "token inválido é recusado");

  // Mesma sessão em outra aba substitui a antiga.
  const tab2 = new Bot("R2");
  await tab2.connect();
  tab2.send({ type: "resume", code: p2.code, playerId: p2.playerId, token: p2.token });
  await until(() => again.closed, "aba antiga desconectada");
  check(!!tab2.state, "nova aba assume a sessão");

  // Host sai: host é transferido, sala continua.
  host.send({ type: "leave" });
  await until(() => !!tab2.state && tab2.state.hostId !== host.playerId, "host transferido");
  check(tab2.state!.players.length === 3, "sala continua ativa sem o host original");
  for (const x of [...all, again, tab2, thief]) x.close();
}

async function testRaces() {
  console.log("\n# Condições de corrida");
  const host = new Bot("Host");
  await host.connect();
  host.send({ type: "create", name: "Host", password: PASSWORD });
  await until(() => !!host.state, "sala criada");
  const a = new Bot("Mesmo");
  const b = new Bot("Mesmo");
  await Promise.all([a.connect(), b.connect()]);
  a.send({ type: "join", code: host.code, password: PASSWORD, name: "Mesmo" });
  b.send({ type: "join", code: host.code, password: PASSWORD, name: "Mesmo" });
  await sleep(800);
  const joined = [a, b].filter((x) => !!x.state).length;
  check(joined === 1, "dois jogadores com o mesmo nome ao mesmo tempo: só um entra");

  // Criar sala duas vezes na mesma conexão.
  const c = new Bot("Dup");
  await c.connect();
  c.send({ type: "create", name: "Dup", password: PASSWORD });
  c.send({ type: "create", name: "Dup", password: PASSWORD });
  await sleep(600);
  const welcomes = c.raw.filter((m) => m.includes('"welcome"')).length;
  check(welcomes === 1, "criação duplicada na mesma conexão é ignorada");
  for (const x of [host, a, b, c]) x.close();
}

async function testVents() {
  console.log("\n# Dutos do infiltrado");
  const all = await makeRoom(["V1", "V2", "V3", "V4"]);
  await startGame(all);
  const imp = all.find((b) => b.you.role === "infiltrator")!;
  const crew = all.find((b) => b.you.role === "crew")!;
  const vent = VENTS[1]; // lounge, perto do spawn
  crew.send({ type: "vent", action: "enter" });
  await sleep(200);
  check(crew.you.vent === null, "CREW não entra em duto");
  imp.send({ type: "vent", action: "enter" });
  await sleep(200);
  check(imp.you.vent === null, "não entra em duto longe dele");
  await imp.walkTo(vent.pos);
  imp.send({ type: "vent", action: "enter" });
  await until(() => imp.you.vent === vent.id, "entrou no duto");
  await sleep(200);
  check(!crew.snapIds.has(imp.playerId), "infiltrado no duto some para os outros");
  imp.send({ type: "move", x: imp.pos.x + 20, y: imp.pos.y });
  await sleep(150);
  check(imp.you.vent === vent.id, "parado enquanto está no duto");
  imp.send({ type: "ventMove", ventId: "v-recepcao" });
  await sleep(200);
  check(imp.you.vent === vent.id, "não vai para duto não ligado");
  imp.send({ type: "ventMove", ventId: "v-equip" });
  await until(() => imp.you.vent === "v-equip", "andou pelo duto");
  imp.send({ type: "vent", action: "exit" });
  await until(() => imp.you.vent === null, "saiu do duto");
  await sleep(200);
  check(crew.snapIds.has(imp.playerId), "visível de novo ao sair");
  for (const x of all) x.close();
}

async function main() {
  const t0 = Date.now();
  await testJoinValidation();
  await testBruteForce();
  await testRaces();
  await testFullGameAndPrivacy();
  await testTasksWin();
  await testReconnectAndHost();
  await testVents();
  await testSabotage();
  await testCriticalTimeout();
  console.log(`\n${failures === 0 ? "TUDO OK" : `${failures} FALHA(S)`} em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
