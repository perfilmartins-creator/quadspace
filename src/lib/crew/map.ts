// Mapa da QUAD, recriado a partir das fotos do espaço (vista de cima).
//
//  +------------------------------+---------------------+
//  |           ESTÚDIO            |       EDIÇÃO        |
//  |  fundo infinito, softboxes,  D4  mesas em L,       |
//  |  cadeira, espelho            |  monitores          |
//  +--D1--------------D2----------+---------D3----------+
//  |    LOUNGE    |               CORREDOR              |
//  |  sofá, puff, D5  trilho de luz, quadro de luz      |
//  |  mesa central+------D6-------+-------D7------------+
//  |  (reunião)   | EQUIPAMENTOS  D8  RECEPÇÃO / COPA   |
//  |              | mesa Godox,   |  parede preta, mesa |
//  |              | carregadores  |  redonda, galão     |
//  +--------------+---------------+---------------------+

export const MAP_WIDTH = 1800;
export const MAP_HEIGHT = 1300;
export const WALL = 24;

export type Rect = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

export type RoomId = "estudio" | "edicao" | "lounge" | "corredor" | "equipamentos" | "recepcao";

export type Room = { id: RoomId; name: string; rect: Rect };

export const ROOMS: Room[] = [
  { id: "estudio", name: "ESTÚDIO", rect: { x: 0, y: 0, w: 1000, h: 520 } },
  { id: "edicao", name: "EDIÇÃO", rect: { x: 1000, y: 0, w: 800, h: 520 } },
  { id: "lounge", name: "LOUNGE", rect: { x: 0, y: 520, w: 640, h: 780 } },
  { id: "corredor", name: "CORREDOR", rect: { x: 640, y: 520, w: 1160, h: 240 } },
  { id: "equipamentos", name: "EQUIPAMENTOS", rect: { x: 640, y: 760, w: 540, h: 540 } },
  { id: "recepcao", name: "RECEPÇÃO", rect: { x: 1180, y: 760, w: 620, h: 540 } },
];

function hWall(x1: number, x2: number, y: number): Rect {
  return { x: x1, y: y - WALL / 2, w: x2 - x1, h: WALL };
}
function vWall(x: number, y1: number, y2: number): Rect {
  return { x: x - WALL / 2, y: y1, w: WALL, h: y2 - y1 };
}

export const WALLS: Rect[] = [
  // Contorno
  hWall(0, MAP_WIDTH, 0),
  hWall(0, MAP_WIDTH, MAP_HEIGHT),
  vWall(0, 0, MAP_HEIGHT),
  vWall(MAP_WIDTH, 0, MAP_HEIGHT),
  // y = 520 (estúdio/edição × lounge/corredor)
  hWall(0, 260, 520),
  hWall(380, 760, 520),
  hWall(880, 1360, 520),
  hWall(1480, MAP_WIDTH, 520),
  // x = 1000 (estúdio × edição)
  vWall(1000, 0, 200),
  vWall(1000, 320, 520),
  // x = 640 (lounge × corredor/equipamentos)
  vWall(640, 520, 590),
  vWall(640, 710, MAP_HEIGHT),
  // y = 760 (corredor × equipamentos/recepção)
  hWall(640, 840, 760),
  hWall(960, 1420, 760),
  hWall(1540, MAP_WIDTH, 760),
  // x = 1180 (equipamentos × recepção)
  vWall(1180, 760, 1040),
  vWall(1180, 1160, MAP_HEIGHT),
];

export type DoorId = "d1" | "d2" | "d3" | "d4" | "d5" | "d6" | "d7" | "d8";
export type Door = { id: DoorId; rect: Rect; rooms: [RoomId, RoomId] };

export const DOORS: Door[] = [
  { id: "d1", rect: hWall(260, 380, 520), rooms: ["estudio", "lounge"] },
  { id: "d2", rect: hWall(760, 880, 520), rooms: ["estudio", "corredor"] },
  { id: "d3", rect: hWall(1360, 1480, 520), rooms: ["edicao", "corredor"] },
  { id: "d4", rect: vWall(1000, 200, 320), rooms: ["estudio", "edicao"] },
  { id: "d5", rect: vWall(640, 590, 710), rooms: ["lounge", "corredor"] },
  { id: "d6", rect: hWall(840, 960, 760), rooms: ["corredor", "equipamentos"] },
  { id: "d7", rect: hWall(1420, 1540, 760), rooms: ["corredor", "recepcao"] },
  { id: "d8", rect: vWall(1180, 1040, 1160), rooms: ["equipamentos", "recepcao"] },
];

export type FurnitureKind =
  | "backdrop-chair"
  | "softbox"
  | "tripod"
  | "mirror"
  | "desk"
  | "chair"
  | "sofa"
  | "beanbag"
  | "meeting-table"
  | "side-table"
  | "table"
  | "shelf"
  | "chargers"
  | "case"
  | "round-table"
  | "water"
  | "counter";

export type Furniture = { kind: FurnitureKind; rect: Rect; solid: boolean };

