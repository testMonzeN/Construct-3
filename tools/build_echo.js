// Echo Knight — Soul Knight-like roguelike for Construct 3 (exactly 50 events)
// Usage: node tools/build_echo.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const art = require("./art_echo");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "build", "EchoKnight");
const C3P = path.join(ROOT, "EchoKnight.c3p");

let sidCounter = 0;
const sid = () => 200000000000000 + ((sidCounter++ * 7919 + 54321) % 899999999999999);
let uidCounter = 0;
const uid = () => uidCounter++;
let imgCounter = 2000000;
const imgId = () => imgCounter++;

const files = new Map();
const writeJSON = (rel, obj) => files.set(rel, Buffer.from(JSON.stringify(obj, null, "\t")));
const writeBin = (rel, buf) => files.set(rel, buf);
const objectTypes = [];

function frameJSON(canvas, origin) {
	return {
		width: canvas.w, height: canvas.h,
		originX: origin ? origin[0] : 0.5, originY: origin ? origin[1] : 0.5,
		originalSource: "", exportFormat: "lossless", exportQuality: 0.8,
		imageSpriteId: imgId(), useCollisionPoly: true, duration: 1, tag: "",
	};
}
const instVars = list => (list || []).map(([name, type]) => ({ name, type, desc: "", show: true, sid: sid() }));
const behaviorTypes = list => (list || []).map(([behaviorId, name]) => ({ behaviorId, name, sid: sid() }));

function sprite(name, anims, opts = {}) {
	const items = [];
	for (const [animName, frames] of Object.entries(anims)) {
		items.push({
			frames: frames.map((c, i) => {
				writeBin(`images/${name.toLowerCase()}-${animName.toLowerCase()}-${String(i).padStart(3, "0")}.png`, c.toPNG());
				return frameJSON(c, opts.origin);
			}),
			sid: sid(), name: animName, isLooping: false, isPingPong: false, repeatCount: 1, repeatTo: 0, speed: 0,
		});
	}
	const first = Object.values(anims)[0][0];
	objectTypes.push(name);
	writeJSON(`objectTypes/${name}.json`, {
		name, "plugin-id": "Sprite", sid: sid(), isGlobal: false,
		instanceVariables: instVars(opts.vars), behaviorTypes: behaviorTypes(opts.behaviors),
		effectTypes: [], animations: { items, subfolders: [] },
	});
	return { name, w: first.w, h: first.h, origin: opts.origin || [0.5, 0.5], firstAnim: Object.keys(anims)[0] };
}

function textType(name, opts = {}) {
	objectTypes.push(name);
	writeJSON(`objectTypes/${name}.json`, {
		name, "plugin-id": "Text", sid: sid(), isGlobal: false,
		instanceVariables: instVars(opts.vars), behaviorTypes: behaviorTypes(opts.behaviors), effectTypes: [],
	});
	return { name };
}

function tiledType(name, canvas) {
	objectTypes.push(name);
	writeBin(`images/${name.toLowerCase()}.png`, canvas.toPNG());
	writeJSON(`objectTypes/${name}.json`, {
		name, "plugin-id": "TiledBg", sid: sid(), isGlobal: false,
		instanceVariables: [], behaviorTypes: [], effectTypes: [],
		image: { width: canvas.w, height: canvas.h, originX: 0.5, originY: 0.5, originalSource: "", exportFormat: "lossless", exportQuality: 0.8, imageSpriteId: imgId(), useCollisionPoly: true, tag: "" },
	});
	return { name };
}

function singleGlobal(name, pluginId) {
	objectTypes.push(name);
	writeJSON(`objectTypes/${name}.json`, { name, "plugin-id": pluginId, sid: sid(), "singleglobal-inst": { type: name, properties: {}, uid: uid() } });
}

const WHITE = [1, 1, 1, 1];
const world = (x, y, w, h, origin) => ({ x, y, width: w, height: h, originX: origin[0], originY: origin[1], color: WHITE, angle: 0, zElevation: 0 });

function spriteInst(t, x, y, opts = {}) {
	return {
		type: t.name,
		properties: { "initially-visible": opts.visible !== false, "initial-animation": opts.anim || t.firstAnim, "initial-frame": opts.frame || 0, "enable-collisions": true, "live-preview": false },
		uid: uid(), instanceVariables: opts.vars || {}, behaviors: opts.behaviors || {},
		world: world(x, y, opts.w || t.w, opts.h || t.h, t.origin),
	};
}

function rgb01(hex) {
	const s = hex.replace("#", "");
	return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
}

function textInst(t, x, y, w, h, text, opts = {}) {
	return {
		type: t.name,
		properties: {
			text, "enable-bbcode": false, font: "Arial", size: opts.size || 12, "line-height": 0,
			bold: opts.bold !== false, italic: false, color: [...rgb01(opts.color || "#ffffff"), 0],
			"horizontal-alignment": opts.align || "left", "vertical-alignment": opts.valign || "top",
			wrapping: "word", "text-direction": "ltr", "icon-set": -1,
			"initially-visible": opts.visible !== false, origin: "top-left", "read-aloud": false,
		},
		uid: uid(), instanceVariables: opts.vars || {}, behaviors: opts.behaviors || {},
		world: world(x, y, w, h, [0, 0]),
	};
}

function tiledInst(t, x, y, w, h) {
	return {
		type: t.name,
		properties: {
			"initially-visible": true, origin: "top-left", "wrap-horizontal": "repeat", "wrap-vertical": "repeat",
			"image-offset-x": 0, "image-offset-y": 0, "image-scale-x": 1, "image-scale-y": 1, "image-angle": 0,
			"enable-tile-randomization": false, "x-random": 1, "y-random": 1, "angle-random": 1, "blend-margin-x": 0.1, "blend-margin-y": 0.1,
		},
		uid: uid(), instanceVariables: {}, behaviors: {}, world: world(x, y, w, h, [0, 0]),
	};
}

function layer(name, instances, opts = {}) {
	return {
		name, overriden: 0, subLayers: [], instances, sid: sid(), effectTypes: [],
		isInitiallyVisible: true, isInitiallyInteractive: true, isHTMLElementsLayer: false,
		color: WHITE, backgroundColor: [...rgb01(opts.bg || "#000000"), 1], isTransparent: !!opts.transparent,
		sampling: "auto", parallaxX: opts.parallax === 0 ? 0 : 1, parallaxY: opts.parallax === 0 ? 0 : 1,
		scaleRate: 1, forceOwnTexture: false, renderingMode: "2d", drawOrder: "z-order",
		useRenderCells: false, blendMode: "normal", zElevation: 0, global: false,
	};
}

const layouts = [];
function layout(name, eventSheet, layers) {
	layouts.push(name);
	writeJSON(`layouts/${name}.json`, {
		name, layers, sid: sid(), "nonworld-instances": [], effectTypes: [],
		width: 1280, height: 720, unboundedScrolling: false, sampling: "nearest",
		vpX: 0.5, vpY: 0.5, projection: "orthographic", eventSheet,
	});
}

const CMP = { "=": 0, "!=": 1, "<": 2, "<=": 3, ">": 4, ">=": 5 };
const q = s => JSON.stringify(s);
function C(objectClass, id, parameters, extra = {}) {
	const c = { id, objectClass, sid: sid() };
	if (extra.behavior) c.behaviorType = extra.behavior;
	if (parameters) c.parameters = parameters;
	if (extra.not) c.isInverted = true;
	return c;
}
const A = (objectClass, id, parameters, behavior) => C(objectClass, id, parameters, { behavior });
const Call = (name, ...params) => ({ callFunction: name, sid: sid(), parameters: params.map(String) });

let eventCount = 0;
function E(conditions, actions, children) {
	eventCount++;
	const ev = { eventType: "block", conditions, actions, sid: sid() };
	if (children && children.length) ev.children = children;
	return ev;
}
function Fn(name, params, actions, children) {
	eventCount++;
	return {
		functionName: name, functionDescription: "", functionCategory: "", functionReturnType: "none",
		functionCopyPicked: false, functionIsAsync: false,
		functionParameters: params.map(([pname, type]) => ({ name: pname, type, initialValue: type === "string" ? "" : "0", comment: "", sid: sid() })),
		eventType: "function-block", conditions: [], actions, sid: sid(), children,
	};
}
const Var = (name, type, initialValue) => ({ eventType: "variable", name, type, initialValue: String(initialValue), comment: "", isStatic: false, isConstant: false, sid: sid() });
const Comment = text => ({ eventType: "comment", text });

const sys = (id, p) => C("System", id, p);
const varIs = (v, op, value) => sys("compare-eventvar", { variable: v, comparison: CMP[op], value: String(value) });
const setVar = (v, value) => A("System", "set-eventvar-value", { variable: v, value: String(value) });
const addVar = (v, value) => A("System", "add-to-eventvar", { variable: v, value: String(value) });
const cmp2 = (a, op, b) => sys("compare-two-values", { "first-value": a, comparison: CMP[op], "second-value": String(b) });
const ivIs = (obj, v, op, value) => C(obj, "compare-instance-variable", { "instance-variable": v, comparison: CMP[op], value: String(value) });
const setIv = (obj, v, value) => A(obj, "set-instvar-value", { "instance-variable": v, value: String(value) });
const addIv = (obj, v, value) => A(obj, "add-to-instvar", { "instance-variable": v, value: String(value) });
const subIv = (obj, v, value) => A(obj, "subtract-from-instvar", { "instance-variable": v, value: String(value) });
const key = code => C("Keyboard", "on-key-pressed", { key: code });
const create = (obj, layerName, x, y) => A("System", "create-object", { "object-to-create": obj, layer: q(layerName), x: String(x), y: String(y), "create-hierarchy": false, "template-name": q("") });
const pickBy = (obj, expr, op, value) => sys("pick-by-comparison", { object: obj, expression: expr, comparison: CMP[op], value: String(value) });
const forEach = obj => sys("for-each", { object: obj });
const everySec = s => sys("every-x-seconds", { "interval-seconds": String(s) });
const KEY = { Q: 81, E: 69, R: 82, P: 80, SPACE: 32, D1: 49, D2: 50, D3: 51, D4: 52, D5: 53, D6: 54 };

const fadeProps = (wait, out) => ({ properties: { "fade-in-time": 0, "wait-time": wait, "fade-out-time": out, destroy: true, enabled: true, "live-preview": false } });
const bulletProps = (speed, setAngle) => ({ properties: { speed, acceleration: 0, gravity: 0, "bounce-off-solids": false, "set-angle": setAngle, step: false, enabled: true } });

const fx = (x, y, size, color) => [
	create("Fx", "Game", x, y),
	A("Fx", "set-size", { width: String(size), height: String(size) }),
	A("Fx", "set-default-color", { color }),
];
const floatText = (x, y, text, color) => [
	create("FloatText", "Game", x, y),
	A("FloatText", "set-text", { text }),
	A("FloatText", "set-font-color", { color }),
	A("FloatText", "set-angle-of-motion", { angle: "270" }, "Bullet"),
];
const msg = (y, text, color) => [
	A("MsgText", "destroy"),
	create("MsgText", "HUD", 290, y),
	A("MsgText", "set-text", { text }),
	A("MsgText", "set-font-color", { color }),
];

// ===== objects =====
singleGlobal("Mouse", "Mouse");
singleGlobal("Keyboard", "Keyboard");

const Hero = sprite("Hero", { Default: [art.knight()] }, {
	vars: [["HP", "number"], ["MaxHP", "number"], ["Damage", "number"], ["AtkCD", "number"], ["AtkRate", "number"]],
	behaviors: [["EightDir", "EightDir"], ["bound", "BoundToLayout"], ["Timer", "Timer"], ["Flash", "Flash"]],
});
const Enemy = sprite("Enemy", { slime: [art.slime()], bat: [art.bat()], golem: [art.golem()] }, {
	vars: [["HP", "number"], ["MaxHP", "number"], ["Damage", "number"], ["Speed", "number"], ["AtkCD", "number"], ["Bounty", "number"], ["IsBoss", "number"]],
	behaviors: [["Bullet", "Bullet"]],
});
const HeroBullet = sprite("HeroBullet", {
	normal: [art.bulletNormal()], fire: [art.bulletFire()], ice: [art.bulletIce()], shock: [art.bulletShock()],
}, { behaviors: [["Bullet", "Bullet"], ["destroy", "DestroyOutsideLayout"]] });
const Core = sprite("Core", { fire: [art.coreFire()], ice: [art.coreIce()], shock: [art.coreShock()] }, {
	vars: [["Kind", "number"]],
	behaviors: [["Fade", "Fade"]],
});
const Door = sprite("Door", { ns: [art.doorNS()], ew: [art.doorEW()] }, {
	vars: [["Dir", "number"]],
});
const Wall = sprite("Wall", { Default: [art.wallBlock()] }, {
	origin: [0, 0],
	behaviors: [["solid", "Solid"]],
});
const Fx = sprite("Fx", { Default: [art.ring()] }, { behaviors: [["Fade", "Fade"]] });
const RelicCard = sprite("RelicCard", { Default: [art.cardHeal(), art.cardShield(), art.cardNova()] }, {
	vars: [["RelicID", "string"], ["Desc", "string"]],
});
const Ground = tiledType("Ground", art.floorTile());
const HPBack = sprite("HPBarBack", { Default: [art.solid("#14161a")] }, { origin: [0, 0] });
const HPBar = sprite("HPBar", { Default: [art.solid("#3fd34a")] }, { origin: [0, 0] });
const MapFrame = sprite("MapFrame", { Default: [art.mapFrame()] }, { origin: [0, 0] });
const MapCell = sprite("MapCell", {
	fog: [art.mapCellFog()],
	clear: [art.mapCellClear()],
	here: [art.mapCellHere()],
	boss: [art.mapCellBoss()],
	forge: [art.mapCellForge()],
}, {
	origin: [0, 0],
	vars: [["Idx", "number"], ["Kind", "number"]],
});