/** Móveis principais (os sólidos bloqueiam o movimento). */
export const FURNITURE: Furniture[] = [
  // ESTÚDIO
  { kind: "backdrop-chair", rect: { x: 525, y: 180, w: 50, h: 50 }, solid: true },
  { kind: "softbox", rect: { x: 385, y: 235, w: 40, h: 40 }, solid: true },
  { kind: "softbox", rect: { x: 675, y: 235, w: 40, h: 40 }, solid: true },
  { kind: "tripod", rect: { x: 535, y: 410, w: 30, h: 30 }, solid: true },
  { kind: "mirror", rect: { x: 12, y: 110, w: 26, h: 150 }, solid: true },
  // EDIÇÃO
  { kind: "desk", rect: { x: 1060, y: 12, w: 400, h: 86 }, solid: true },
  { kind: "desk", rect: { x: 1700, y: 140, w: 88, h: 320 }, solid: true },
  { kind: "chair", rect: { x: 1180, y: 130, w: 40, h: 40 }, solid: true },
  { kind: "chair", rect: { x: 1620, y: 280, w: 40, h: 40 }, solid: true },
  // LOUNGE
  { kind: "sofa", rect: { x: 12, y: 690, w: 100, h: 330 }, solid: true },
  { kind: "beanbag", rect: { x: 150, y: 1130, w: 100, h: 100 }, solid: true },
  { kind: "meeting-table", rect: { x: 310, y: 820, w: 140, h: 80 }, solid: true },
  { kind: "side-table", rect: { x: 530, y: 1190, w: 56, h: 56 }, solid: true },
  // EQUIPAMENTOS
  { kind: "table", rect: { x: 700, y: 800, w: 200, h: 60 }, solid: true },
  { kind: "shelf", rect: { x: 652, y: 1236, w: 516, h: 52 }, solid: true },
  { kind: "chargers", rect: { x: 1120, y: 880, w: 48, h: 120 }, solid: true },
  { kind: "case", rect: { x: 960, y: 1080, w: 80, h: 44 }, solid: true },
  // RECEPÇÃO / COPA
  { kind: "round-table", rect: { x: 1394, y: 964, w: 72, h: 72 }, solid: true },
  { kind: "water", rect: { x: 1720, y: 784, w: 56, h: 56 }, solid: true },
  { kind: "counter", rect: { x: 1590, y: 1196, w: 198, h: 92 }, solid: true },
];

export const SOLIDS: Rect[] = [...WALLS, ...FURNITURE.filter((f) => f.solid).map((f) => f.rect)];

export type TaskId =
  | "ajustar-luz"
  | "montar-set"
  | "ajustar-camera"
  | "color-grading"
  | "exportar-projeto"
  | "sincronizar-audio"
  | "carregar-baterias"
  | "organizar-cartoes"
  | "conectar-cabos"
  | "organizar-equipamentos";

export type TaskStation = { id: TaskId; name: string; room: RoomId; pos: Point };

export const TASKS: TaskStation[] = [
  { id: "ajustar-luz", name: "Ajustar luz", room: "estudio", pos: { x: 440, y: 320 } },
  { id: "montar-set", name: "Montar set", room: "estudio", pos: { x: 550, y: 290 } },
  { id: "ajustar-camera", name: "Ajustar câmera", room: "estudio", pos: { x: 550, y: 475 } },
  { id: "color-grading", name: "Color grading", room: "edicao", pos: { x: 1150, y: 135 } },
  { id: "exportar-projeto", name: "Exportar projeto", room: "edicao", pos: { x: 1390, y: 135 } },
  { id: "sincronizar-audio", name: "Sincronizar áudio", room: "edicao", pos: { x: 1660, y: 220 } },
  { id: "carregar-baterias", name: "Carregar baterias", room: "equipamentos", pos: { x: 1085, y: 940 } },
  { id: "organizar-equipamentos", name: "Organizar equipamentos", room: "equipamentos", pos: { x: 820, y: 1200 } },
  { id: "organizar-cartoes", name: "Organizar cartões", room: "recepcao", pos: { x: 1680, y: 1160 } },
  { id: "conectar-cabos", name: "Conectar cabos", room: "corredor", pos: { x: 1660, y: 560 } },
];

export function taskById(id: string) {
  return TASKS.find((t) => t.id === id);
}

/** Mesa central do lounge: onde se convoca reunião de emergência. */
export const EMERGENCY_POS: Point = { x: 380, y: 860 };

/** Quadro de luz (corrige o APAGÃO). */
export const LIGHTS_PANEL: Point = { x: 1180, y: 550 };

export type PanelId = "servidor" | "roteador";
/** Pontos que precisam ser ativados juntos para corrigir o SISTEMA OFFLINE. */
export const CRITICAL_PANELS: { id: PanelId; name: string; pos: Point }[] = [
  { id: "servidor", name: "Servidor", pos: { x: 1090, y: 490 } },
  { id: "roteador", name: "Roteador", pos: { x: 1772, y: 1010 } },
];

/** Posições de nascimento em volta da mesa central. */
export function spawnPoint(index: number, total: number): Point {
  const angle = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Math.round(EMERGENCY_POS.x + Math.cos(angle) * 150),
    y: Math.round(EMERGENCY_POS.y + Math.sin(angle) * 120),
  };
}

export function roomAt(p: Point): Room | undefined {
  return ROOMS.find((r) => p.x >= r.rect.x && p.x < r.rect.x + r.rect.w && p.y >= r.rect.y && p.y < r.rect.y + r.rect.h);
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Portas fechadas pelo sabotagem PORTAS (todas as portas de uma sala). */
export function doorsOfRoom(room: RoomId): DoorId[] {
  return DOORS.filter((d) => d.rooms.includes(room)).map((d) => d.id);
}