const FloatText = textType("FloatText", { behaviors: [["Bullet", "Bullet"], ["Fade", "Fade"]] });
const MsgText = textType("MsgText", { behaviors: [["Fade", "Fade"]] });
const StatsText = textType("StatsText");
const MapText = textType("MapText");
const ForgeText = textType("ForgeText");
const GameOverText = textType("GameOverText");
const PauseText = textType("PauseText");
const Label = textType("Label");
const InfoText = textType("InfoText");

// ===== layouts =====
const RELICS = [
	["heal", "Импульс лечения", "Реликвия Q: лечит 35% HP. Этаж 3×3 — смотри миникарту справа."],
	["shield", "Барьер", "Реликвия Q: 2.5 сек щита. На карте: синяя = ты, зелёная = зачищено, B/F = босс/кузница."],
	["nova", "Ударная волна", "Реликвия Q: урон рядом. Зачисти комнату → двери → к боссу по карте."],
];

function minimapCells() {
	const ox = 1040, oy = 48, step = 34;
	const out = [];
	for (let y = 0; y < 3; y++)
		for (let x = 0; x < 3; x++) {
			const idx = y * 3 + x;
			const kind = (x === 2 && y === 0) ? 2 : (x === 2 && y === 1) ? 1 : 0;
			const anim = kind === 2 ? "boss" : kind === 1 ? "forge" : "fog";
			out.push(spriteInst(MapCell, ox + x * step, oy + y * step, {
				anim, w: 26, h: 26, vars: { Idx: idx, Kind: kind },
			}));
		}
	return out;
}

/** Стены комнаты с проёмами под двери N/E/S/W (Soul Knight-камера). origin стены — top-left. */
function roomWalls() {
	const T = 40;
	const out = [];
	const add = (x, y, w, h) => out.push(spriteInst(Wall, x, y, { w, h }));
	// верх / низ — разрыв 560..720 под дверь
	add(80, 40, 480, T);
	add(720, 40, 480, T);
	add(80, 640, 480, T);
	add(720, 640, 480, T);
	// лево / право — разрыв 300..420
	add(40, 40, T, 260);
	add(40, 420, T, 260);
	add(1200, 40, T, 260);
	add(1200, 420, T, 260);
	return out;
}

layout("Menu", "Menu_ev", [
	layer("Menu", [
		textInst(Label, 0, 36, 1280, 60, "ЭХО-РЫЦАРЬ", { size: 36, align: "center", color: "#7ec8ff" }),
		textInst(Label, 0, 96, 1280, 30, "Roguelike · карта этажа 3×3 · комнаты с врагами · кузница ядер", { size: 13, align: "center", color: "#b0b8c8", bold: false }),
		...RELICS.map(([id, , desc], i) => spriteInst(RelicCard, 340 + i * 300, 320, { frame: i, vars: { RelicID: id, Desc: desc } })),
		...RELICS.map(([, title], i) => textInst(Label, 340 + i * 300 - 120, 430, 240, 28, title, { size: 15, align: "center", color: "#ffffff" })),
		textInst(InfoText, 160, 500, 960, 100, "", { size: 13, align: "center", color: "#e6e6e6", bold: false }),
		textInst(Label, 0, 640, 1280, 40, "WASD · ЛКМ · Пробел рывок · Q реликвия · двери после зачистки · в кузнице 1/2/3 ядра · P пауза", { size: 11, align: "center", color: "#8a909c", bold: false }),
	], { bg: "#12141c" }),
]);

layout("Game", "Game_ev", [
	layer("Game", [
		tiledInst(Ground, 80, 80, 1120, 560),
		...roomWalls(),
		spriteInst(Hero, 640, 400, {
			vars: { HP: 100, MaxHP: 100, Damage: 12, AtkCD: 0, AtkRate: 0.35 },
			behaviors: {
				EightDir: { properties: { "max-speed": 260, acceleration: 2000, deceleration: 2000, directions: "dir-8", "set-angle": "no", "allow-sliding": true, "default-controls": true, enabled: true } },
				BoundToLayout: { properties: { "bound-by": "edge", region: "layout" } },
				Timer: { properties: {} },
				Flash: { properties: { enabled: true } },
			},
		}),
		spriteInst(Enemy, -600, -600, { anim: "slime", vars: { HP: 1, MaxHP: 1, Damage: 0, Speed: 80, AtkCD: 1, Bounty: 1, IsBoss: 0 }, behaviors: { Bullet: bulletProps(0, false) } }),
		spriteInst(HeroBullet, -600, -500, { anim: "normal", behaviors: { Bullet: bulletProps(620, true), DestroyOutsideLayout: { properties: { region: "layout" } } } }),
		spriteInst(Core, -600, -400, { anim: "fire", vars: { Kind: 1 }, behaviors: { Fade: fadeProps(4, 1) } }),
		spriteInst(Door, -600, -300, { anim: "ns", vars: { Dir: 0 } }),
		spriteInst(Fx, -300, -300, { w: 10, h: 10, behaviors: { Fade: fadeProps(0, 0.4) } }),
		textInst(FloatText, -300, -200, 100, 24, "0", { size: 12, behaviors: { Bullet: bulletProps(50, false), Fade: fadeProps(0.2, 0.5) } }),
	], { bg: "#121018" }),
	layer("HUD", [
		textInst(StatsText, 12, 8, 520, 140, "", { size: 12 }),
		spriteInst(MapFrame, 1018, 8, { w: 140, h: 168 }),
		...minimapCells(),
		textInst(MapText, 1026, 14, 124, 16, "КАРТА ЭТАЖА", { size: 11, align: "center", color: "#9ec9ff" }),
		textInst(Label, 1026, 150, 124, 20, "синий=ты  зел=ок", { size: 9, align: "center", color: "#7a889c", bold: false }),
		spriteInst(HPBack, 486, 676, { w: 308, h: 26 }),
		spriteInst(HPBar, 490, 680, { w: 300, h: 18 }),
		textInst(ForgeText, 200, 180, 880, 300, "", { size: 16, align: "center", color: "#ffe08a", visible: false }),
		textInst(GameOverText, 240, 200, 800, 280, "", { size: 22, align: "center", color: "#ff6a5a", visible: false }),
		textInst(PauseText, 440, 320, 400, 60, "ПАУЗА", { size: 28, align: "center", visible: false }),
		textInst(MsgText, -900, -300, 700, 40, "", { size: 18, align: "center", color: "#7ec8ff", behaviors: { Fade: fadeProps(1.2, 0.7) } }),
		textInst(Label, 12, 680, 460, 24, "Зачисти комнату → дверь → карта этажа к боссу", { size: 11, color: "#8a909c", bold: false }),
	], { transparent: true, parallax: 0 }),
]);

// ===== events =====
const eventSheets = [];
function sheet(name, events) {
	eventSheets.push(name);
	writeJSON(`eventSheets/${name}.json`, { name, events, sid: sid() });
}

sheet("Menu_ev", [
	Comment("Выбор реликвии забега"),
	E([sys("every-tick")], [A("RelicCard", "set-opacity", { opacity: "60" })]),
	E([C("Mouse", "cursor-is-over-object", { object: "RelicCard" })], [
		A("RelicCard", "set-opacity", { opacity: "100" }),
		A("InfoText", "set-text", { text: "RelicCard.Desc" }),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "RelicCard" })], [
		setVar("RelicType", "RelicCard.RelicID"),
		A("System", "go-to-layout", { layout: "Game" }),
	]),
]);
const menuEvents = eventCount;

const elemName = `(Element = 1 ? "ОГОНЬ" : (Element = 2 ? "ЛЁД" : (Element = 3 ? "МОЛНИЯ" : "ОБЫЧНЫЙ")))`;
const elemAnim = `(Element = 1 ? "fire" : (Element = 2 ? "ice" : (Element = 3 ? "shock" : "normal")))`;
// ClearedMap — ровно 9 символов "0"/"1". Пометка/чтение — явные тернарники по RoomIndex (без хрупкого mid+RoomIndex).
function markAt(i) {
	return `left(ClearedMap, ${i}) & "1" & mid(ClearedMap, ${i + 2}, ${9 - i - 1})`;
}
const markCleared = [0, 1, 2, 3, 4, 5, 6, 7, 8].reduceRight(
	(acc, i) => `(RoomIndex = ${i} ? ${markAt(i)} : ${acc})`,
	"ClearedMap",
);
const readCleared = [0, 1, 2, 3, 4, 5, 6, 7, 8].reduceRight(
	(acc, i) => `(RoomIndex = ${i} ? (mid(ClearedMap, ${i + 1}, 1) = "1" ? 1 : 0) : ${acc})`,
	"0",
);
// В C3 оператор & — склейка строк, не логическое И. Только вложенные тернарники.
const isBossRoom = `(RoomX = 2 ? (RoomY = 0 ? 1 : 0) : 0)`;
const isForgeRoom = `(RoomX = 2 ? (RoomY = 1 ? 1 : 0) : 0)`;
const isStartRoom = `(RoomX = 1 ? (RoomY = 1 ? 1 : 0) : 0)`;
const roomsCleared = `len(replace(ClearedMap, "0", ""))`;
// анимация клетки миникарты: ты / зачищено / босс / кузница / туман
const mapAnim = `(RoomIndex = Self.Idx ? "here" : (mid(ClearedMap, Self.Idx + 1, 1) = "1" ? "clear" : (Self.Kind = 2 ? "boss" : (Self.Kind = 1 ? "forge" : "fog"))))`;
const bulletDmg = `Hero.Damage + (Element = 1 ? 6 : 0) + (Element = 2 ? 3 : 0) + (Element = 3 ? 4 : 0) + Floor((${roomsCleared}) / 2)`;
const forgeHud = `"КУЗНИЦА ЭХА  (комната карты)" & newline & newline & "1 — ОГОНЬ (" & CoreFire & ")  2 — ЛЁД (" & CoreIce & ")  3 — МОЛНИЯ (" & CoreShock & ")" & newline & "4 — +30 HP / 40з   5 — +4 урона / 60з   6 — +20 макс.HP / 80з" & newline & "Золото: " & Gold & "     Стихия: " & ${elemName} & newline & newline & "Выход — в открытую дверь на карте этажа"`;

const spawnEnemyActions = (x, y, anim) => [
	create("Enemy", "Game", x, y),
	setIv("Enemy", "IsBoss", 0),
	A("Enemy", "set-animation", { animation: q(anim), from: "beginning" }),
	setIv("Enemy", "MaxHP", anim === "bat" ? "14 + RoomsDone * 4" : "20 + RoomsDone * 5"),
	setIv("Enemy", "HP", "Self.MaxHP"),
	setIv("Enemy", "Damage", anim === "bat" ? "6 + Floor(RoomsDone / 2)" : "8 + Floor(RoomsDone / 2)"),
	setIv("Enemy", "Speed", anim === "bat" ? "110 + RoomsDone * 2" : "65 + RoomsDone * 2"),
	setIv("Enemy", "Bounty", "5 + RoomsDone"),
	setIv("Enemy", "AtkCD", "random(0.3, 1)"),
	addVar("EnemiesAlive", 1),
];

sheet("Game_ev", [
	Comment("Эхо-Рыцарь: этаж 3×3 как Soul Knight, враги в комнатах, кузница ядер на карте."),
	Var("RelicType", "string", "heal"),
	Var("Gold", "number", 0),
	Var("RoomX", "number", 1),
	Var("RoomY", "number", 1),
	Var("EntryDir", "number", -1),
	Var("ClearedMap", "string", "000000000"),
	Var("RoomsDone", "number", 0),
	Var("Kills", "number", 0),
	Var("CoreFire", "number", 0),
	Var("CoreIce", "number", 0),
	Var("CoreShock", "number", 0),
	Var("Element", "number", 0),
	Var("EnemiesAlive", "number", 0),
	Var("RoomClear", "number", 0),
	Var("InForge", "number", 0),
	Var("DashCD", "number", 0),
	Var("IFrames", "number", 0),
	Var("Shield", "number", 0),
	Var("RelicCD", "number", 0),
	Var("GameOver", "number", 0),
	Var("Won", "number", 0),
	Var("SpawnReady", "number", 0),
	Var("RoomIndex", "number", 4),
	Var("CellCleared", "number", 0),
	Var("BossAlive", "number", 0),
	Var("NX", "number", 1),
	Var("NY", "number", 1),
	Var("DoorCD", "number", 0),

	Comment("Старт забега — центр карты (1,1)"),
	E([sys("on-start-of-layout")], [
		A("Enemy", "destroy"), A("Door", "destroy"), A("Core", "destroy"), A("HeroBullet", "destroy"),
		setVar("Gold", 0), setVar("RoomX", 1), setVar("RoomY", 1), setVar("RoomIndex", 4), setVar("EntryDir", -1),
		setVar("ClearedMap", q("000000000")), setVar("RoomsDone", 0), setVar("Kills", 0),
		setVar("CoreFire", 0), setVar("CoreIce", 0), setVar("CoreShock", 0), setVar("Element", 0),
		setVar("EnemiesAlive", 0), setVar("RoomClear", 0), setVar("InForge", 0), setVar("SpawnReady", 0), setVar("DoorCD", 1),
		setVar("DashCD", 0), setVar("IFrames", 1.2), setVar("Shield", 0), setVar("RelicCD", 0),
		setVar("GameOver", 0), setVar("Won", 0), setVar("BossAlive", 0),
		setIv("Hero", "MaxHP", 100), setIv("Hero", "HP", 100), setIv("Hero", "Damage", 12), setIv("Hero", "AtkRate", 0.35), setIv("Hero", "AtkCD", 0),
		A("Hero", "set-ignoring-input", { input: "stop-ignoring" }, "EightDir"),
		A("System", "set-time-scale", { "time-scale": "1" }),
		A("ForgeText", "set-visible", { visibility: "invisible" }),
		A("GameOverText", "set-visible", { visibility: "invisible" }),
		Call("LoadRoom"),
	]),

	Comment("Тик: ИИ, HUD, миникарта этажа"),
	E([sys("every-tick")], [
		subIv("Hero", "AtkCD", "dt"),
		subIv("Enemy", "AtkCD", "dt"),
		setVar("DashCD", "max(0, DashCD - dt)"),
		setVar("DoorCD", "max(0, DoorCD - dt)"),
		setVar("IFrames", "max(0, IFrames - dt)"),
		setVar("Shield", "max(0, Shield - dt)"),
		setVar("RelicCD", "max(0, RelicCD - dt)"),
		setIv("Hero", "AtkRate", "Element = 3 ? 0.22 : 0.35"),
		A("Hero", "set-angle-toward-position", { x: "Mouse.X", y: "Mouse.Y" }),
		A("Hero", "set-opacity", { opacity: "Shield > 0 ? (70 + 30 * sin(time * 600)) : 100" }),
		A("Enemy", "set-angle-toward-position", { x: "Hero.X", y: "Hero.Y" }),
		A("Enemy", "set-angle-of-motion", { angle: "Self.Angle" }, "Bullet"),
		A("Enemy", "set-speed", {
			speed: `Element = 2 ? (distance(Self.X, Self.Y, Hero.X, Hero.Y) < 220 ? Self.Speed * 0.55 : Self.Speed) : Self.Speed`,
		}, "Bullet"),
		A("Fx", "set-size", { width: "Self.Width + 700 * dt", height: "Self.Height + 700 * dt" }),
		A("HPBar", "set-width", { width: "300 * max(0, Hero.HP) / Hero.MaxHP" }),
		A("StatsText", "set-text", {
			text: `"Клетка " & RoomX & "," & RoomY & "   Зачищено: " & ${roomsCleared} & "/9   Убито: " & Kills & newline & "Золото: " & Gold & "   Ядра F/I/S: " & CoreFire & "/" & CoreIce & "/" & CoreShock & "   " & ${elemName} & newline & "Реликвия: " & RelicType & (RelicCD > 0 ? " (" & ceil(RelicCD) & "с)" : " ГОТОВА") & (Shield > 0 ? "  [ЩИТ]" : "")`,
		}),
	]),

	Comment("Стрельба"),
	E([C("Mouse", "on-click", { "mouse-button": "left", "click-type": "clicked" }), ivIs("Hero", "AtkCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		setIv("Hero", "AtkCD", "Hero.AtkRate"),
		A("Hero", "spawn-another-object", { object: "HeroBullet", layer: q("Game"), "image-point": "0", "create-hierarchy": false, "template-name": q("") }),
		A("HeroBullet", "set-animation", { animation: elemAnim, from: "beginning" }),
		A("HeroBullet", "set-angle-of-motion", { angle: "angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)" }, "Bullet"),
		A("HeroBullet", "set-speed", { speed: "650" }, "Bullet"),
	]),

	E([C("HeroBullet", "on-collision-with-another-object", { object: "Enemy" })], [
		Call("DamageEnemy", "Enemy.UID", bulletDmg),
		A("HeroBullet", "destroy"),
	]),

	Fn("DamageEnemy", [["TargetUID", "number"], ["Amount", "number"]], [], [
		E([C("Enemy", "pick-by-unique-id", { "unique-id": "TargetUID" })], [
			subIv("Enemy", "HP", "Amount"),
			...floatText("Enemy.X", "Enemy.Y - 20", "round(Amount)", "rgbEx(100, 100, 100)"),
		], [
			E([ivIs("Enemy", "HP", "<=", 0)], [
				addVar("Gold", "Enemy.Bounty"),
				addVar("Kills", 1),
				addVar("EnemiesAlive", "-1"),
				create("Core", "Game", "Enemy.X", "Enemy.Y"),
				setIv("Core", "Kind", "choose(1, 2, 3)"),
				A("Core", "set-animation", { animation: `(Self.Kind = 1 ? "fire" : (Self.Kind = 2 ? "ice" : "shock"))`, from: "beginning" }),
				...fx("Enemy.X", "Enemy.Y", 40, "rgbEx(80, 60, 100)"),
				A("Enemy", "destroy"),
			]),
		]),
	]),

	Comment("Враги бьют вблизи"),
	E([
		ivIs("Enemy", "AtkCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0),
		pickBy("Enemy", "distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<=", 50),
		forEach("Enemy"),
	], [setIv("Enemy", "AtkCD", "0.9"), Call("DamageHero", "Enemy.Damage")]),

	Fn("DamageHero", [["Amount", "number"]], [], [
		E([varIs("GameOver", "=", 0), varIs("IFrames", "<=", 0), varIs("Shield", "<=", 0)], [
			subIv("Hero", "HP", "Amount"),
			A("Hero", "flash", { "on-time": "0.05", "off-time": "0.05", duration: "0.2" }, "Flash"),
			setVar("IFrames", 0.35),
		]),
	]),

	Comment("Подбор ядер"),
	E([C("Core", "on-collision-with-another-object", { object: "Hero" })], [
		addVar("CoreFire", "Core.Kind = 1 ? 1 : 0"),
		addVar("CoreIce", "Core.Kind = 2 ? 1 : 0"),
		addVar("CoreShock", "Core.Kind = 3 ? 1 : 0"),
		...floatText("Core.X", "Core.Y - 24", q("+ядро"), "rgbEx(80, 80, 20)"),
		A("Core", "destroy"),
	]),

	Comment("Рывок"),
	E([key(KEY.SPACE), varIs("DashCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		A("Hero", "set-position", {
			x: `Hero.X + cos(angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)) * 120`,
			y: `Hero.Y + sin(angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)) * 120`,
		}),
		setVar("DashCD", 1.4),
		setVar("IFrames", 0.45),
		...fx("Hero.X", "Hero.Y", 70, "rgbEx(40, 70, 100)"),
	]),

	Comment("Реликвии Q"),
	E([key(KEY.Q), varIs("RelicType", "=", q("heal")), varIs("RelicCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + Hero.MaxHP * 0.35)"),
		setVar("RelicCD", 10),
		...fx("Hero.X", "Hero.Y", 120, "rgbEx(30, 100, 40)"),
		...floatText("Hero.X", "Hero.Y - 50", q("+HP"), "rgbEx(30, 100, 40)"),
	]),
	E([key(KEY.Q), varIs("RelicType", "=", q("shield")), varIs("RelicCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		setVar("Shield", 2.5),
		setVar("RelicCD", 12),
		...fx("Hero.X", "Hero.Y", 110, "rgbEx(30, 60, 100)"),
		...msg(120, q("ЩИТ!"), "rgbEx(30, 60, 100)"),
	]),
	E([key(KEY.Q), varIs("RelicType", "=", q("nova")), varIs("RelicCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		setVar("RelicCD", 14),
		...fx("Hero.X", "Hero.Y", 160, "rgbEx(100, 30, 20)"),
	], [
		E([pickBy("Enemy", "distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<=", 220), forEach("Enemy")], [
			Call("DamageEnemy", "Enemy.UID", "30 + RoomsDone * 3"),
		]),
	]),

	Comment("Комната зачищена → двери (только если реально никого не осталось)"),
	E([
		varIs("SpawnReady", "=", 1), varIs("EnemiesAlive", "<=", 0), cmp2("Enemy.Count", "=", 0),
		varIs("RoomClear", "=", 0), varIs("GameOver", "=", 0), sys("trigger-once-while-true"),
	], [
		setVar("RoomIndex", "RoomY * 3 + RoomX"),
		setVar("RoomClear", 1),
		setVar("CellCleared", 1),
		setVar("ClearedMap", markCleared),
		setVar("RoomsDone", roomsCleared),
		Call("OpenDoors"),
		Call("RefreshMap"),
		...msg(90, q("Комната зачищена! Выбери дверь"), "rgbEx(40, 100, 40)"),
	]),

	Comment("Переход в соседнюю комнату по двери"),
	E([C("Hero", "on-collision-with-another-object", { object: "Door" }), varIs("RoomClear", "=", 1), varIs("DoorCD", "<=", 0), varIs("GameOver", "=", 0)], [
		setVar("EntryDir", "Door.Dir"),
		setVar("NX", "max(0, min(2, RoomX + (Door.Dir = 1 ? 1 : (Door.Dir = 3 ? -1 : 0))))"),
		setVar("NY", "max(0, min(2, RoomY + (Door.Dir = 2 ? 1 : (Door.Dir = 0 ? -1 : 0))))"),
		setVar("DoorCD", 0.8),
		A("Door", "destroy"),
	], [
		// Не перезагружать ту же клетку (дверь на краю карты)
		E([cmp2("NX", "!=", "RoomX")], [
			setVar("RoomX", "NX"),
			setVar("RoomY", "NY"),
			setVar("RoomIndex", "RoomY * 3 + RoomX"),
			Call("LoadRoom"),
		]),
		E([cmp2("NX", "=", "RoomX"), cmp2("NY", "!=", "RoomY")], [
			setVar("RoomX", "NX"),
			setVar("RoomY", "NY"),
			setVar("RoomIndex", "RoomY * 3 + RoomX"),
			Call("LoadRoom"),
		]),
		E([cmp2("NX", "=", "RoomX"), cmp2("NY", "=", "RoomY"), varIs("CellCleared", "=", 1)], [
			Call("OpenDoors"),
		]),
	]),

	Comment("Кузница на клетке F карты"),
	E([key(KEY.D1), varIs("InForge", "=", 1), varIs("CoreFire", ">", 0)], [
		addVar("CoreFire", -1), setVar("Element", 1),
		...msg(520, q("Оружие: ОГОНЬ"), "rgbEx(100, 40, 10)"),
		A("ForgeText", "set-text", { text: forgeHud }),
	]),
	E([key(KEY.D2), varIs("InForge", "=", 1), varIs("CoreIce", ">", 0)], [
		addVar("CoreIce", -1), setVar("Element", 2),
		...msg(520, q("Оружие: ЛЁД"), "rgbEx(30, 60, 100)"),
		A("ForgeText", "set-text", { text: forgeHud }),
	]),
	E([key(KEY.D3), varIs("InForge", "=", 1), varIs("CoreShock", ">", 0)], [
		addVar("CoreShock", -1), setVar("Element", 3),
		...msg(520, q("Оружие: МОЛНИЯ"), "rgbEx(70, 30, 100)"),
		A("ForgeText", "set-text", { text: forgeHud }),
	]),
	E([key(KEY.D4), varIs("InForge", "=", 1), varIs("Gold", ">=", 40)], [
		A("System", "subtract-from-eventvar", { variable: "Gold", value: "40" }),
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + 30)"),
		...msg(520, q("+30 HP"), "rgbEx(30, 100, 40)"),
	]),
	E([key(KEY.D5), varIs("InForge", "=", 1), varIs("Gold", ">=", 60)], [
		A("System", "subtract-from-eventvar", { variable: "Gold", value: "60" }),
		addIv("Hero", "Damage", 4),
		...msg(520, q("+4 урона"), "rgbEx(100, 80, 20)"),
	]),
	E([key(KEY.D6), varIs("InForge", "=", 1), varIs("Gold", ">=", 80)], [
		A("System", "subtract-from-eventvar", { variable: "Gold", value: "80" }),
		addIv("Hero", "MaxHP", 20),
		addIv("Hero", "HP", 20),
		...msg(520, q("+20 макс. HP"), "rgbEx(30, 100, 40)"),
	]),

	Comment("Загрузка комнаты карты"),
	Fn("LoadRoom", [], [
		A("Enemy", "destroy"),
		A("Door", "destroy"),
		A("HeroBullet", "destroy"),
		A("Core", "destroy"),
		setVar("RoomIndex", "RoomY * 3 + RoomX"),
		setVar("CellCleared", readCleared),
		setVar("EnemiesAlive", 0),
		setVar("BossAlive", 0),
		setVar("InForge", 0),
		setVar("SpawnReady", 0),
		setVar("RoomClear", "CellCleared"),
		A("ForgeText", "set-visible", { visibility: "invisible" }),
		A("Hero", "set-position", {
			x: `EntryDir = 1 ? 220 : (EntryDir = 3 ? 1060 : 640)`,
			y: `EntryDir = 0 ? 500 : (EntryDir = 2 ? 220 : 400)`,
		}),
		setVar("IFrames", 0.8),
		Call("RefreshMap"),
		...msg(70, `"Комната " & RoomX & "," & RoomY & (${isBossRoom} ? "  БОСС" : (${isForgeRoom} ? "  КУЗНИЦА" : ""))`, "rgbEx(50, 80, 120)"),
	], [
		E([cmp2(isForgeRoom, "=", 1)], [
			setVar("InForge", 1),
			setVar("RoomClear", 1),
			setVar("SpawnReady", 1),
			setVar("CellCleared", 1),
			setVar("ClearedMap", markCleared),
			A("ForgeText", "set-visible", { visibility: "visible" }),
			A("ForgeText", "set-text", { text: forgeHud }),
			A("Hero", "set-position", { x: "640", y: "400" }),
			Call("OpenDoors"),
			Call("RefreshMap"),
		]),
		// Повторный вход: без мобов, двери открыты
		E([varIs("CellCleared", "=", 1), cmp2(isForgeRoom, "=", 0)], [
			setVar("RoomClear", 1),
			setVar("SpawnReady", 1),
			A("Hero", "set-position", { x: "640", y: "400" }),
			Call("OpenDoors"),
			Call("RefreshMap"),
			...msg(110, q("Уже зачищено — двери открыты"), "rgbEx(60, 70, 90)"),
		]),
		E([varIs("CellCleared", "=", 0), cmp2(isBossRoom, "=", 1)], [
			create("Enemy", "Game", "640", "300"),
			A("Enemy", "set-animation", { animation: q("golem"), from: "beginning" }),
			A("Enemy", "set-scale", { scale: "1.5" }),
			setIv("Enemy", "IsBoss", 1),
			setIv("Enemy", "MaxHP", "120 + RoomsDone * 15"),
			setIv("Enemy", "HP", "Self.MaxHP"),
			setIv("Enemy", "Damage", "16"),
			setIv("Enemy", "Speed", "50"),
			setIv("Enemy", "Bounty", "40"),
			setIv("Enemy", "AtkCD", "0.5"),
			A("Enemy", "set-default-color", { color: "rgbEx(100, 50, 40)" }),
			addVar("EnemiesAlive", 1),
			setVar("BossAlive", 1),
			...spawnEnemyActions(300, 450, "bat"),
			...spawnEnemyActions(980, 450, "bat"),
			setVar("SpawnReady", 1),
			...msg(130, q("БОСС ЗАЛА!"), "rgbEx(100, 30, 20)"),
		]),
		E([varIs("CellCleared", "=", 0), cmp2(isForgeRoom, "=", 0), cmp2(isBossRoom, "=", 0)], [
			Call("SpawnCombat"),
		]),
	]),

	Fn("RefreshMap", [], [], [
		E([forEach("MapCell")], [
			A("MapCell", "set-animation", { animation: mapAnim, from: "beginning" }),
		]),
	]),

	Fn("SpawnCombat", [], [
		A("Enemy", "destroy"),
		setVar("EnemiesAlive", 0),
		setVar("RoomClear", 0),
	], [
		E([cmp2(isStartRoom, "=", 1)], [
			...spawnEnemyActions(400, 300, "slime"),
			...spawnEnemyActions(880, 300, "slime"),
			setVar("SpawnReady", 1),
		]),
		E([cmp2(isStartRoom, "=", 0)], [
			...spawnEnemyActions(220, 180, "slime"),
			...spawnEnemyActions(1060, 180, "slime"),
			...spawnEnemyActions(220, 540, "slime"),
			...spawnEnemyActions(1060, 540, "bat"),
			...spawnEnemyActions(640, 280, "bat"),
			setVar("SpawnReady", 1),
		]),
	]),

	// Двери в actions (не в children) — иначе Call из LoadRoom иногда не создавал их
	Fn("OpenDoors", [], [
		create("Door", "Game", "640", "96"),
		A("Door", "set-animation", { animation: q("ns"), from: "beginning" }),
		setIv("Door", "Dir", 0),
		create("Door", "Game", "640", "624"),
		A("Door", "set-animation", { animation: q("ns"), from: "beginning" }),
		setIv("Door", "Dir", 2),
		create("Door", "Game", "96", "360"),
		A("Door", "set-animation", { animation: q("ew"), from: "beginning" }),
		setIv("Door", "Dir", 3),
		create("Door", "Game", "1184", "360"),
		A("Door", "set-animation", { animation: q("ew"), from: "beginning" }),
		setIv("Door", "Dir", 1),
	], []),

	Comment("Победа — только когда убит именно босс (не адды)"),
	E([C("Enemy", "on-destroyed"), ivIs("Enemy", "IsBoss", "=", 1), varIs("Won", "=", 0), varIs("GameOver", "=", 0)], [
		setVar("BossAlive", 0),
		setVar("Won", 1),
		setVar("GameOver", 1),
		setVar("RoomClear", 1),
		setVar("CellCleared", 1),
		setVar("RoomIndex", "RoomY * 3 + RoomX"),
		setVar("ClearedMap", markCleared),
		A("Hero", "set-ignoring-input", { input: "start-ignoring" }, "EightDir"),
		A("GameOverText", "set-visible", { visibility: "visible" }),
		A("GameOverText", "set-font-color", { color: "rgbEx(40, 100, 50)" }),
		A("GameOverText", "set-text", { text: `"ЭТАЖ ПРОЙДЕН!" & newline & newline & "Убито: " & Kills & "   Комнат: " & ${roomsCleared} & "/9" & newline & newline & "R — новый забег"` }),
		A("System", "set-time-scale", { "time-scale": "0" }),
	]),

	Comment("Смерть / меню / пауза"),
	E([ivIs("Hero", "HP", "<=", 0), sys("trigger-once-while-true")], [
		setVar("GameOver", 1),
		A("Hero", "set-ignoring-input", { input: "start-ignoring" }, "EightDir"),
		A("GameOverText", "set-visible", { visibility: "visible" }),
		A("GameOverText", "set-font-color", { color: "rgbEx(100, 40, 35)" }),
		A("GameOverText", "set-text", { text: `"ПОРАЖЕНИЕ" & newline & newline & "Клетка: " & RoomX & "," & RoomY & "   Убито: " & Kills & newline & "Карта: " & ${roomsCleared} & "/9" & newline & newline & "R — выбрать реликвию заново"` }),
		A("System", "set-time-scale", { "time-scale": "0" }),
	]),
	E([key(KEY.R)], [A("System", "go-to-layout", { layout: "Menu" })]),
	E([key(KEY.P), varIs("GameOver", "=", 0)], [
		A("System", "set-time-scale", { "time-scale": "timescale = 0 ? 1 : 0" }),
		A("PauseText", "set-visible", { visibility: "toggle" }),
	]),

	Comment("Стихии"),
	E([varIs("Element", "=", 1), everySec(0.5), varIs("GameOver", "=", 0), varIs("InForge", "=", 0),
		C("Enemy", "pick-nearestfurthest", { which: "nearest", x: "Hero.X", y: "Hero.Y", z: "0", "pick-all-tied": false }),
		cmp2("distance(Hero.X, Hero.Y, Enemy.X, Enemy.Y)", "<=", 160)], [
		Call("DamageEnemy", "Enemy.UID", "3 + Floor(RoomsDone / 3)"),
	]),
	E([
		varIs("Element", "=", 3), varIs("GameOver", "=", 0),
		C("Enemy", "on-destroyed"),
		cmp2("Enemy.Count", ">", 0),
	], [], [
		E([
			C("Enemy", "pick-nearestfurthest", { which: "nearest", x: "Hero.X", y: "Hero.Y", z: "0", "pick-all-tied": false }),
		], [Call("DamageEnemy", "Enemy.UID", "10 + RoomsDone")]),
	]),

	Comment("Босс роняет доп. ядра"),
	E([C("Enemy", "on-destroyed"), ivIs("Enemy", "IsBoss", "=", 1)], [
		create("Core", "Game", "Enemy.X + 20", "Enemy.Y"),
		setIv("Core", "Kind", "choose(1, 2, 3)"),
		A("Core", "set-animation", { animation: `(Self.Kind = 1 ? "fire" : (Self.Kind = 2 ? "ice" : "shock"))`, from: "beginning" }),
		create("Core", "Game", "Enemy.X - 20", "Enemy.Y"),
		setIv("Core", "Kind", "choose(1, 2, 3)"),
		A("Core", "set-animation", { animation: `(Self.Kind = 1 ? "fire" : (Self.Kind = 2 ? "ice" : "shock"))`, from: "beginning" }),
		addVar("Gold", 20),
	]),

	Comment("Реген в бою"),
	E([everySec(4), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + 1)"),
	]),

]);

// ===== project =====
const used = (type, id, name) => ({ type, id, name, author: "Scirra", bundled: false });
const icons = ["icon-16.png", "icon-32.png", "icon-114.png", "icon-128.png", "icon-256.png", "loading-logo.png"];
const iconDir = path.join(__dirname, "ex", "spell-caster", "icons");
for (const ic of icons) writeBin(`icons/${ic}`, fs.readFileSync(path.join(iconDir, ic)));

writeJSON("project.c3proj", {
	projectFormatVersion: 1,
	savedWithRelease: 39000,
	name: "Echo Knight",
	runtime: "c3",
	useWorker: "auto",
	bundleAddons: false,
	usedAddons: [
		used("plugin", "Keyboard", "Keyboard"),
		used("plugin", "Mouse", "Mouse"),
		used("plugin", "Sprite", "Sprite"),
		used("plugin", "Text", "Text"),
		used("plugin", "TiledBg", "Tiled Background"),
		used("behavior", "Bullet", "Bullet"),
		used("behavior", "EightDir", "8 Direction"),
		used("behavior", "Fade", "Fade"),
		used("behavior", "Flash", "Flash"),
		used("behavior", "Timer", "Timer"),
		used("behavior", "bound", "Bound to layout"),
		used("behavior", "destroy", "Destroy outside layout"),
		used("behavior", "solid", "Solid"),
	],
	uniqueId: "echoknight" + Math.floor(Math.random() * 1e5).toString(36),
	objectTypes: { items: objectTypes, subfolders: [] },
	autosaveData: null, containers: [], families: { items: [], subfolders: [] },
	layouts: { items: layouts, subfolders: [] },
	eventSheets: { items: eventSheets, subfolders: [] },
	rootFileFolders: {
		script: { items: [], subfolders: [] }, sound: { items: [], subfolders: [] }, music: { items: [], subfolders: [] },
		video: { items: [], subfolders: [] }, font: { items: [], subfolders: [] },
		icon: {
			items: icons.map(name => ({ name, type: "image/png", sid: sid(), "icon-info": { purpose: name === "loading-logo.png" ? "loading-logo" : "app-icon" } })),
			subfolders: [],
		},
		general: { items: [], subfolders: [] },
	},
	timelines: { items: [], subfolders: [] }, flowcharts: { items: [], subfolders: [] },
	properties: {
		description: "Echo Knight — Soul Knight-like room map roguelike with echo-core forge.",
		version: "1.0.0.0", author: "", authorEmail: "", authorWebsite: "",
		appId: "com.example.echoknight", pixelRounding: false, zAxisScale: "normalized",
		fov: 0.7853981633974483, useLoaderLayout: false, fullscreenMode: "letterbox-scale",
		fullscreenQuality: "high", viewportFit: "auto", backgroundColor: [0, 0, 0, 0],
		splashColor: [1, 1, 1, 0], useThemeColor: false, themeColor: [1, 1, 1, 0],
		orientations: "landscape", webgpu: "auto", gpuPreference: "high-performance",
		scriptsType: "module", framerateMode: "vsync", sampling: "nearest", downscaling: "medium",
		renderingMode: "auto", anisotropicFiltering: "auto", zNear: 1, zFar: 10000,
		maxSpriteSheetSize: 2048, loaderStyle: "splash", preloadSounds: true,
		cordovaiOSScheme: "app", cordovaAndroidScheme: "https", autoReloadScriptsOnPreview: false,
		exportFileStructure: "folders", uidAllocationMode: "increment",
	},
	viewportWidth: 1280, viewportHeight: 720, firstLayout: "Menu",
});

fs.rmSync(OUT_DIR, { recursive: true, force: true });
for (const [rel, buf] of files) {
	const p = path.join(OUT_DIR, rel);
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, buf);
}
const zipTmp = path.join(ROOT, "build", "EchoKnight.zip");
fs.rmSync(zipTmp, { force: true });
execFileSync("tar", ["-a", "-c", "-f", zipTmp, "-C", OUT_DIR, ...fs.readdirSync(OUT_DIR)]);
fs.copyFileSync(zipTmp, C3P);
try { fs.copyFileSync(C3P, path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "EchoKnight.c3p")); } catch (_) {}

console.log(`events: menu=${menuEvents}, game=${eventCount - menuEvents}, total=${eventCount}`);
console.log(`files: ${files.size}, c3p: ${C3P} (${fs.statSync(C3P).size} bytes)`);
