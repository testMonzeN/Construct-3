// Эхо-Рыцарь — роглайк на Construct 3 (полный Construct — лимит событий не жмёт)
// Запуск: node tools/build_echo.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const art = require("./art_echo");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "build", "EchoKnight");
const C3P = path.join(ROOT, "EchoKnight.c3p");

let sidCounter = 0;
/** Строго уникальные SID — дубликаты ломают открытие .c3p. */
const sid = () => 200000000000000 + (++sidCounter);
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
/** Мир миссии: 3×2 экрана; хаб — корабельный отсек в NW. */
const WORLD_W = 3840;
const WORLD_H = 2160;
const VIEW_W = 1280;
const VIEW_H = 720;
/** Миникарта на HUD (экранные координаты, parallax 0). */
const MINI_X = 1020;
const MINI_Y = 540;
const MINI_W = 244;
const MINI_H = 138;
const MINI_PAD = 10;
const MINI_INNER_W = MINI_W - MINI_PAD * 2;
const MINI_INNER_H = MINI_H - MINI_PAD * 2;
const miniMapX = (wx) => `${MINI_X + MINI_PAD} + (${wx}) / ${WORLD_W} * ${MINI_INNER_W}`;
const miniMapY = (wy) => `${MINI_Y + MINI_PAD} + (${wy}) / ${WORLD_H} * ${MINI_INNER_H}`;
const POI = {
	start: [700, 550],
	north: [1920, 450],
	east: [3100, 550],
	west: [700, 1100],
	center: [1920, 1100],
	south: [1920, 1700],
	se: [3100, 1700],
	sw: [700, 1700],
};
function layout(name, eventSheet, layers, opts = {}) {
	layouts.push(name);
	writeJSON(`layouts/${name}.json`, {
		name, layers, sid: sid(), "nonworld-instances": [], effectTypes: [],
		width: opts.w || 1280, height: opts.h || 720, unboundedScrolling: false, sampling: "nearest",
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
function E(conditions, actions, children, opts = {}) {
	eventCount++;
	const ev = { eventType: "block", conditions, actions, sid: sid() };
	if (children && children.length) ev.children = children;
	if (opts.or) ev.isOrBlock = true;
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
const keyDown = code => C("Keyboard", "key-is-down", { key: code });
const simMove = dir => A("Hero", "simulate-control", { control: dir }, "EightDir");
const create = (obj, layerName, x, y) => A("System", "create-object", { "object-to-create": obj, layer: q(layerName), x: String(x), y: String(y), "create-hierarchy": false, "template-name": q("") });
const pickBy = (obj, expr, op, value) => sys("pick-by-comparison", { object: obj, expression: expr, comparison: CMP[op], value: String(value) });
const forEach = obj => sys("for-each", { object: obj });
const everySec = s => sys("every-x-seconds", { "interval-seconds": String(s) });
const KEY = {
	Q: 81, E: 69, R: 82, P: 80, SPACE: 32,
	W: 87, A: 65, S: 83, D: 68,
	LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
	D1: 49, D2: 50, D3: 51, D4: 52, D5: 53, D6: 54,
	G: 71, T: 84, U: 85, M: 77, X: 88, B: 66, N: 78, V: 86, F: 70,
	SHIFT: 16, C: 67,
};

const fadeProps = (wait, out) => ({ properties: { "fade-in-time": 0, "wait-time": wait, "fade-out-time": out, destroy: true, enabled: true, "live-preview": false } });
const bulletProps = (speed, setAngle) => ({ properties: { speed, acceleration: 0, gravity: 0, "bounce-off-solids": false, "set-angle": setAngle, step: true, enabled: true } });
const miniHideChrome = [
	A("MiniMapBg", "set-visible", { visibility: "invisible" }),
	A("MiniMapLabel", "set-visible", { visibility: "invisible" }),
	A("MiniHero", "set-visible", { visibility: "invisible" }),
	A("MiniObj", "set-visible", { visibility: "invisible" }),
	A("MiniEnemy", "destroy"),
];
const miniClearAll = [
	...miniHideChrome,
	A("MiniWall", "destroy"),
];
const miniShowChrome = [
	A("MiniMapBg", "set-visible", { visibility: "visible" }),
	A("MiniMapLabel", "set-visible", { visibility: "visible" }),
	A("MiniHero", "set-visible", { visibility: "visible" }),
	A("MiniObj", "set-visible", { visibility: "visible" }),
];
/** Радиус зрения; стены режем сэмплами ProbeX/Y (без поведения LOS — ломает .c3p). */
const VISION_RANGE = 280;
const VISION_STEALTH = 100;
const visionRangeExpr = `(Stealth = 1 ? ${VISION_STEALTH} : ${VISION_RANGE})`;
const VISION_SAMPLES = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84];
const STEER_PROBE_SAMPLES = [0.28, 0.5, 0.72, 0.95];
const STEER_PROBE_DIST = 105;
const STEER_OFFSETS = [0, 40, -40, 80, -80, 120, -120, 160, -160];
/** ProbeX/Y внутри AABB стены — 4 коротких условия вместо nested ternary. */
const probeInWallConds = () => [
	forEach("Wall"),
	cmp2("ProbeX", ">=", "Wall.X"),
	cmp2("ProbeX", "<=", "Wall.X + Wall.Width"),
	cmp2("ProbeY", ">=", "Wall.Y"),
	cmp2("ProbeY", "<=", "Wall.Y + Wall.Height"),
];
/** Сэмпл t на луче Enemy→Hero → ProbeX/Y. */
const setVisionProbe = (t) => [
	setVar("ProbeX", `Enemy.X + ${t} * (Hero.X - Enemy.X)`),
	setVar("ProbeY", `Enemy.Y + ${t} * (Hero.Y - Enemy.Y)`),
];
/** Сэмпл t вдоль SteerTry на дистанции STEER_PROBE_DIST. */
const setSteerProbe = (t) => [
	setVar("ProbeX", `Enemy.X + cos(SteerTry) * ${STEER_PROBE_DIST} * ${t}`),
	setVar("ProbeY", `Enemy.Y + sin(SteerTry) * ${STEER_PROBE_DIST} * ${t}`),
];
/** Выталкивание спрайта (origin 0.5) из AABB Wall (origin 0,0). */
const solidPushExprs = (obj) => {
	const eL = `${obj}.X - ${obj}.Width * 0.5`;
	const eR = `${obj}.X + ${obj}.Width * 0.5`;
	const eT = `${obj}.Y - ${obj}.Height * 0.5`;
	const eB = `${obj}.Y + ${obj}.Height * 0.5`;
	const penL = `${eR} - Wall.X`;
	const penR = `(Wall.X + Wall.Width) - (${eL})`;
	const penU = `${eB} - Wall.Y`;
	const penD = `(Wall.Y + Wall.Height) - (${eT})`;
	const overlapConds = [
		forEach("Wall"),
		cmp2(penL, ">", "0"),
		cmp2(penR, ">", "0"),
		cmp2(penU, ">", "0"),
		cmp2(penD, ">", "0"),
	];
	const useX = `(min(${penL}, ${penR}) <= min(${penU}, ${penD}) ? 1 : 0)`;
	const dx = `(${penL} < ${penR} ? (0 - (${penL})) : (${penR}))`;
	const dy = `(${penU} < ${penD} ? (0 - (${penU})) : (${penD}))`;
	return {
		overlapConds,
		setPos: A(obj, "set-position", {
			x: `${obj}.X + (${useX} = 1 ? ${dx} : 0)`,
			y: `${obj}.Y + (${useX} = 1 ? 0 : ${dy})`,
		}),
	};
};
const enemyWallPush = solidPushExprs("Enemy");
const hostageWallPush = solidPushExprs("Hostage");

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

// ===== объекты =====
singleGlobal("Mouse", "Mouse");
singleGlobal("Keyboard", "Keyboard");

const Hero = sprite("Hero", { Default: [art.knight()] }, {
	vars: [["HP", "number"], ["MaxHP", "number"], ["Damage", "number"], ["AtkCD", "number"], ["AtkRate", "number"]],
	behaviors: [["EightDir", "EightDir"], ["scrollto", "ScrollTo"], ["bound", "BoundToLayout"], ["Timer", "Timer"], ["Flash", "Flash"]],
});
const Enemy = sprite("Enemy", {
	melee1: [art.meleeForest()], melee2: [art.meleeMoon()], melee3: [art.meleeMars()],
	melee4: [art.meleeStorm()], melee5: [art.meleeIce()], melee6: [art.meleeVoid()],
	shooter1: [art.shooterForest()], shooter2: [art.shooterMoon()], shooter3: [art.shooterMars()],
	shooter4: [art.shooterStorm()], shooter5: [art.shooterIce()], shooter6: [art.shooterVoid()],
	sniper1: [art.sniperForest()], sniper2: [art.sniperMoon()], sniper3: [art.sniperMars()],
	sniper4: [art.sniperStorm()], sniper5: [art.sniperIce()], sniper6: [art.sniperVoid()],
	heavy1: [art.heavyForest()], heavy2: [art.heavyMoon()], heavy3: [art.heavyMars()],
	heavy4: [art.heavyStorm()], heavy5: [art.heavyIce()], heavy6: [art.heavyVoid()],
	drone1: [art.droneForest()], drone2: [art.droneMoon()], drone3: [art.droneMars()],
	drone4: [art.droneStorm()], drone5: [art.droneIce()], drone6: [art.droneVoid()],
	swarm1: [art.swarmForest()], swarm2: [art.swarmMoon()], swarm3: [art.swarmMars()],
	swarm4: [art.swarmStorm()], swarm5: [art.swarmIce()], swarm6: [art.swarmVoid()],
	ancient1: [art.ancientForest()], ancient2: [art.ancientMoon()], ancient3: [art.ancientMars()],
	ancient4: [art.ancientStorm()], ancient5: [art.ancientIce()], ancient6: [art.ancientVoid()],
	wolf: [art.wolfFoe()],
	golem1: [art.golemForest()], golem2: [art.golemMoon()], golem3: [art.golemMars()],
	golem4: [art.golemStorm()], golem5: [art.golemIce()], golem6: [art.golemVoid()],
	// алиасы на лес (шаблон инстанса)
	melee: [art.meleeForest()], shooter: [art.shooterForest()], sniper: [art.sniperForest()], golem: [art.golemForest()],
	slime: [art.slime()], bat: [art.bat()],
}, {
	vars: [
		["HP", "number"], ["MaxHP", "number"], ["Damage", "number"], ["Speed", "number"],
		["AtkCD", "number"], ["Bounty", "number"], ["IsBoss", "number"],
		["Archetype", "number"], ["Agro", "number"], ["Alert", "number"],
		["PathAng", "number"],
	],
	behaviors: [["Bullet", "Bullet"]],
});
const HeroBullet = sprite("HeroBullet", {
	normal: [art.bulletNormal()], fire: [art.bulletFire()], ice: [art.bulletIce()], shock: [art.bulletShock()],
}, { behaviors: [["Bullet", "Bullet"], ["destroy", "DestroyOutsideLayout"]] });
const EnemyBullet = sprite("EnemyBullet", {
	Default: [art.enemyBulletArt()],
}, { behaviors: [["Bullet", "Bullet"], ["destroy", "DestroyOutsideLayout"]] });
const WolfDen = sprite("WolfDen", { Default: [art.wolfDen()] }, {
	vars: [["HP", "number"], ["MaxHP", "number"]],
});
const RoomProp = sprite("RoomProp", {
	tree: [art.propTree()],
	crater: [art.propCrater()],
	spark: [art.propSpark()],
	dune: [art.propDune()],
	ice: [art.propIce()],
	rift: [art.propRift()],
	beacon: [art.propBeacon()],
}, { origin: [0.5, 0.5] });
const SpyTerminal = sprite("SpyTerminal", { Default: [art.spyTerminalArt()] }, { origin: [0.5, 0.5] });
const Hostage = sprite("Hostage", { Default: [art.hostageArt()] }, {
	origin: [0.5, 0.5],
	vars: [["Rescued", "number"]],
	behaviors: [["Bullet", "Bullet"]],
});
const ExtractZone = sprite("ExtractZone", { Default: [art.extractZoneArt()] }, { origin: [0.5, 0.5] });
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
const Ground = sprite("Ground", {
	forest: [art.floorForest()],
	moon: [art.floorMoon()],
	mars: [art.floorMars()],
	storm: [art.floorStorm()],
	ice: [art.floorIce()],
	void: [art.floorVoid()],
	forge: [art.floorForge()],
	boss: [art.floorBoss()],
	start: [art.floorStart()],
	combat: [art.floorCombat()],
}, { origin: [0, 0] });
const HPBack = sprite("HPBarBack", { Default: [art.solid("#14161a")] }, { origin: [0, 0] });
const HPBar = sprite("HPBar", { Default: [art.solid("#3fd34a")] }, { origin: [0, 0] });
const ForgeDim = sprite("ForgeDim", { Default: [art.forgeDim()] }, { origin: [0, 0] });
const ForgeWindow = sprite("ForgeWindow", { Default: [art.forgeWindow()] }, { origin: [0, 0] });
const ForgeBtn = sprite("ForgeBtn", {
	buy: [art.forgeBtnBuy()],
	deny: [art.forgeBtnDeny()],
	active: [art.forgeBtnActive()],
}, {
	origin: [0, 0],
	vars: [["Slot", "number"]],
});
const ForgeNPC = sprite("ForgeNPC", { Default: [art.smith()] });
const ForgeClose = sprite("ForgeClose", { Default: [art.forgeClose()] }, { origin: [0, 0] });
const ModBench = sprite("ModBench", { Default: [art.modBench()] });
const EchoGate = sprite("EchoGate", { Default: [art.echoGate()] });
const StarWindow = sprite("StarWindow", { Default: [art.starWindow()] }, { origin: [0, 0] });
const PlanetBtn = sprite("PlanetBtn", {
	fLock: [art.planetForestLock()], fOpen: [art.planetForestOpen()], fHere: [art.planetForestHere()],
	mLock: [art.planetMoonLock()], mOpen: [art.planetMoonOpen()], mHere: [art.planetMoonHere()],
	rLock: [art.planetMarsLock()], rOpen: [art.planetMarsOpen()], rHere: [art.planetMarsHere()],
	sLock: [art.planetStormLock()], sOpen: [art.planetStormOpen()], sHere: [art.planetStormHere()],
	iLock: [art.planetIceLock()], iOpen: [art.planetIceOpen()], iHere: [art.planetIceHere()],
	vLock: [art.planetVoidLock()], vOpen: [art.planetVoidOpen()], vHere: [art.planetVoidHere()],
}, {
	origin: [0.5, 0.5],
	vars: [["Slot", "number"]],
});
const StarClose = sprite("StarClose", { Default: [art.forgeClose()] }, { origin: [0, 0] });
const ModWindow = sprite("ModWindow", { Default: [art.modWindow()] }, { origin: [0, 0] });
const ModBtn = sprite("ModBtn", {
	buy: [art.forgeBtnBuy()],
	deny: [art.forgeBtnDeny()],
	active: [art.forgeBtnActive()],
}, {
	origin: [0, 0],
	vars: [["Slot", "number"]],
});
const ModClose = sprite("ModClose", { Default: [art.forgeClose()] }, { origin: [0, 0] });
const FloorWeapon = sprite("FloorWeapon", {
	echo: [art.floorGunEcho()],
	fire: [art.floorGunFire()],
	ice: [art.floorGunIce()],
	shock: [art.floorGunShock()],
}, { origin: [0.5, 0.5] });
const ModPickup = sprite("ModPickup", {
	m1: [art.modSerration()],
	m2: [art.modSpeed()],
	m3: [art.modLife()],
	m4: [art.modCaliber()],
	m5: [art.modSpark()],
}, {
	origin: [0.5, 0.5],
	vars: [["Kind", "number"]],
	behaviors: [["Fade", "Fade"]],
});
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
/** Миникарта большой локации (HUD, parallax 0). */
const MiniMapBg = sprite("MiniMapBg", { Default: [art.miniMapBgArt()] }, { origin: [0, 0] });
const MiniWall = sprite("MiniWall", { Default: [art.miniWallArt()] }, { origin: [0, 0] });
const MiniHero = sprite("MiniHero", { Default: [art.miniDotHero()] }, { origin: [0.5, 0.5] });
const MiniObj = sprite("MiniObj", { Default: [art.miniDotObj()] }, { origin: [0.5, 0.5] });
const MiniEnemy = sprite("MiniEnemy", { Default: [art.miniDotEnemy()] }, { origin: [0.5, 0.5] });
const MissionMapWindow = sprite("MissionMapWindow", { Default: [art.missionMapWindow()] }, { origin: [0, 0] });
const MissionEdge = sprite("MissionEdge", { Default: [art.missionEdgeArt()] }, { origin: [0.5, 0.5] });
const MissionNode = sprite("MissionNode", {
	lock: [art.missionNodeLock()],
	open: [art.missionNodeOpen()],
	here: [art.missionNodeHere()],
	done: [art.missionNodeDone()],
	boss: [art.missionNodeBoss()],
}, {
	origin: [0.5, 0.5],
	vars: [["Slot", "number"]],
});
const MissionMapClose = sprite("MissionMapClose", { Default: [art.forgeClose()] }, { origin: [0, 0] });

const FloatText = textType("FloatText", { behaviors: [["Bullet", "Bullet"], ["Fade", "Fade"]] });
const MsgText = textType("MsgText", { behaviors: [["Fade", "Fade"]] });
const HudPlanet = textType("HudPlanet");
const HudCombat = textType("HudCombat");
const HudWallet = textType("HudWallet");
const HudGuns = textType("HudGuns");
const HudMods = textType("HudMods");
const HudStatus = textType("HudStatus");
const MapText = textType("MapText");
const MiniMapLabel = textType("MiniMapLabel");
const HUD_TEXTS = ["HudPlanet", "HudCombat", "HudWallet", "HudGuns", "HudMods", "HudStatus"];
const hudHide = () => HUD_TEXTS.map((n) => A(n, "set-visible", { visibility: "invisible" }));
const hudShow = () => HUD_TEXTS.map((n) => A(n, "set-visible", { visibility: "visible" }));
const ForgeTitle = textType("ForgeTitle");
const ForgeWallet = textType("ForgeWallet");
const ForgeRow = textType("ForgeRow", { vars: [["Slot", "number"]] });
const ForgeBtnLabel = textType("ForgeBtnLabel", { vars: [["Slot", "number"]] });
const ForgeSec = textType("ForgeSec");
const ForgeHint = textType("ForgeHint");
const ForgePrompt = textType("ForgePrompt");
const ModPrompt = textType("ModPrompt");
const GatePrompt = textType("GatePrompt");
const StarTitle = textType("StarTitle");
const StarInfo = textType("StarInfo");
const PlanetLabel = textType("PlanetLabel", { vars: [["Slot", "number"]] });
const StarHint = textType("StarHint");
const MissionMapTitle = textType("MissionMapTitle");
const MissionMapInfo = textType("MissionMapInfo");
const MissionMapHint = textType("MissionMapHint");
const MissionNodeLabel = textType("MissionNodeLabel", { vars: [["Slot", "number"]] });
const ObjectiveText = textType("ObjectiveText");
const ModTitle = textType("ModTitle");
const ModInfo = textType("ModInfo");
const ModRow = textType("ModRow", { vars: [["Slot", "number"]] });
const ModBtnLabel = textType("ModBtnLabel", { vars: [["Slot", "number"]] });
const ModHint = textType("ModHint");
const GameOverText = textType("GameOverText");
const PauseText = textType("PauseText");
const Label = textType("Label");
const InfoText = textType("InfoText");

// ===== макеты =====
const RELICS = [
	["heal", "Импульс лечения", "Реликвия Q: лечит 35% HP. Миссии-локации: истребление, волны, оборона, узел, босс."],
	["shield", "Барьер", "Реликвия Q: 2.5 сек щита. Хаб между миссиями · F карта узлов · V планеты."],
	["nova", "Ударная волна", "Реликвия Q: урон рядом. Выполни цель миссии → возврат в хаб."],
];

/** Позиции узлов на карте миссий (как ноды Земли в Warframe). Макс. 15. */
const MISSION_NODE_POS = [
	[640, 155], [470, 185], [810, 185], [360, 265], [640, 245],
	[920, 265], [300, 360], [490, 370], [790, 370], [980, 360],
	[380, 475], [640, 450], [900, 475], [510, 555], [770, 555],
];
/** Связи между узлами (0-based индексы). */
const MISSION_EDGES = [
	[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 7], [4, 8], [5, 9],
	[6, 7], [7, 10], [7, 11], [8, 11], [8, 12], [9, 12], [10, 13], [11, 13], [11, 14], [12, 14],
	[0, 4], [2, 8], [5, 8],
];
/** Имена узлов (слот 1..15); последний у планеты → «ГОЛЕМ МИРА». */
const MISSION_NODE_NAMES = [
	"РОЩА", "МАНТИЯ", "ПРАЙМ", "ГАЙЯ", "ЛИТ",
	"КОБА", "ЭРЕБ", "ОРБИТ", "ЦЕТ", "КРАТЕР",
	"ШТОРМ", "РАЗЛОМ", "ВРАТА", "БЕЗДНА", "ГОЛЕМ",
];
/** Планета → узлов / имя / анимация земли. */
const LAYER_META = [
	{ layer: 1, nodes: 9, name: "Лес Эха", ground: "forest", prefix: "f", mVar: "MissionL1" },
	{ layer: 2, nodes: 8, name: "Пепельная Луна", ground: "moon", prefix: "m", mVar: "MissionL2" },
	{ layer: 3, nodes: 10, name: "Ржавый Марс", ground: "mars", prefix: "r", mVar: "MissionL3" },
	{ layer: 4, nodes: 15, name: "Грозовая Церера", ground: "storm", prefix: "s", mVar: "MissionL4" },
	{ layer: 5, nodes: 8, name: "Ледяная Европа", ground: "ice", prefix: "i", mVar: "MissionL5" },
	{ layer: 6, nodes: 6, name: "Бездна Эха", ground: "void", prefix: "v", mVar: "MissionL6" },
];
const MISSION_TYPE_NAMES = {
	0: "Истребление", 1: "Волны", 2: "Оборона", 3: "Узел",
	4: "Босс мира", 5: "Шпионаж", 6: "Спасение",
};

/** Стены: origin top-left. Для layout и runtime create. */
function wallInst(x, y, w, h) {
	return spriteInst(Wall, x, y, { w, h });
}
function mkWall(x, y, w, h) {
	return [
		create("Wall", "Game", x, y),
		A("Wall", "set-size", { width: String(w), height: String(h) }),
		A("Wall", "set-position", { x: String(x), y: String(y) }),
	];
}
function layoutBorderInst() {
	/** Стартовые стены хаба (корабль) в NW до EnterHub/BuildLayout. */
	const T = 40;
	return [
		wallInst(40, 40, 1200, T), wallInst(40, 640, 1200, T),
		wallInst(40, 40, T, 640), wallInst(1200, 40, T, 640),
	];
}
/** Корабль-хаб: одна комната ~экрана (не большая локация). */
const HUB_X = 40;
const HUB_Y = 40;
const HUB_W = 1200;
const HUB_H = 640;
function layoutHubActions() {
	const T = 40;
	return [
		...mkWall(HUB_X, HUB_Y, HUB_W, T),
		...mkWall(HUB_X, HUB_Y + HUB_H - T, HUB_W, T),
		...mkWall(HUB_X, HUB_Y, T, HUB_H),
		...mkWall(HUB_X + HUB_W - T, HUB_Y, T, HUB_H),
	];
}
function layoutWorldBorderActions() {
	const T = 48;
	return [
		...mkWall(40, 40, WORLD_W - 80, T),
		...mkWall(40, WORLD_H - 80, WORLD_W - 80, T),
		...mkWall(40, 40, T, WORLD_H - 80),
		...mkWall(WORLD_W - 80, 40, T, WORLD_H - 80),
	];
}
/** Варианты карт: seed = (Mission + Layer) % N выбирается в BuildLayout. */
function layoutOpenA() {
	return [
		...layoutWorldBorderActions(),
		...mkWall(1200, 200, 48, 400), ...mkWall(2400, 200, 48, 400),
		...mkWall(800, 900, 400, 48), ...mkWall(2600, 900, 400, 48),
		...mkWall(1600, 1400, 48, 350), ...mkWall(2200, 1400, 48, 350),
	];
}
function layoutOpenB() {
	/* Острова-столбы + диагональные укрытия */
	return [
		...layoutWorldBorderActions(),
		...mkWall(700, 500, 160, 160), ...mkWall(1800, 400, 140, 140), ...mkWall(2900, 550, 160, 160),
		...mkWall(900, 1400, 180, 180), ...mkWall(2000, 1500, 150, 150), ...mkWall(3000, 1350, 170, 170),
		...mkWall(1400, 900, 220, 48), ...mkWall(2200, 1100, 48, 220),
	];
}
function layoutOpenC() {
	/* Крест + углы */
	return [
		...layoutWorldBorderActions(),
		...mkWall(1700, 300, 48, 500), ...mkWall(1700, 1300, 48, 500),
		...mkWall(500, 1000, 700, 48), ...mkWall(2500, 1000, 700, 48),
		...mkWall(600, 400, 200, 48), ...mkWall(3000, 400, 200, 48),
		...mkWall(600, 1700, 200, 48), ...mkWall(3000, 1700, 200, 48),
	];
}
function layoutCorridorsA() {
	return [
		...layoutWorldBorderActions(),
		...mkWall(900, 200, 48, 700), ...mkWall(900, 1200, 48, 600),
		...mkWall(1900, 200, 48, 500), ...mkWall(1900, 1000, 48, 800),
		...mkWall(2900, 200, 48, 700), ...mkWall(2900, 1200, 48, 600),
		...mkWall(400, 1000, 500, 48), ...mkWall(2000, 1000, 900, 48),
	];
}
function layoutCorridorsB() {
	/* Горизонтальные галереи с проходами */
	return [
		...layoutWorldBorderActions(),
		...mkWall(200, 550, 1400, 48), ...mkWall(2200, 550, 1400, 48),
		...mkWall(200, 1100, 1000, 48), ...mkWall(1600, 1100, 800, 48), ...mkWall(2800, 1100, 800, 48),
		...mkWall(200, 1650, 1400, 48), ...mkWall(2200, 1650, 1400, 48),
		...mkWall(1600, 200, 48, 350), ...mkWall(2400, 600, 48, 500), ...mkWall(1200, 1150, 48, 500),
	];
}
function layoutCorridorsC() {
	/* Комнаты 2×2 с дверными щелями */
	return [
		...layoutWorldBorderActions(),
		...mkWall(200, 200, 48, 800), ...mkWall(200, 1200, 48, 700),
		...mkWall(1900, 200, 48, 700), ...mkWall(1900, 1100, 48, 800),
		...mkWall(3600, 200, 48, 800), ...mkWall(3600, 1200, 48, 700),
		...mkWall(250, 1000, 700, 48), ...mkWall(1150, 1000, 750, 48),
		...mkWall(1950, 1000, 700, 48), ...mkWall(2850, 1000, 750, 48),
		...mkWall(250, 200, 700, 48), ...mkWall(1950, 200, 700, 48),
	];
}
function layoutDefenseA() {
	return [
		...layoutWorldBorderActions(),
		...mkWall(1500, 700, 300, 48), ...mkWall(2100, 700, 300, 48),
		...mkWall(1500, 1400, 300, 48), ...mkWall(2100, 1400, 300, 48),
		...mkWall(1400, 800, 48, 250), ...mkWall(2450, 800, 48, 250),
		...mkWall(1400, 1200, 48, 200), ...mkWall(2450, 1200, 48, 200),
	];
}
function layoutDefenseB() {
	/* Кольцо вокруг бура + внешние бастионы */
	return [
		...layoutWorldBorderActions(),
		...mkWall(1620, 820, 280, 48), ...mkWall(1980, 820, 280, 48),
		...mkWall(1620, 1280, 280, 48), ...mkWall(1980, 1280, 280, 48),
		...mkWall(1580, 868, 48, 220), ...mkWall(2260, 868, 48, 220),
		...mkWall(1580, 1120, 48, 160), ...mkWall(2260, 1120, 48, 160),
		...mkWall(800, 400, 200, 48), ...mkWall(2800, 400, 200, 48),
		...mkWall(800, 1700, 200, 48), ...mkWall(2800, 1700, 200, 48),
		...mkWall(500, 900, 48, 300), ...mkWall(3300, 900, 48, 300),
	];
}
function layoutEliteA() {
	return [
		...layoutWorldBorderActions(),
		...mkWall(1400, 600, 48, 900), ...mkWall(2400, 600, 48, 900),
		...mkWall(1500, 600, 900, 48), ...mkWall(1500, 1500, 900, 48),
		...mkWall(1700, 900, 200, 48), ...mkWall(2000, 1200, 200, 48),
	];
}
function layoutEliteB() {
	/* Восьмёрка / арена с колоннами */
	return [
		...layoutWorldBorderActions(),
		...mkWall(1100, 500, 48, 400), ...mkWall(2700, 500, 48, 400),
		...mkWall(1100, 1300, 48, 400), ...mkWall(2700, 1300, 48, 400),
		...mkWall(1300, 900, 400, 48), ...mkWall(2200, 900, 400, 48),
		...mkWall(1300, 1300, 400, 48), ...mkWall(2200, 1300, 400, 48),
		...mkWall(1850, 700, 120, 120), ...mkWall(1850, 1300, 120, 120),
	];
}
function layoutSpyA() {
	return [
		...layoutCorridorsA(),
		...mkWall(2800, 1400, 400, 48), ...mkWall(2800, 1400, 48, 300),
	];
}
function layoutSpyB() {
	/* Лабиринт к SE-терминалу */
	return [
		...layoutWorldBorderActions(),
		...mkWall(600, 300, 48, 900), ...mkWall(1200, 600, 48, 1200),
		...mkWall(1800, 200, 48, 1000), ...mkWall(2400, 700, 48, 1100),
		...mkWall(3000, 300, 48, 900),
		...mkWall(650, 700, 550, 48), ...mkWall(1250, 1200, 550, 48),
		...mkWall(1850, 500, 550, 48), ...mkWall(2450, 1500, 550, 48),
		...mkWall(2800, 1600, 500, 48), ...mkWall(3100, 1400, 48, 400),
	];
}
function layoutRescueA() {
	return [
		...layoutOpenA(),
		...mkWall(2800, 1400, 48, 400), ...mkWall(3000, 1600, 300, 48),
	];
}
function layoutRescueB() {
	/* Узкий путь к SE + открытый центр */
	return [
		...layoutWorldBorderActions(),
		...mkWall(1000, 300, 48, 700), ...mkWall(1000, 1200, 48, 600),
		...mkWall(2200, 200, 48, 800), ...mkWall(2200, 1200, 48, 700),
		...mkWall(2500, 1400, 48, 500), ...mkWall(2800, 1200, 600, 48),
		...mkWall(1400, 1000, 500, 48), ...mkWall(700, 1500, 300, 48),
	];
}
/** Декор по планете — расставляется после стен. */
function layoutDecorActions() {
	const prop =
		`(Layer = 1 ? "tree" : (Layer = 2 ? "crater" : (Layer = 3 ? "dune" : ` +
		`(Layer = 4 ? "spark" : (Layer = 5 ? "ice" : "rift")))))`;
	const spots = [
		[500, 400], [1100, 350], [2500, 450], [3300, 500],
		[600, 1000], [1500, 1200], [2300, 900], [3100, 1100],
		[450, 1700], [1200, 1800], [2000, 1650], [2900, 1750],
		[1800, 700], [2700, 1400],
	];
	return spots.flatMap(([x, y], i) => [
		create("RoomProp", "Game", x + (i % 3) * 20, y + (i % 2) * 15),
		A("RoomProp", "set-animation", { animation: prop, from: "beginning" }),
		A("RoomProp", "set-visible", { visibility: "visible" }),
	]);
}
function resizeGroundHubActions() {
	return [
		A("Ground", "set-position", { x: String(HUB_X), y: String(HUB_Y) }),
		A("Ground", "set-size", { width: String(HUB_W), height: String(HUB_H) }),
	];
}
function resizeGroundWorldActions() {
	return [
		A("Ground", "set-position", { x: "40", y: "40" }),
		A("Ground", "set-size", { width: String(WORLD_W - 80), height: String(WORLD_H - 80) }),
	];
}

layout("Menu", "Menu_ev", [
	layer("Menu", [
		textInst(Label, 0, 36, 1280, 60, "ЭХО-РЫЦАРЬ", { size: 36, align: "center", color: "#7ec8ff" }),
		textInst(Label, 0, 96, 1280, 30, "Роглайк · большие локации · корабль-хаб · стелс · звёздная карта", { size: 13, align: "center", color: "#b0b8c8", bold: false }),
		...RELICS.map(([id, , desc], i) => spriteInst(RelicCard, 340 + i * 300, 320, { frame: i, vars: { RelicID: id, Desc: desc } })),
		...RELICS.map(([, title], i) => textInst(Label, 340 + i * 300 - 120, 430, 240, 28, title, { size: 15, align: "center", color: "#ffffff" })),
		textInst(InfoText, 160, 500, 960, 100, "", { size: 13, align: "center", color: "#e6e6e6", bold: false }),
		textInst(Label, 0, 640, 1280, 40, "WASD · ЛКМ · Q · Shift стелс · T тихий удар · E/M/V/F · P пауза", { size: 11, align: "center", color: "#8a909c", bold: false }),
	], { bg: "#12141c" }),
]);

layout("Game", "Game_ev", [
	layer("Game", [
		spriteInst(Ground, HUB_X, HUB_Y, { anim: "forge", w: HUB_W, h: HUB_H }),
		...layoutBorderInst(),
		spriteInst(Hero, 640, 400, {
			vars: { HP: 100, MaxHP: 100, Damage: 12, AtkCD: 0, AtkRate: 0.35 },
			behaviors: {
				EightDir: { properties: { "max-speed": 260, acceleration: 2000, deceleration: 2000, directions: "dir-8", "set-angle": "no", "allow-sliding": true, "default-controls": false, enabled: true } },
				ScrollTo: { properties: { enabled: true } },
				BoundToLayout: { properties: { "bound-by": "edge", region: "layout" } },
				Timer: { properties: {} },
				Flash: { properties: { enabled: true } },
			},
		}),
		// Шаблон за экраном: Archetype=3 чтобы случайно не блокировал зачистку комнаты
		spriteInst(Enemy, -600, -600, {
			anim: "melee",
			vars: { HP: 1, MaxHP: 1, Damage: 0, Speed: 0, AtkCD: 99, Bounty: 0, IsBoss: 0, Archetype: 3, Agro: 0, Alert: 0, PathAng: 0 },
			behaviors: { Bullet: bulletProps(0, false) },
		}),
		spriteInst(HeroBullet, -600, -500, { anim: "normal", behaviors: { Bullet: bulletProps(620, true), DestroyOutsideLayout: { properties: { region: "layout" } } } }),
		spriteInst(EnemyBullet, -600, -450, { behaviors: { Bullet: bulletProps(280, true), DestroyOutsideLayout: { properties: { region: "layout" } } } }),
		spriteInst(WolfDen, -900, -900, { vars: { HP: 40, MaxHP: 40 }, visible: false }),
		spriteInst(RoomProp, -900, -900, { anim: "tree", visible: false }),
		spriteInst(SpyTerminal, -900, -900, { visible: false }),
		spriteInst(Hostage, -900, -900, { vars: { Rescued: 0 }, visible: false, behaviors: { Bullet: bulletProps(0, false) } }),
		spriteInst(ExtractZone, -900, -900, { visible: false }),
		spriteInst(Core, -600, -400, { anim: "fire", vars: { Kind: 1 }, behaviors: { Fade: fadeProps(4, 1) } }),
		spriteInst(Door, -600, -300, { anim: "ns", vars: { Dir: 0 } }),
		spriteInst(ForgeNPC, -800, -800, { visible: false }),
		textInst(ForgePrompt, -800, -800, 280, 28, "E — открыть кузницу", { size: 14, align: "center", color: "#ffe08a", visible: false }),
		spriteInst(ModBench, -800, -800, { visible: false }),
		textInst(ModPrompt, -800, -800, 280, 28, "M — автомат модов", { size: 14, align: "center", color: "#7ec8ff", visible: false }),
		spriteInst(EchoGate, -800, -800, { visible: false }),
		textInst(GatePrompt, -800, -800, 320, 28, "V — звёздная карта", { size: 13, align: "center", color: "#a8d4ff", visible: false }),
		spriteInst(FloorWeapon, -900, -900, { anim: "echo", visible: false }),
		spriteInst(ModPickup, -900, -900, { anim: "m1", vars: { Kind: 1 }, behaviors: { Fade: fadeProps(12, 2) } }),
		spriteInst(Fx, -300, -300, { w: 10, h: 10, behaviors: { Fade: fadeProps(0, 0.4) } }),
		textInst(FloatText, -300, -200, 100, 24, "0", { size: 12, behaviors: { Bullet: bulletProps(50, false), Fade: fadeProps(0.2, 0.5) } }),
	], { bg: "#121018" }),
	layer("HUD", [
		textInst(HudPlanet, 12, 8, 560, 22, "", { size: 12 }),
		textInst(HudCombat, 12, 30, 560, 22, "", { size: 12 }),
		textInst(HudWallet, 12, 52, 560, 22, "", { size: 12 }),
		textInst(HudGuns, 12, 74, 560, 22, "", { size: 12 }),
		textInst(HudMods, 12, 96, 560, 22, "", { size: 12 }),
		textInst(HudStatus, 12, 118, 560, 22, "", { size: 12 }),
		spriteInst(MapFrame, 980, 8, { w: 280, h: 120 }),
		textInst(MapText, 990, 16, 260, 20, "ЦЕЛЬ МИССИИ", { size: 12, align: "center", color: "#9ec9ff" }),
		textInst(ObjectiveText, 990, 44, 260, 70, "Хаб кузницы · F — в узел", { size: 13, align: "center", color: "#d0e8ff" }),
		// Миникарта локации (правый низ)
		spriteInst(MiniMapBg, 1020, 540, { w: 244, h: 138, visible: false }),
		textInst(MiniMapLabel, 1020, 542, 244, 16, "КАРТА · синий ты · жёлтый цель · красный враг", {
			size: 9, align: "center", color: "#8ab0d0", visible: false,
		}),
		spriteInst(MiniWall, -80, -80, { w: 4, h: 4, visible: false }), // шаблон; на карту не рисуем
		spriteInst(MiniHero, 1142, 615, { w: 10, h: 10, visible: false }),
		spriteInst(MiniObj, -80, -80, { w: 10, h: 10, visible: false }),
		spriteInst(MiniEnemy, -80, -80, { w: 8, h: 8, visible: false }),
		spriteInst(HPBack, 486, 676, { w: 308, h: 26 }),
		spriteInst(HPBar, 490, 680, { w: 300, h: 18 }),
		// Окно магазина-кузницы + кликабельные кнопки
		spriteInst(ForgeDim, 0, 0, { w: 1280, h: 720, visible: false }),
		spriteInst(ForgeWindow, 360, 50, { w: 560, h: 440, visible: false }),
		textInst(ForgeTitle, 360, 62, 560, 40, "КУЗНИЦА ЭХА", { size: 24, align: "center", color: "#ffe9a0", visible: false }),
		textInst(ForgeWallet, 380, 114, 520, 28, "", { size: 14, align: "center", color: "#d0e8ff", visible: false }),
		textInst(ForgeSec, 380, 148, 280, 20, "СТИХИЯ на эхо-клинок (1 ядро)", { size: 11, align: "left", color: "#e0c060", visible: false }),
		textInst(ForgeSec, 380, 278, 360, 20, "КОВКА → слот 1 (старое: 1→2, 2→пол)", { size: 11, align: "left", color: "#8ec8ff", visible: false }),
		...[
			[1, "ОГОНЬ на эхо-клинок — DoT", 172],
			[2, "ЛЁД на эхо-клинок — slow", 208],
			[3, "МОЛНИЯ на эхо-клинок — цепь", 244],
			[4, "Сковать Клинок пепла", 302],
			[5, "Сковать Клинок инея", 338],
			[6, "Сковать Клинок грозы", 374],
		].flatMap(([slot, label, y]) => [
			textInst(ForgeRow, 390, y + 4, 400, 24, label, { size: 14, align: "left", color: "#f5ecd0", visible: false, vars: { Slot: slot } }),
			spriteInst(ForgeBtn, 808, y + 2, { w: 96, h: 28, anim: "deny", visible: false, vars: { Slot: slot } }),
			textInst(ForgeBtnLabel, 808, y + 4, 96, 24, "—", { size: 12, align: "center", color: "#ffffff", visible: false, vars: { Slot: slot } }),
		]),
		textInst(ForgeHint, 380, 448, 520, 28, "M у автомата — моды · G — пол · Esc/X закрыть", { size: 11, align: "center", color: "#9eb0c8", bold: false, visible: false }),
		spriteInst(ForgeClose, 868, 58, { w: 44, h: 44, visible: false }),
		// Автомат модов (Warframe-lite: вес + ёмкость)
		spriteInst(ModWindow, 360, 40, { w: 560, h: 500, visible: false }),
		textInst(ModTitle, 360, 52, 560, 36, "АВТОМАТ МОДОВ", { size: 22, align: "center", color: "#9ed0ff", visible: false }),
		textInst(ModInfo, 380, 100, 520, 44, "", { size: 13, align: "center", color: "#d0e8ff", visible: false }),
		...[
			[1, "Слот A", 136],
			[2, "Слот B", 172],
			[3, "Слот C", 208],
			[4, "Слот D", 244],
			[5, "Остриё  вес4  +ур", 316],
			[6, "Скорострел  вес5  темп", 352],
			[7, "Вампир  вес6  +HP", 388],
			[8, "Калибр  вес7  +ур", 424],
			[9, "Искра  вес3  +ур", 460],
		].flatMap(([slot, label, y]) => [
			textInst(ModRow, 390, y + 4, 400, 24, label, { size: 13, align: "left", color: "#e8f0ff", visible: false, vars: { Slot: slot } }),
			spriteInst(ModBtn, 808, y + 2, { w: 96, h: 28, anim: "deny", visible: false, vars: { Slot: slot } }),
			textInst(ModBtnLabel, 808, y + 4, 96, 24, "—", { size: 12, align: "center", color: "#ffffff", visible: false, vars: { Slot: slot } }),
		]),
		textInst(ModHint, 380, 512, 520, 24, "1–5 поставить · клик СНЯТЬ/СТАВ · X закрыть · ёмкость 12", { size: 11, align: "center", color: "#9eb0c8", bold: false, visible: false }),
		spriteInst(ModClose, 868, 48, { w: 44, h: 44, visible: false }),
		// Звёздная карта (Warframe Navigation) — 6 планет
		spriteInst(StarWindow, 190, 70, { w: 900, h: 480, visible: false }),
		textInst(StarTitle, 190, 82, 900, 36, "ЗВЁЗДНАЯ КАРТА ЭХА", { size: 22, align: "center", color: "#9ed0ff", visible: false }),
		textInst(StarInfo, 210, 125, 860, 36, "", { size: 13, align: "center", color: "#b0c8e0", visible: false }),
		spriteInst(PlanetBtn, 340, 240, { anim: "fHere", w: 96, h: 96, visible: false, vars: { Slot: 1 } }),
		spriteInst(PlanetBtn, 500, 240, { anim: "mLock", w: 96, h: 96, visible: false, vars: { Slot: 2 } }),
		spriteInst(PlanetBtn, 660, 240, { anim: "rLock", w: 96, h: 96, visible: false, vars: { Slot: 3 } }),
		spriteInst(PlanetBtn, 420, 390, { anim: "sLock", w: 96, h: 96, visible: false, vars: { Slot: 4 } }),
		spriteInst(PlanetBtn, 580, 390, { anim: "iLock", w: 96, h: 96, visible: false, vars: { Slot: 5 } }),
		spriteInst(PlanetBtn, 740, 390, { anim: "vLock", w: 96, h: 96, visible: false, vars: { Slot: 6 } }),
		textInst(PlanetLabel, 290, 295, 100, 48, "Лес Эха", { size: 11, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: 1 } }),
		textInst(PlanetLabel, 450, 295, 100, 48, "Пепельная Луна", { size: 11, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: 2 } }),
		textInst(PlanetLabel, 610, 295, 100, 48, "Ржавый Марс", { size: 11, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: 3 } }),
		textInst(PlanetLabel, 370, 445, 100, 48, "Грозовая Церера", { size: 11, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: 4 } }),
		textInst(PlanetLabel, 530, 445, 100, 48, "Ледяная Европа", { size: 11, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: 5 } }),
		textInst(PlanetLabel, 690, 445, 100, 48, "Бездна Эха", { size: 11, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: 6 } }),
		textInst(StarHint, 210, 505, 860, 28, "1–6 / клик — планета · у каждой свои узлы · последний узел = босс мира · X закрыть", { size: 12, align: "center", color: "#8aa0b8", bold: false, visible: false }),
		spriteInst(StarClose, 1042, 78, { w: 40, h: 40, visible: false }),
		// Карта узлов миссий (Warframe Earth-style)
		spriteInst(MissionMapWindow, 90, 70, { w: 1100, h: 580, visible: false }),
		textInst(MissionMapTitle, 90, 82, 1100, 36, "КАРТА УЗЛОВ", { size: 22, align: "center", color: "#9ed0ff", visible: false }),
		textInst(MissionMapInfo, 110, 125, 1060, 28, "", { size: 13, align: "center", color: "#b0c8e0", visible: false }),
		spriteInst(MissionEdge, -900, -900, { w: 64, h: 4, visible: false }),
		...MISSION_NODE_POS.flatMap(([x, y], i) => [
			spriteInst(MissionNode, x, y, { w: 36, h: 36, anim: "lock", visible: false, vars: { Slot: i + 1 } }),
			textInst(MissionNodeLabel, x - 50, y + 20, 100, 36, MISSION_NODE_NAMES[i], {
				size: 10, align: "center", color: "#c8e8ff", visible: false, vars: { Slot: i + 1 },
			}),
		]),
		textInst(MissionMapHint, 110, 600, 1060, 28, "Клик по синему узлу — начать · пройденные зелёные · X закрыть", { size: 12, align: "center", color: "#8aa0b8", bold: false, visible: false }),
		spriteInst(MissionMapClose, 1140, 78, { w: 40, h: 40, visible: false }),
		textInst(GameOverText, 240, 200, 800, 280, "", { size: 22, align: "center", color: "#ff6a5a", visible: false }),
		textInst(PauseText, 440, 320, 400, 60, "ПАУЗА", { size: 28, align: "center", visible: false }),
		textInst(MsgText, -900, -300, 700, 40, "", { size: 18, align: "center", color: "#7ec8ff", behaviors: { Fade: fadeProps(1.2, 0.7) } }),
		textInst(Label, 12, 680, 700, 24, "1/2 оружие · G пол · E кузница · M моды · V планеты · F узлы · Shift стелс · T тихий удар", { size: 11, color: "#8a909c", bold: false }),
	], { transparent: true, parallax: 0 }),
], { w: WORLD_W, h: WORLD_H });

// ===== события =====
const eventSheets = [];
function uniquifyEventTree(events) {
	const cloned = JSON.parse(JSON.stringify(events));
	const walk = (o) => {
		if (!o || typeof o !== "object") return;
		if (Array.isArray(o)) { o.forEach(walk); return; }
		if (typeof o.sid === "number") o.sid = sid();
		for (const v of Object.values(o)) walk(v);
	};
	walk(cloned);
	return cloned;
}
function sheet(name, events) {
	eventSheets.push(name);
	writeJSON(`eventSheets/${name}.json`, { name, events: uniquifyEventTree(events), sid: sid() });
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

// Слоты: Gun1 основное · Gun2 второе · FloorGun на полу (−1 = пусто)
// Типы: 0 эхо · 1 пепел · 2 иней · 3 гроза
const PLANET_COUNT = 6;
const GUN_MOD_CAP = 12;
const GUN_TYPE_NAMES = { 0: "Эхо-клинок", 1: "Клинок пепла", 2: "Клинок инея", 3: "Клинок грозы" };
const MOD_DEFS = [
	{ kind: 1, cost: 4, name: "Остриё", dmg: 6 },
	{ kind: 2, cost: 5, name: "Скорострел", dmg: 0 },
	{ kind: 3, cost: 6, name: "Вампир", dmg: 0 },
	{ kind: 4, cost: 7, name: "Калибр", dmg: 10 },
	{ kind: 5, cost: 3, name: "Искра", dmg: 4 },
];
const poiDistExpr = `Floor(distance(Hero.X, Hero.Y, ObjectiveX, ObjectiveY))`;
const missionMapInfoText =
	`LayerName & " · доступен узел " & Mission & "/" & PlanetNodes & " · клик по подсвеченному"`;
const enemyLevel = `Layer + Mission + Floor(RoomsDone / 4)`;
// Archetype: 0 shooter · 1 melee · 2 sniper · 3 wolf · 4 heavy · 5 drone · 6 swarm · 7 ancient
const archAnimExpr = (a) => {
	if (a === 3) return q("wolf");
	const base = a === 0 ? "shooter" : a === 2 ? "sniper" : a === 4 ? "heavy" : a === 5 ? "drone" : a === 6 ? "swarm" : a === 7 ? "ancient" : "melee";
	return `"${base}" & Layer`;
};
const bossAnimExpr = `"golem" & Layer`;
const forgeWalletText =
	`"Золото: " & Gold & "з   Ядра F/I/S: " & CoreFire & "/" & CoreIce & "/" & CoreShock & newline` +
	`& "1:" & Gun1Name & "   2:" & Gun2Name & "   пол:" & FloorGunName`;
const modInfoText =
	`"Пушка в руке: " & HandGunName & "   ёмкость: " & HandCap & "/" & ${GUN_MOD_CAP} & newline` +
	`& "Инвентарь ∞: Ост " & InvM1 & " · Скор " & InvM2 & " · Вамп " & InvM3 & " · Кал " & InvM4 & " · Искра " & InvM5`;
/** HUD: короткие выражения на уже синхронизированных переменных. */
const hudPlanetText =
	`"Планета: " & LayerName & " · узел " & Mission & "/" & PlanetNodes & " · мир " & Layer & "/" & MaxLayer`;
const hudCombatText =
	`"Тип: " & MissionTypeName & " · ур.врагов " & (${enemyLevel}) & " · убито " & Kills`;
const hudWalletText =
	`"Золото: " & Gold & "  Ядра F/I/S: " & CoreFire & "/" & CoreIce & "/" & CoreShock`;
const hudGunsText =
	`"Рука[1]: " & Gun1Name & HandMark1 & "   [2]: " & Gun2Name & HandMark2 & "   Пол: " & FloorGunName & " (G)"`;
const hudModsText =
	`"Моды: " & ModNameA & "/" & ModNameB & "/" & ModNameC & "/" & ModNameD & " (" & HandCap & "/" & ${GUN_MOD_CAP} & ")  Инв: " & InvM1 & "/" & InvM2 & "/" & InvM3 & "/" & InvM4 & "/" & InvM5`;
const hudStatusText =
	`"Реликвия: " & RelicType & RelicReadyText & ShieldText & StealthText & AlarmText`;
/** Применить слот мода HandMod* → вес / урон / флаги / имя / costVar. */
const applyHandModSlot = (slotVar, nameVar, costVar) => MOD_DEFS.flatMap(({ kind, cost, name, dmg }) => [
	E([varIs(slotVar, "=", kind)], [
		addVar("HandCap", cost),
		setVar(costVar, cost),
		...(dmg ? [addVar("ModBonusDmg", dmg)] : []),
		...(kind === 2 ? [setVar("HasSpeedMod", 1)] : []),
		...(kind === 3 ? [setVar("HasLifeMod", 1)] : []),
		setVar(nameVar, q(name)),
		setVar(`SlotHas${kind}`, 1),
	]),
]);
const meleeMoveActions = [
	A("Enemy", "set-angle-of-motion", { angle: "Self.PathAng" }, "Bullet"),
	A("Enemy", "set-speed", {
		speed: `Element = 2 ? (distance(Self.X, Self.Y, AiTX, AiTY) < 220 ? Self.Speed * 0.55 : Self.Speed) : Self.Speed`,
	}, "Bullet"),
];
const meleeMoveEvents = (extraConds = []) => [
	[1], [6], [7],
].map(([arch]) =>
	E([
		forEach("Enemy"),
		ivIs("Enemy", "Alert", "=", 1),
		ivIs("Enemy", "Archetype", "=", arch),
		cmp2("MissionType", "!=", "2"),
		...extraConds,
	], [...meleeMoveActions]))
	.concat([
		E([
			forEach("Enemy"),
			ivIs("Enemy", "Alert", "=", 1),
			ivIs("Enemy", "IsBoss", "=", 1),
			cmp2("MissionType", "!=", "2"),
			...extraConds,
		], [...meleeMoveActions]),
		E([
			forEach("Enemy"),
			ivIs("Enemy", "Alert", "=", 1),
			ivIs("Enemy", "Archetype", "=", 3),
			ivIs("Enemy", "Agro", "=", 1),
			cmp2("MissionType", "!=", "2"),
			...extraConds,
		], [...meleeMoveActions]),
	]);

const modUiHide = [
	setVar("InMods", 0),
	A("ModWindow", "set-visible", { visibility: "invisible" }),
	A("ModTitle", "set-visible", { visibility: "invisible" }),
	A("ModInfo", "set-visible", { visibility: "invisible" }),
	A("ModRow", "set-visible", { visibility: "invisible" }),
	A("ModBtn", "set-visible", { visibility: "invisible" }),
	A("ModBtnLabel", "set-visible", { visibility: "invisible" }),
	A("ModHint", "set-visible", { visibility: "invisible" }),
	A("ModClose", "set-visible", { visibility: "invisible" }),
];
const starUiHide = [
	setVar("InStarMap", 0),
	A("StarWindow", "set-visible", { visibility: "invisible" }),
	A("StarTitle", "set-visible", { visibility: "invisible" }),
	A("StarInfo", "set-visible", { visibility: "invisible" }),
	A("PlanetBtn", "set-visible", { visibility: "invisible" }),
	A("PlanetLabel", "set-visible", { visibility: "invisible" }),
	A("StarHint", "set-visible", { visibility: "invisible" }),
	A("StarClose", "set-visible", { visibility: "invisible" }),
];
const missionMapUiHide = [
	setVar("InMissionMap", 0),
	A("MissionMapWindow", "set-visible", { visibility: "invisible" }),
	A("MissionMapTitle", "set-visible", { visibility: "invisible" }),
	A("MissionMapInfo", "set-visible", { visibility: "invisible" }),
	A("MissionMapHint", "set-visible", { visibility: "invisible" }),
	A("MissionMapClose", "set-visible", { visibility: "invisible" }),
	A("MissionNode", "set-visible", { visibility: "invisible" }),
	A("MissionNodeLabel", "set-visible", { visibility: "invisible" }),
	A("MissionEdge", "destroy"),
];
const forgeShow = [
	...starUiHide,
	...missionMapUiHide,
	...modUiHide,
	setVar("InForge", 1),
	A("ForgeDim", "set-visible", { visibility: "visible" }),
	A("ForgeWindow", "set-visible", { visibility: "visible" }),
	A("ForgeTitle", "set-visible", { visibility: "visible" }),
	A("ForgeWallet", "set-visible", { visibility: "visible" }),
	A("ForgeSec", "set-visible", { visibility: "visible" }),
	A("ForgeRow", "set-visible", { visibility: "visible" }),
	A("ForgeBtn", "set-visible", { visibility: "visible" }),
	A("ForgeBtnLabel", "set-visible", { visibility: "visible" }),
	A("ForgeHint", "set-visible", { visibility: "visible" }),
	A("ForgeClose", "set-visible", { visibility: "visible" }),
	A("ForgePrompt", "set-visible", { visibility: "invisible" }),
	A("ModPrompt", "set-visible", { visibility: "invisible" }),
	A("GatePrompt", "set-visible", { visibility: "invisible" }),
	A("ForgeWallet", "set-text", { text: forgeWalletText }),
	...hudHide(),
	Call("RefreshForge"),
];
const forgeHide = [
	setVar("InForge", 0),
	A("ForgeDim", "set-visible", { visibility: "invisible" }),
	A("ForgeWindow", "set-visible", { visibility: "invisible" }),
	A("ForgeTitle", "set-visible", { visibility: "invisible" }),
	A("ForgeWallet", "set-visible", { visibility: "invisible" }),
	A("ForgeSec", "set-visible", { visibility: "invisible" }),
	A("ForgeRow", "set-visible", { visibility: "invisible" }),
	A("ForgeBtn", "set-visible", { visibility: "invisible" }),
	A("ForgeBtnLabel", "set-visible", { visibility: "invisible" }),
	A("ForgeHint", "set-visible", { visibility: "invisible" }),
	A("ForgeClose", "set-visible", { visibility: "invisible" }),
	...hudShow(),
];
const missionMapShow = [
	...forgeHide,
	...modUiHide,
	...starUiHide,
	setVar("InMissionMap", 1),
	A("ForgeDim", "set-visible", { visibility: "visible" }),
	A("MissionMapWindow", "set-visible", { visibility: "visible" }),
	A("MissionMapTitle", "set-visible", { visibility: "visible" }),
	A("MissionMapInfo", "set-visible", { visibility: "visible" }),
	A("MissionMapHint", "set-visible", { visibility: "visible" }),
	A("MissionMapClose", "set-visible", { visibility: "visible" }),
	A("ForgePrompt", "set-visible", { visibility: "invisible" }),
	A("ModPrompt", "set-visible", { visibility: "invisible" }),
	A("GatePrompt", "set-visible", { visibility: "invisible" }),
	...hudHide(),
	Call("RefreshMissionMap"),
];
const modShow = [
	...starUiHide,
	...missionMapUiHide,
	...forgeHide,
	setVar("InMods", 1),
	A("ForgeDim", "set-visible", { visibility: "visible" }),
	A("ModWindow", "set-visible", { visibility: "visible" }),
	A("ModTitle", "set-visible", { visibility: "visible" }),
	A("ModInfo", "set-visible", { visibility: "visible" }),
	A("ModRow", "set-visible", { visibility: "visible" }),
	A("ModBtn", "set-visible", { visibility: "visible" }),
	A("ModBtnLabel", "set-visible", { visibility: "visible" }),
	A("ModHint", "set-visible", { visibility: "visible" }),
	A("ModClose", "set-visible", { visibility: "visible" }),
	A("ForgePrompt", "set-visible", { visibility: "invisible" }),
	A("ModPrompt", "set-visible", { visibility: "invisible" }),
	A("GatePrompt", "set-visible", { visibility: "invisible" }),
	...hudHide(),
	Call("RefreshModUI"),
];
const modHide = [
	...modUiHide,
	A("ForgeDim", "set-visible", { visibility: "invisible" }),
	...hudShow(),
];
const starShow = [
	...forgeHide,
	...modUiHide,
	...missionMapUiHide,
	setVar("InStarMap", 1),
	A("ForgeDim", "set-visible", { visibility: "visible" }),
	A("StarWindow", "set-visible", { visibility: "visible" }),
	A("StarTitle", "set-visible", { visibility: "visible" }),
	A("StarInfo", "set-visible", { visibility: "visible" }),
	A("PlanetBtn", "set-visible", { visibility: "visible" }),
	A("PlanetLabel", "set-visible", { visibility: "visible" }),
	A("StarHint", "set-visible", { visibility: "visible" }),
	A("StarClose", "set-visible", { visibility: "visible" }),
	A("ForgePrompt", "set-visible", { visibility: "invisible" }),
	A("ModPrompt", "set-visible", { visibility: "invisible" }),
	A("GatePrompt", "set-visible", { visibility: "invisible" }),
	...hudHide(),
	Call("RefreshStarMap"),
];
const forgeSpawnNpc = [
	A("ForgeNPC", "set-position", { x: "400", y: "300" }),
	A("ForgeNPC", "set-visible", { visibility: "visible" }),
	A("ForgePrompt", "set-position", { x: "280", y: "240" }),
	A("ForgePrompt", "set-text", { text: q("E — кузница") }),
	A("ForgePrompt", "set-visible", { visibility: "visible" }),
	A("EchoGate", "set-position", { x: "640", y: "300" }),
	A("EchoGate", "set-visible", { visibility: "visible" }),
	A("GatePrompt", "set-position", { x: "500", y: "230" }),
	A("GatePrompt", "set-text", { text: q("F — узлы · V — планеты") }),
	A("GatePrompt", "set-visible", { visibility: "visible" }),
	A("ModBench", "set-position", { x: "880", y: "300" }),
	A("ModBench", "set-visible", { visibility: "visible" }),
	A("ModPrompt", "set-position", { x: "740", y: "240" }),
	A("ModPrompt", "set-text", { text: q("M — автомат модов") }),
	A("ModPrompt", "set-visible", { visibility: "visible" }),
];
const forgeClearNpc = [
	A("ForgeNPC", "set-position", { x: "-800", y: "-800" }),
	A("ForgeNPC", "set-visible", { visibility: "invisible" }),
	A("ForgePrompt", "set-position", { x: "-800", y: "-800" }),
	A("ForgePrompt", "set-visible", { visibility: "invisible" }),
	A("EchoGate", "set-position", { x: "-800", y: "-800" }),
	A("EchoGate", "set-visible", { visibility: "invisible" }),
	A("GatePrompt", "set-position", { x: "-800", y: "-800" }),
	A("GatePrompt", "set-visible", { visibility: "invisible" }),
	A("ModBench", "set-position", { x: "-800", y: "-800" }),
	A("ModBench", "set-visible", { visibility: "invisible" }),
	A("ModPrompt", "set-position", { x: "-800", y: "-800" }),
	A("ModPrompt", "set-visible", { visibility: "invisible" }),
	...modHide,
	...starUiHide,
	...missionMapUiHide,
];
const starInfoText =
	`"У каждой планеты свои узлы-миссии · последний узел = босс мира" & newline` +
	`& "Сейчас: " & LayerName & " · миссия " & Mission & "/" & PlanetNodes & ` +
	`" · миров " & MaxLayer & "/${PLANET_COUNT}"`;

/** arch: 0 shooter · 1 melee · 2 sniper · 3 wolf · 4 heavy · 5 drone · 6 swarm · 7 ancient */
const spawnEnemyActions = (x, y, arch) => {
	const hp =
		arch === 4 ? `55 + (${enemyLevel}) * 14`
			: arch === 7 ? `48 + (${enemyLevel}) * 12`
				: arch === 2 ? `38 + (${enemyLevel}) * 10`
					: arch === 3 ? `22 + (${enemyLevel}) * 6`
						: arch === 6 ? `12 + (${enemyLevel}) * 4`
							: arch === 5 ? `14 + (${enemyLevel}) * 5`
								: arch === 0 ? `16 + (${enemyLevel}) * 5`
									: `24 + (${enemyLevel}) * 7`;
	const dmg =
		arch === 4 ? `12 + (${enemyLevel}) * 2`
			: arch === 7 ? `11 + (${enemyLevel}) * 2`
				: arch === 2 ? `10 + (${enemyLevel}) * 2`
					: arch === 6 ? `6 + ${enemyLevel}`
						: arch === 0 || arch === 5 ? `7 + ${enemyLevel}`
							: arch === 3 ? `9 + ${enemyLevel}`
								: `8 + ${enemyLevel}`;
	const spd =
		arch === 6 ? `155 + Layer * 10`
			: arch === 5 ? `120 + Layer * 7`
				: arch === 3 ? `130 + Layer * 8`
					: arch === 0 ? `95 + Layer * 5`
						: arch === 4 ? `42 + Layer * 2`
							: arch === 7 ? `48 + Layer * 2`
								: arch === 2 ? `55 + Layer * 3`
									: `70 + Layer * 4`;
	const bounty =
		arch === 7 ? `18 + RoomsDone + Layer * 4`
			: arch === 4 ? `14 + RoomsDone + Layer * 3`
				: arch === 3 ? `12 + RoomsDone + Layer * 3`
					: `6 + RoomsDone + Layer * 2`;
	const actions = [
		create("Enemy", "Game", x, y),
		setIv("Enemy", "IsBoss", 0),
		setIv("Enemy", "Archetype", arch),
		setIv("Enemy", "Agro", arch === 3 ? 0 : 1),
		A("Enemy", "set-animation", { animation: archAnimExpr(arch), from: "beginning" }),
		setIv("Enemy", "MaxHP", hp),
		setIv("Enemy", "HP", "Self.MaxHP"),
		setIv("Enemy", "Damage", dmg),
		setIv("Enemy", "Speed", spd),
		setIv("Enemy", "Bounty", bounty),
		setIv("Enemy", "AtkCD", "random(0.4, 1.2)"),
		setIv("Enemy", "Alert", 0),
		setIv("Enemy", "PathAng", `angle(${x}, ${y}, AiTX, AiTY)`),
	];
	// волки не считаются для зачистки комнаты
	if (arch !== 3) actions.push(addVar("EnemiesAlive", 1));
	return actions;
};
const spawnDenActions = (x, y) => [
	create("WolfDen", "Game", x, y),
	setIv("WolfDen", "MaxHP", "36 + Layer * 10"),
	setIv("WolfDen", "HP", "Self.MaxHP"),
	A("WolfDen", "set-visible", { visibility: "visible" }),
];
const spawnProp = (x, y, anim) => [
	create("RoomProp", "Game", x, y),
	A("RoomProp", "set-animation", { animation: q(anim), from: "beginning" }),
	A("RoomProp", "set-visible", { visibility: "visible" }),
];

sheet("Game_ev", [
	Comment("Эхо-Рыцарь: миссии-локации + хаб кузницы (Warframe-лайт)."),
	Var("RelicType", "string", "heal"),
	Var("Gold", "number", 0),
	Var("MaxLayer", "number", 1),
	Var("Mission", "number", 1),
	Var("MissionType", "number", 0),
	Var("MissionL1", "number", 1),
	Var("MissionL2", "number", 1),
	Var("MissionL3", "number", 1),
	Var("MissionL4", "number", 1),
	Var("MissionL5", "number", 1),
	Var("MissionL6", "number", 1),
	Var("RoomsDone", "number", 0),
	Var("Kills", "number", 0),
	Var("CoreFire", "number", 0),
	Var("CoreIce", "number", 0),
	Var("CoreShock", "number", 0),
	Var("Element", "number", 0),
	Var("EchoElement", "number", 0),
	Var("Gun1", "number", 0),
	Var("Gun2", "number", -1),
	Var("FloorGun", "number", -1),
	Var("FloorX", "number", 0),
	Var("FloorY", "number", 0),
	Var("Hand", "number", 1),
	Var("TempGun", "number", 0),
	Var("Gun1ModA", "number", -1),
	Var("Gun1ModB", "number", -1),
	Var("Gun1ModC", "number", -1),
	Var("Gun1ModD", "number", -1),
	Var("Gun2ModA", "number", -1),
	Var("Gun2ModB", "number", -1),
	Var("Gun2ModC", "number", -1),
	Var("Gun2ModD", "number", -1),
	Var("InvM1", "number", 0),
	Var("InvM2", "number", 0),
	Var("InvM3", "number", 0),
	Var("InvM4", "number", 0),
	Var("InvM5", "number", 0),
	Var("TempMod", "number", -1),
	Var("EnemiesAlive", "number", 0),
	Var("InForge", "number", 0),
	Var("InMods", "number", 0),
	Var("InStarMap", "number", 0),
	Var("InMissionMap", "number", 0),
	Var("InHub", "number", 1),
	Var("InMission", "number", 0),
	Var("Wave", "number", 1),
	Var("WaveMax", "number", 3),
	Var("DefendTimer", "number", 0),
	Var("DefendX", "number", 640),
	Var("DefendY", "number", 360),
	Var("DefendHP", "number", 200),
	Var("DefendMaxHP", "number", 200),
	Var("ObjectiveX", "number", 1920),
	Var("ObjectiveY", "number", 1100),
	Var("ObjectiveDone", "number", 0),
	Var("Stealth", "number", 0),
	Var("SpyProgress", "number", 0),
	Var("Alarm", "number", 0),
	Var("LosBlocked", "number", 0),
	Var("ProbeX", "number", 0),
	Var("ProbeY", "number", 0),
	Var("SteerGoal", "number", 0),
	Var("SteerTry", "number", 0),
	Var("SteerHit", "number", 0),
	Var("SteerBest", "number", 0),
	Var("SteerTgtX", "number", 0),
	Var("SteerTgtY", "number", 0),
	Var("HostageOK", "number", 0),
	Var("DashCD", "number", 0),
	Var("IFrames", "number", 0),
	Var("Shield", "number", 0),
	Var("RelicCD", "number", 0),
	Var("GameOver", "number", 0),
	Var("Won", "number", 0),
	Var("SpawnReady", "number", 0),
	Var("BossAlive", "number", 0),
	Var("BossPhase", "number", 0),
	Var("ChainX", "number", 0),
	Var("ChainY", "number", 0),
	Var("AuraX", "number", 0),
	Var("AuraY", "number", 0),
	Var("HitUID", "number", 0),
	Var("ChainTargetUID", "number", 0),
	Var("ChainLock", "number", 0),
	Var("Layer", "number", 1),
	Var("PlanetNodes", "number", 9),
	Var("LayerName", "string", "Лес Эха"),
	Var("MissionTypeName", "string", "Истребление"),
	Var("GroundAnim", "string", "forge"),
	Var("ActiveGun", "number", 0),
	Var("AiTX", "number", 0),
	Var("AiTY", "number", 0),
	Var("Gun1Name", "string", "Эхо-клинок"),
	Var("Gun2Name", "string", "—"),
	Var("FloorGunName", "string", "—"),
	Var("HandGunName", "string", "Эхо-клинок"),
	Var("HandMark1", "string", " <<"),
	Var("HandMark2", "string", ""),
	Var("FloorAnim", "string", "echo"),
	Var("ElemAnim", "string", "normal"),
	Var("HandModA", "number", -1),
	Var("HandModB", "number", -1),
	Var("HandModC", "number", -1),
	Var("HandModD", "number", -1),
	Var("HandCap", "number", 0),
	Var("ModBonusDmg", "number", 0),
	Var("HasLifeMod", "number", 0),
	Var("HasSpeedMod", "number", 0),
	Var("BulletDmg", "number", 12),
	Var("ModNameA", "string", "—"),
	Var("ModNameB", "string", "—"),
	Var("ModNameC", "string", "—"),
	Var("ModNameD", "string", "—"),
	Var("HandCostA", "number", 0),
	Var("HandCostB", "number", 0),
	Var("HandCostC", "number", 0),
	Var("HandCostD", "number", 0),
	Var("SlotHas1", "number", 0),
	Var("SlotHas2", "number", 0),
	Var("SlotHas3", "number", 0),
	Var("SlotHas4", "number", 0),
	Var("SlotHas5", "number", 0),
	Var("RelicReadyText", "string", " ГОТОВА"),
	Var("ShieldText", "string", ""),
	Var("StealthText", "string", ""),
	Var("AlarmText", "string", ""),

	Comment("Старт забега → хаб кузницы"),
	E([sys("on-start-of-layout")], [
		A("Enemy", "destroy"), A("Door", "destroy"), A("Core", "destroy"), A("HeroBullet", "destroy"),
		A("EnemyBullet", "destroy"), A("ModPickup", "destroy"), A("WolfDen", "destroy"), A("RoomProp", "destroy"),
		A("SpyTerminal", "destroy"), A("Hostage", "destroy"), A("ExtractZone", "destroy"),
		...miniClearAll,
		setVar("Gold", 0), setVar("Layer", 1), setVar("MaxLayer", 1), setVar("Mission", 1), setVar("MissionType", 0),
		setVar("MissionL1", 1), setVar("MissionL2", 1), setVar("MissionL3", 1),
		setVar("MissionL4", 1), setVar("MissionL5", 1), setVar("MissionL6", 1),
		setVar("RoomsDone", 0), setVar("Kills", 0),
		setVar("CoreFire", 99), setVar("CoreIce", 99), setVar("CoreShock", 99), setVar("Element", 0), setVar("EchoElement", 0),
		setVar("Gun1", 0), setVar("Gun2", -1), setVar("FloorGun", -1),
		setVar("FloorX", 0), setVar("FloorY", 0), setVar("Hand", 1), setVar("TempGun", 0),
		setVar("Gun1ModA", -1), setVar("Gun1ModB", -1), setVar("Gun1ModC", -1), setVar("Gun1ModD", -1),
		setVar("Gun2ModA", -1), setVar("Gun2ModB", -1), setVar("Gun2ModC", -1), setVar("Gun2ModD", -1),
		setVar("InvM1", 0), setVar("InvM2", 0), setVar("InvM3", 0), setVar("InvM4", 0), setVar("InvM5", 0),
		setVar("TempMod", -1),
		setVar("EnemiesAlive", 0), setVar("InForge", 0), setVar("InMods", 0), setVar("InStarMap", 0), setVar("InMissionMap", 0),
		setVar("InHub", 1), setVar("InMission", 0), setVar("Wave", 1), setVar("WaveMax", 3),
		setVar("DefendTimer", 0), setVar("DefendX", 1920), setVar("DefendY", 1100),
		setVar("DefendHP", 200), setVar("DefendMaxHP", 200),
		setVar("ObjectiveX", 640), setVar("ObjectiveY", 400),
		setVar("Stealth", 0), setVar("SpyProgress", 0), setVar("Alarm", 0), setVar("HostageOK", 0),
		setVar("ObjectiveDone", 0), setVar("SpawnReady", 0),
		setVar("DashCD", 0), setVar("IFrames", 1.2), setVar("Shield", 0), setVar("RelicCD", 0),
		setVar("GameOver", 0), setVar("Won", 0), setVar("BossAlive", 0), setVar("BossPhase", 0),
		setVar("ChainX", 0), setVar("ChainY", 0), setVar("AuraX", 0), setVar("AuraY", 0),
		setVar("HitUID", 0), setVar("ChainTargetUID", 0), setVar("ChainLock", 0),
		setVar("PlanetNodes", 9), setVar("LayerName", q("Лес Эха")), setVar("MissionTypeName", q("Истребление")), setVar("GroundAnim", q("forge")),
		setIv("Hero", "MaxHP", 100), setIv("Hero", "HP", 100), setIv("Hero", "Damage", 12), setIv("Hero", "AtkRate", 0.35), setIv("Hero", "AtkCD", 0),
		A("Hero", "set-ignoring-input", { input: "stop-ignoring" }, "EightDir"),
		A("System", "set-time-scale", { "time-scale": "1" }),
		A("FloorWeapon", "set-visible", { visibility: "invisible" }),
		A("FloorWeapon", "set-position", { x: "-900", y: "-900" }),
		...forgeHide,
		A("GameOverText", "set-visible", { visibility: "invisible" }),
		Call("SyncPlanetMeta"),
		Call("EnterHub"),
	]),

	Comment("Тик: ИИ, HUD, цели миссий"),
	E([sys("every-tick")], [
		subIv("Hero", "AtkCD", "dt"),
		subIv("Enemy", "AtkCD", "dt"),
		setVar("DashCD", "max(0, DashCD - dt)"),
		setVar("IFrames", "max(0, IFrames - dt)"),
		setVar("Shield", "max(0, Shield - dt)"),
		setVar("RelicCD", "max(0, RelicCD - dt)"),
		Call("SyncCombatMeta"),
		A("Hero", "set-angle-toward-position", { x: "Mouse.X", y: "Mouse.Y" }),
		A("Fx", "set-size", { width: "Self.Width + 700 * dt", height: "Self.Height + 700 * dt" }),
		A("HPBar", "set-width", { width: "300 * max(0, Hero.HP) / Hero.MaxHP" }),
		A("HudPlanet", "set-text", { text: hudPlanetText }),
		A("HudCombat", "set-text", { text: hudCombatText }),
		A("HudWallet", "set-text", { text: hudWalletText }),
		A("HudGuns", "set-text", { text: hudGunsText }),
		A("HudMods", "set-text", { text: hudModsText }),
		A("HudStatus", "set-text", { text: hudStatusText }),
		Call("RefreshObjective"),
	], [
		E([varIs("Stealth", "=", 1)], [
			A("Hero", "set-opacity", { opacity: "55" }),
			A("Hero", "set-max-speed", { "max-speed": "110" }, "EightDir"),
		]),
		E([varIs("Stealth", "=", 0), varIs("Shield", ">", 0)], [
			A("Hero", "set-opacity", { opacity: "70 + 30 * sin(time * 600)" }),
			A("Hero", "set-max-speed", { "max-speed": "260" }, "EightDir"),
		]),
		E([varIs("Stealth", "=", 0), varIs("Shield", "<=", 0)], [
			A("Hero", "set-opacity", { opacity: "100" }),
			A("Hero", "set-max-speed", { "max-speed": "260" }, "EightDir"),
		]),
		E([varIs("HasSpeedMod", "=", 1)], [setIv("Hero", "AtkRate", "0.16")]),
		E([varIs("HasSpeedMod", "=", 0), varIs("ActiveGun", "=", 3)], [setIv("Hero", "AtkRate", "0.18")]),
		E([varIs("HasSpeedMod", "=", 0), cmp2("ActiveGun", "!=", "3"), varIs("Element", "=", 3)], [setIv("Hero", "AtkRate", "0.22")]),
		E([varIs("HasSpeedMod", "=", 0), cmp2("ActiveGun", "!=", "3"), cmp2("Element", "!=", "3")], [setIv("Hero", "AtkRate", "0.35")]),
		// Спрайт врага НЕ крутим — только угол движения Bullet (PathAng = рулевой pathfinding)
		E([forEach("Enemy")], [A("Enemy", "set-angle", { angle: "0" })]),
		// Пока не видят — стоят (кроме обороны бура)
		E([
			forEach("Enemy"),
			ivIs("Enemy", "Alert", "=", 0),
			cmp2("MissionType", "!=", "2"),
		], [
			A("Enemy", "set-speed", { speed: "0" }, "Bullet"),
		]),
		// Melee / swarm / ancient / boss / agro wolf — по PathAng
		...meleeMoveEvents(),
		// Wolf passive — стоит
		E([forEach("Enemy"), ivIs("Enemy", "Archetype", "=", 3), ivIs("Enemy", "Agro", "=", 0)], [
			A("Enemy", "set-speed", { speed: "0" }, "Bullet"),
		]),
		// Shooter: держит дистанцию, движение по PathAng
		E([forEach("Enemy"), ivIs("Enemy", "Alert", "=", 1), ivIs("Enemy", "Archetype", "=", 0), varIs("GameOver", "=", 0), cmp2("MissionType", "!=", "2")], [
			A("Enemy", "set-angle-of-motion", { angle: "Self.PathAng" }, "Bullet"),
			A("Enemy", "set-speed", {
				speed: `distance(Self.X, Self.Y, AiTX, AiTY) < 180 ? Self.Speed : (distance(Self.X, Self.Y, AiTX, AiTY) > 260 ? Self.Speed * 0.85 : Self.Speed * 0.35)`,
			}, "Bullet"),
		]),
		// Heavy
		E([forEach("Enemy"), ivIs("Enemy", "Alert", "=", 1), ivIs("Enemy", "Archetype", "=", 4), varIs("GameOver", "=", 0), cmp2("MissionType", "!=", "2")], [
			A("Enemy", "set-angle-of-motion", { angle: "Self.PathAng" }, "Bullet"),
			A("Enemy", "set-speed", {
				speed: `distance(Self.X, Self.Y, AiTX, AiTY) < 140 ? Self.Speed * 0.4 : Self.Speed`,
			}, "Bullet"),
		]),
		// Drone
		E([forEach("Enemy"), ivIs("Enemy", "Alert", "=", 1), ivIs("Enemy", "Archetype", "=", 5), varIs("GameOver", "=", 0), cmp2("MissionType", "!=", "2")], [
			A("Enemy", "set-angle-of-motion", { angle: "Self.PathAng" }, "Bullet"),
			A("Enemy", "set-speed", {
				speed: `distance(Self.X, Self.Y, AiTX, AiTY) < 160 ? Self.Speed : (distance(Self.X, Self.Y, AiTX, AiTY) > 300 ? Self.Speed * 0.9 : Self.Speed * 0.55)`,
			}, "Bullet"),
		]),
		// Sniper
		E([forEach("Enemy"), ivIs("Enemy", "Alert", "=", 1), ivIs("Enemy", "Archetype", "=", 2), varIs("GameOver", "=", 0), cmp2("MissionType", "!=", "2")], [
			A("Enemy", "set-angle-of-motion", { angle: "Self.PathAng" }, "Bullet"),
			A("Enemy", "set-speed", {
				speed: `(distance(Self.X, Self.Y, AiTX, AiTY) < 300 ? Self.Speed : (distance(Self.X, Self.Y, AiTX, AiTY) > 420 ? Self.Speed * 0.5 : 0))`,
			}, "Bullet"),
		]),
		// Оборона: pathfinding к буру
		E([
			forEach("Enemy"),
			varIs("MissionType", "=", 2),
			varIs("InMission", "=", 1),
			varIs("GameOver", "=", 0),
			cmp2("(Enemy.Archetype = 3 ? Enemy.Agro : 1)", "=", "1"),
		], [
			A("Enemy", "set-angle-of-motion", { angle: "Self.PathAng" }, "Bullet"),
			A("Enemy", "set-speed", {
				speed: `distance(Self.X, Self.Y, DefendX, DefendY) < 48 ? 0 : (Element = 2 ? Self.Speed * 0.7 : Self.Speed)`,
			}, "Bullet"),
		]),
		// Обнаружение: радиус + сэмплы ProbeX/Y по лучу (короткие условия)
		E([
			forEach("Enemy"),
			varIs("InMission", "=", 1), varIs("GameOver", "=", 0),
			ivIs("Enemy", "Alert", "=", 0),
			cmp2("distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<", visionRangeExpr),
		], [
			setVar("LosBlocked", 0),
		], [
			...VISION_SAMPLES.map((t) =>
				E([], [...setVisionProbe(t)], [
					E(probeInWallConds(), [setVar("LosBlocked", 1)]),
				])),
			E([varIs("LosBlocked", "=", 0)], [
				setIv("Enemy", "Alert", 1),
				setIv("Enemy", "Agro", 1),
				setVar("Alarm", 1),
			]),
		]),
		// Заложник следует за героем после спасения
		E([varIs("HostageOK", "=", 1), varIs("InMission", "=", 1), varIs("GameOver", "=", 0)], [
			A("Hostage", "set-angle-of-motion", { angle: "angle(Hostage.X, Hostage.Y, Hero.X, Hero.Y)" }, "Bullet"),
			A("Hostage", "set-speed", {
				speed: `distance(Hostage.X, Hostage.Y, Hero.X, Hero.Y) > 70 ? 200 : 0`,
			}, "Bullet"),
		]),
		// Стены: выталкиваем врагов (и заложника) из AABB — иначе Bullet проходит насквозь
		E([forEach("Enemy")], [], [
			E(enemyWallPush.overlapConds, [enemyWallPush.setPos]),
		]),
		E([varIs("HostageOK", "=", 1), forEach("Hostage")], [], [
			E(hostageWallPush.overlapConds, [hostageWallPush.setPos]),
		]),
		// Clamp врагов в большой локации
		E([forEach("Enemy")], [
			A("Enemy", "set-position", {
				x: `max(120, min(${WORLD_W - 120}, Self.X))`,
				y: `max(120, min(${WORLD_H - 120}, Self.Y))`,
			}),
		]),
		// Миникарта: герой / цель / враги (миссия, без оверлеев)
		E([
			varIs("InMission", "=", 1),
			varIs("InForge", "=", 0), varIs("InMods", "=", 0),
			varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0),
		], [
			...miniShowChrome,
			A("MiniHero", "set-position", { x: miniMapX("Hero.X"), y: miniMapY("Hero.Y") }),
			A("MiniObj", "set-position", { x: miniMapX("ObjectiveX"), y: miniMapY("ObjectiveY") }),
			A("MiniEnemy", "destroy"),
		], [
			E([forEach("Enemy")], [
				create("MiniEnemy", "HUD", miniMapX("Enemy.X"), miniMapY("Enemy.Y")),
				A("MiniEnemy", "set-size", { width: "8", height: "8" }),
				A("MiniEnemy", "set-visible", { visibility: "visible" }),
			]),
		]),
		E([varIs("InHub", "=", 1)], [...miniClearAll]),
		E([varIs("InForge", "=", 1)], [...miniHideChrome]),
		E([varIs("InMods", "=", 1)], [...miniHideChrome]),
		E([varIs("InStarMap", "=", 1)], [...miniHideChrome]),
		E([varIs("InMissionMap", "=", 1)], [...miniHideChrome]),
	]),

	Comment("Pathfinding: зонды вокруг стен → PathAng (без поведения Pathfinding — ломает .c3p)"),
	Fn("UpdateEnemyPaths", [], [], [
		E([
			forEach("Enemy"),
			varIs("InMission", "=", 1), varIs("GameOver", "=", 0),
			varIs("MissionType", "=", 2),
			cmp2("(Enemy.Archetype = 3 ? Enemy.Agro : 1)", "=", "1"),
		], [
			setVar("SteerTgtX", "DefendX"),
			setVar("SteerTgtY", "DefendY"),
			setVar("SteerGoal", "angle(Enemy.X, Enemy.Y, SteerTgtX, SteerTgtY)"),
			setVar("SteerBest", "-999"),
		], [
			...STEER_OFFSETS.map((off) =>
				E([cmp2("SteerBest", "=", "-999")], [
					setVar("SteerTry", `SteerGoal + (${off})`),
					setVar("SteerHit", 0),
				], [
					...STEER_PROBE_SAMPLES.map((t) =>
						E([], [...setSteerProbe(t)], [
							E(probeInWallConds(), [setVar("SteerHit", 1)]),
						])),
					E([varIs("SteerHit", "=", 0)], [
						setVar("SteerBest", "SteerTry"),
					]),
				])),
			E([cmp2("SteerBest", "!=", "-999")], [setIv("Enemy", "PathAng", "SteerBest")]),
			E([cmp2("SteerBest", "=", "-999")], [setIv("Enemy", "PathAng", "SteerGoal + 180")]),
		]),
		E([
			forEach("Enemy"),
			varIs("InMission", "=", 1), varIs("GameOver", "=", 0),
			cmp2("MissionType", "!=", "2"),
			ivIs("Enemy", "Alert", "=", 1),
		], [
			setVar("SteerTgtX", "Hero.X"),
			setVar("SteerTgtY", "Hero.Y"),
			setVar("SteerBest", "-999"),
		], [
			E([ivIs("Enemy", "Archetype", "=", 0), cmp2("distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<", "180")], [
				setVar("SteerTgtX", "Enemy.X + cos(angle(Hero.X, Hero.Y, Enemy.X, Enemy.Y)) * 220"),
				setVar("SteerTgtY", "Enemy.Y + sin(angle(Hero.X, Hero.Y, Enemy.X, Enemy.Y)) * 220"),
			]),
			E([ivIs("Enemy", "Archetype", "=", 2), cmp2("distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<", "320")], [
				setVar("SteerTgtX", "Enemy.X + cos(angle(Hero.X, Hero.Y, Enemy.X, Enemy.Y)) * 180"),
				setVar("SteerTgtY", "Enemy.Y + sin(angle(Hero.X, Hero.Y, Enemy.X, Enemy.Y)) * 180"),
			]),
			E([], [
				setVar("SteerGoal", "angle(Enemy.X, Enemy.Y, SteerTgtX, SteerTgtY)"),
			]),
			...STEER_OFFSETS.map((off) =>
				E([cmp2("SteerBest", "=", "-999")], [
					setVar("SteerTry", `SteerGoal + (${off})`),
					setVar("SteerHit", 0),
				], [
					...STEER_PROBE_SAMPLES.map((t) =>
						E([], [...setSteerProbe(t)], [
							E(probeInWallConds(), [setVar("SteerHit", 1)]),
						])),
					E([varIs("SteerHit", "=", 0)], [
						setVar("SteerBest", "SteerTry"),
					]),
				])),
			E([cmp2("SteerBest", "!=", "-999")], [setIv("Enemy", "PathAng", "SteerBest")]),
			E([cmp2("SteerBest", "=", "-999")], [setIv("Enemy", "PathAng", "SteerGoal + 180")]),
		]),
	]),
	E([
		everySec(0.22), varIs("InMission", "=", 1), varIs("GameOver", "=", 0),
		varIs("InForge", "=", 0), varIs("InMods", "=", 0),
	], [Call("UpdateEnemyPaths")]),

	Comment("Стелс: Shift удержать · T тихий удар"),
	E([sys("every-tick"), varIs("InMission", "=", 1)], [setVar("Stealth", 0)]),
	E([sys("every-tick"), keyDown(KEY.SHIFT), varIs("InMission", "=", 1), varIs("GameOver", "=", 0)], [setVar("Stealth", 1)]),
	E([sys("every-tick"), varIs("InHub", "=", 1)], [setVar("Stealth", 0)]),
	E([
		key(KEY.T), varIs("InMission", "=", 1), varIs("Stealth", "=", 1), varIs("GameOver", "=", 0),
		C("Enemy", "pick-nearestfurthest", { which: "nearest", x: "Hero.X", y: "Hero.Y", z: "0", "pick-all-tied": false }),
		cmp2("distance(Hero.X, Hero.Y, Enemy.X, Enemy.Y)", "<=", "55"),
		ivIs("Enemy", "Alert", "=", 0),
		ivIs("Enemy", "IsBoss", "=", 0),
	], [
		Call("DamageEnemy", "Enemy.UID", "9999"),
		...msg(100, q("Тихий удар!"), "rgbEx(60, 120, 80)"),
		...fx("Enemy.X", "Enemy.Y", 60, "rgbEx(40, 100, 60)"),
	]),

	Comment("Стрелки / дроны / тяжёлые / снайперы (цель: герой или бур; стрельба только после обнаружения / на обороне)"),
	E([
		everySec(0.55), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0),
		forEach("Enemy"),
		ivIs("Enemy", "AtkCD", "<=", 0),
		ivIs("Enemy", "Archetype", "=", 0),
		cmp2("(MissionType = 2 ? 1 : Enemy.Alert)", "=", "1"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, ">", "90"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, "<", "420"),
	], [
		setIv("Enemy", "AtkCD", "1.0"),
		create("EnemyBullet", "Game", "Enemy.X", "Enemy.Y"),
		A("EnemyBullet", "set-angle-of-motion", { angle: `angle(Enemy.X, Enemy.Y, AiTX, AiTY)` }, "Bullet"),
		A("EnemyBullet", "set-speed", { speed: "300" }, "Bullet"),
	]),
	E([
		everySec(0.5), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0),
		forEach("Enemy"),
		ivIs("Enemy", "AtkCD", "<=", 0),
		ivIs("Enemy", "Archetype", "=", 5),
		cmp2("(MissionType = 2 ? 1 : Enemy.Alert)", "=", "1"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, ">", "80"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, "<", "380"),
	], [
		setIv("Enemy", "AtkCD", "0.85"),
		create("EnemyBullet", "Game", "Enemy.X", "Enemy.Y"),
		A("EnemyBullet", "set-angle-of-motion", { angle: `angle(Enemy.X, Enemy.Y, AiTX, AiTY)` }, "Bullet"),
		A("EnemyBullet", "set-speed", { speed: "340" }, "Bullet"),
	]),
	E([
		everySec(0.7), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0),
		forEach("Enemy"),
		ivIs("Enemy", "AtkCD", "<=", 0),
		ivIs("Enemy", "Archetype", "=", 4),
		cmp2("(MissionType = 2 ? 1 : Enemy.Alert)", "=", "1"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, ">", "70"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, "<", "480"),
	], [
		setIv("Enemy", "AtkCD", "1.45"),
		create("EnemyBullet", "Game", "Enemy.X", "Enemy.Y"),
		A("EnemyBullet", "set-angle-of-motion", { angle: `angle(Enemy.X, Enemy.Y, AiTX, AiTY)` }, "Bullet"),
		A("EnemyBullet", "set-speed", { speed: "240" }, "Bullet"),
	]),
	E([
		everySec(0.55), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0),
		forEach("Enemy"),
		ivIs("Enemy", "AtkCD", "<=", 0),
		ivIs("Enemy", "Archetype", "=", 2),
		cmp2("(MissionType = 2 ? 1 : Enemy.Alert)", "=", "1"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, ">", "140"),
		cmp2(`distance(Enemy.X, Enemy.Y, AiTX, AiTY)`, "<", "700"),
	], [
		setIv("Enemy", "AtkCD", "1.8"),
		create("EnemyBullet", "Game", "Enemy.X", "Enemy.Y"),
		A("EnemyBullet", "set-angle-of-motion", { angle: `angle(Enemy.X, Enemy.Y, AiTX, AiTY)` }, "Bullet"),
		A("EnemyBullet", "set-speed", { speed: "480" }, "Bullet"),
	]),
	E([C("EnemyBullet", "on-collision-with-another-object", { object: "Hero" })], [
		Call("DamageHero", "8 + Layer * 3"),
		A("EnemyBullet", "destroy"),
	]),
	E([C("HeroBullet", "on-collision-with-another-object", { object: "Wall" })], [
		A("HeroBullet", "destroy"),
	]),
	E([C("EnemyBullet", "on-collision-with-another-object", { object: "Wall" })], [
		A("EnemyBullet", "destroy"),
	]),
	E([
		C("EnemyBullet", "on-collision-with-another-object", { object: "RoomProp" }),
		varIs("MissionType", "=", 2),
		varIs("GameOver", "=", 0),
	], [
		A("EnemyBullet", "destroy"),
		Call("DamageDrill", "6 + Layer * 2"),
	]),
	Comment("Древний (экзимус): лечит союзников рядом"),
	Fn("AncientHealNear", [], [], [
		E([
			forEach("Enemy"),
			ivIs("Enemy", "Archetype", "!=", 7),
			cmp2("distance(Enemy.X, Enemy.Y, AuraX, AuraY)", "<=", "150"),
			cmp2("Enemy.HP", "<", "Enemy.MaxHP"),
		], [
			setIv("Enemy", "HP", "min(Enemy.MaxHP, Enemy.HP + 5 + Layer * 2)"),
			...floatText("Enemy.X", "Enemy.Y - 16", q("+"), "rgbEx(40, 160, 80)"),
		]),
	]),
	E([
		everySec(2.2), varIs("GameOver", "=", 0), varIs("InForge", "=", 0),
		forEach("Enemy"),
		ivIs("Enemy", "Archetype", "=", 7),
	], [
		setVar("AuraX", "Enemy.X"),
		setVar("AuraY", "Enemy.Y"),
		...fx("Enemy.X", "Enemy.Y", 90, "rgbEx(40, 140, 70)"),
		Call("AncientHealNear"),
	]),
	Comment("Удар по логову → волки агро с 1-го попадания; зачистка комнаты без волков"),
	Fn("AgroWolves", [], [], [
		E([
			cmp2("Enemy.Count", ">", "0"),
			pickBy("Enemy", "Enemy.Archetype", "=", "3"),
			pickBy("Enemy", "Enemy.Agro", "=", "0"),
		], [
			...msg(90, q("Волки разозлены! Можно не убивать — фарм модов"), "rgbEx(140, 60, 30)"),
		]),
		E([forEach("Enemy"), ivIs("Enemy", "Archetype", "=", 3), ivIs("Enemy", "Agro", "=", 0)], [
			setIv("Enemy", "Agro", 1),
			setIv("Enemy", "Alert", 1),
			setIv("Enemy", "Speed", "Self.Speed + 25"),
		]),
	]),
	E([C("HeroBullet", "on-collision-with-another-object", { object: "WolfDen" })], [
		subIv("WolfDen", "HP", "BulletDmg"),
		Call("AgroWolves"),
		...floatText("WolfDen.X", "WolfDen.Y - 20", q("ЛОГОВО"), "rgbEx(120, 80, 40)"),
		A("HeroBullet", "destroy"),
	], [
		E([ivIs("WolfDen", "HP", "<=", 0)], [
			A("WolfDen", "destroy"),
			...fx("WolfDen.X", "WolfDen.Y", 90, "rgbEx(100, 50, 20)"),
			...msg(110, q("Логово разрушено"), "rgbEx(120, 80, 40)"),
		]),
	]),

	Comment("Движение WASD (стрелки тоже работают)"),
	E([keyDown(KEY.W), keyDown(KEY.UP)], [simMove("up")], null, { or: true }),
	E([keyDown(KEY.S), keyDown(KEY.DOWN)], [simMove("down")], null, { or: true }),
	E([keyDown(KEY.A), keyDown(KEY.LEFT)], [simMove("left")], null, { or: true }),
	E([keyDown(KEY.D), keyDown(KEY.RIGHT)], [simMove("right")], null, { or: true }),

	Comment("Стрельба"),
	E([C("Mouse", "on-click", { "mouse-button": "left", "click-type": "clicked" }), ivIs("Hero", "AtkCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0)], [
		setIv("Hero", "AtkCD", "Hero.AtkRate"),
		A("Hero", "spawn-another-object", { object: "HeroBullet", layer: q("Game"), "image-point": "0", "create-hierarchy": false, "template-name": q("") }),
		A("HeroBullet", "set-animation", { animation: "ElemAnim", from: "beginning" }),
		A("HeroBullet", "set-angle-of-motion", { angle: "angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)" }, "Bullet"),
		A("HeroBullet", "set-speed", { speed: "650" }, "Bullet"),
	]),

	// Попадание пули → урон; при молнии сразу цепь по другим рядом (UID в переменных, не из SOL после create)
	E([C("HeroBullet", "on-collision-with-another-object", { object: "Enemy" })], [
		setVar("HitUID", "Enemy.UID"),
		setVar("ChainX", "Enemy.X"),
		setVar("ChainY", "Enemy.Y"),
		Call("DamageEnemy", "HitUID", "BulletDmg"),
		A("HeroBullet", "destroy"),
	], [
		E([varIs("Element", "=", 3), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
			Call("ShockZap"),
		]),
	]),

	Fn("DamageEnemy", [["TargetUID", "number"], ["Amount", "number"]], [], [
		E([C("Enemy", "pick-by-unique-id", { "unique-id": "TargetUID" })], [
			subIv("Enemy", "HP", "Amount"),
			setIv("Enemy", "Alert", 1),
			setIv("Enemy", "Agro", 1),
			setVar("Alarm", 1),
			...floatText("Enemy.X", "Enemy.Y - 20", "round(Amount)", "rgbEx(100, 100, 100)"),
		], [
			E([ivIs("Enemy", "HP", "<=", 0)], [
				addVar("Gold", "Enemy.Bounty"),
				addVar("Kills", 1),
				...fx("Enemy.X", "Enemy.Y", 40, "rgbEx(80, 60, 100)"),
			], [
				// волки не в EnemiesAlive
				E([ivIs("Enemy", "Archetype", "!=", 3)], [addVar("EnemiesAlive", "-1")]),
				// мод «Вампир»: хил с убийства
				E([varIs("HasLifeMod", "=", 1)], [
					setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + 3)"),
					...floatText("Hero.X", "Hero.Y - 40", q("+3"), "rgbEx(30, 100, 40)"),
				]),
				// ~22% ядро (не с волков)
				E([ivIs("Enemy", "IsBoss", "=", 0), ivIs("Enemy", "Archetype", "!=", 3), cmp2("random(0, 1)", "<", "0.22")], [
					create("Core", "Game", "Enemy.X", "Enemy.Y"),
					setIv("Core", "Kind", "choose(1, 2, 3)"),
					A("Core", "set-animation", { animation: `(Self.Kind = 1 ? "fire" : (Self.Kind = 2 ? "ice" : "shock"))`, from: "beginning" }),
				]),
				// моды: обычные ~10%, волки ~35% (опциональный фарм)
				E([ivIs("Enemy", "IsBoss", "=", 0), ivIs("Enemy", "Archetype", "!=", 3), cmp2("random(0, 1)", "<", "0.10")], [
					create("ModPickup", "Game", "Enemy.X + 18", "Enemy.Y - 10"),
					setIv("ModPickup", "Kind", "choose(1, 2, 3, 4, 5)"),
					A("ModPickup", "set-animation", { animation: `"m" & Self.Kind`, from: "beginning" }),
				]),
				E([ivIs("Enemy", "Archetype", "=", 3), cmp2("random(0, 1)", "<", "0.35")], [
					create("ModPickup", "Game", "Enemy.X + 18", "Enemy.Y - 10"),
					setIv("ModPickup", "Kind", "choose(1, 2, 3, 4, 5)"),
					A("ModPickup", "set-animation", { animation: `"m" & Self.Kind`, from: "beginning" }),
				]),
				E([ivIs("Enemy", "IsBoss", "=", 1)], [
					create("ModPickup", "Game", "Enemy.X + 20", "Enemy.Y"),
					setIv("ModPickup", "Kind", "choose(1, 2, 3, 4, 5)"),
					A("ModPickup", "set-animation", { animation: `"m" & Self.Kind`, from: "beginning" }),
				]),
				E([], [
					A("Enemy", "destroy"),
				]),
			]),
		]),
	]),

	Comment("Моды: инвентарь ∞ стеками, на пушке 4 слота и ёмкость 12 по весу"),
	Fn("StashMod", [["Kind", "number"]], [], [
		...MOD_DEFS.map(({ kind, name }) =>
			E([cmp2("Kind", "=", String(kind))], [
				addVar(`InvM${kind}`, 1),
				...msg(500, `"Мод: ${name} (×" & InvM${kind} & ")"`, "rgbEx(180, 140, 60)"),
			])),
	]),
	E([C("Hero", "on-collision-with-another-object", { object: "ModPickup" })], [
		Call("StashMod", "ModPickup.Kind"),
		A("ModPickup", "destroy"),
	]),

	Fn("SetHandSlot", [["Slot", "number"], ["Kind", "number"]], [], [
		E([varIs("Hand", "=", 1), cmp2("Slot", "=", "1")], [setVar("Gun1ModA", "Kind")]),
		E([varIs("Hand", "=", 1), cmp2("Slot", "=", "2")], [setVar("Gun1ModB", "Kind")]),
		E([varIs("Hand", "=", 1), cmp2("Slot", "=", "3")], [setVar("Gun1ModC", "Kind")]),
		E([varIs("Hand", "=", 1), cmp2("Slot", "=", "4")], [setVar("Gun1ModD", "Kind")]),
		E([varIs("Hand", "=", 2), cmp2("Slot", "=", "1")], [setVar("Gun2ModA", "Kind")]),
		E([varIs("Hand", "=", 2), cmp2("Slot", "=", "2")], [setVar("Gun2ModB", "Kind")]),
		E([varIs("Hand", "=", 2), cmp2("Slot", "=", "3")], [setVar("Gun2ModC", "Kind")]),
		E([varIs("Hand", "=", 2), cmp2("Slot", "=", "4")], [setVar("Gun2ModD", "Kind")]),
	]),
	Fn("InstallModKind", [["Kind", "number"]], [Call("SyncCombatMeta")], [
		...MOD_DEFS.flatMap(({ kind, cost, name }) => [
			E([cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, "<=", 0)], [
				...msg(560, q(`Нет ${name} в инвентаре`), "rgbEx(100, 40, 40)"),
			]),
			E([cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 1)], [
				...msg(560, q("Такой мод уже на пушке"), "rgbEx(100, 40, 40)"),
			]),
			E([
				cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
				cmp2(`HandCap + ${cost}`, ">", String(GUN_MOD_CAP)),
			], [
				...msg(560, `"Не хватает ёмкости (нужно ${cost}, свободно " & (${GUN_MOD_CAP} - HandCap) & ")"`, "rgbEx(100, 40, 40)"),
			]),
			E([
				cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
				cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				varIs("HandModA", "<", 0),
			], [
				Call("SetHandSlot", "1", "Kind"), Call("ConsumeInvMod", "Kind"),
				...msg(560, q(`Слот A: ${name}`), "rgbEx(100, 160, 220)"), Call("RefreshModUI"),
			]),
			E([
				cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
				cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				varIs("HandModA", ">=", 0), varIs("HandModB", "<", 0),
			], [
				Call("SetHandSlot", "2", "Kind"), Call("ConsumeInvMod", "Kind"),
				...msg(560, q(`Слот B: ${name}`), "rgbEx(100, 160, 220)"), Call("RefreshModUI"),
			]),
			E([
				cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
				cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				varIs("HandModA", ">=", 0), varIs("HandModB", ">=", 0), varIs("HandModC", "<", 0),
			], [
				Call("SetHandSlot", "3", "Kind"), Call("ConsumeInvMod", "Kind"),
				...msg(560, q(`Слот C: ${name}`), "rgbEx(100, 160, 220)"), Call("RefreshModUI"),
			]),
			E([
				cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
				cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				varIs("HandModA", ">=", 0), varIs("HandModB", ">=", 0), varIs("HandModC", ">=", 0), varIs("HandModD", "<", 0),
			], [
				Call("SetHandSlot", "4", "Kind"), Call("ConsumeInvMod", "Kind"),
				...msg(560, q(`Слот D: ${name}`), "rgbEx(100, 160, 220)"), Call("RefreshModUI"),
			]),
			E([
				cmp2("Kind", "=", String(kind)), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
				cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				varIs("HandModA", ">=", 0), varIs("HandModB", ">=", 0), varIs("HandModC", ">=", 0), varIs("HandModD", ">=", 0),
			], [...msg(560, q("Все 4 слота заняты"), "rgbEx(100, 40, 40)")]),
		]),
	]),
	Fn("ConsumeInvMod", [["Kind", "number"]], [], [
		E([cmp2("Kind", "=", "1")], [addVar("InvM1", -1)]),
		E([cmp2("Kind", "=", "2")], [addVar("InvM2", -1)]),
		E([cmp2("Kind", "=", "3")], [addVar("InvM3", -1)]),
		E([cmp2("Kind", "=", "4")], [addVar("InvM4", -1)]),
		E([cmp2("Kind", "=", "5")], [addVar("InvM5", -1)]),
	]),
	Fn("UninstallSlot", [["Slot", "number"]], [], [
		E([cmp2("Slot", "=", "1"), cmp2("HandModA", ">=", "0")], [
			Call("StashMod", "HandModA"), Call("SetHandSlot", "1", "-1"), Call("RefreshModUI"),
		]),
		E([cmp2("Slot", "=", "2"), cmp2("HandModB", ">=", "0")], [
			Call("StashMod", "HandModB"), Call("SetHandSlot", "2", "-1"), Call("RefreshModUI"),
		]),
		E([cmp2("Slot", "=", "3"), cmp2("HandModC", ">=", "0")], [
			Call("StashMod", "HandModC"), Call("SetHandSlot", "3", "-1"), Call("RefreshModUI"),
		]),
		E([cmp2("Slot", "=", "4"), cmp2("HandModD", ">=", "0")], [
			Call("StashMod", "HandModD"), Call("SetHandSlot", "4", "-1"), Call("RefreshModUI"),
		]),
		E([cmp2("Slot", "=", "1"), cmp2("HandModA", "<", "0")], [...msg(560, q("Слот A пуст"), "rgbEx(100, 40, 40)")]),
		E([cmp2("Slot", "=", "2"), cmp2("HandModB", "<", "0")], [...msg(560, q("Слот B пуст"), "rgbEx(100, 40, 40)")]),
		E([cmp2("Slot", "=", "3"), cmp2("HandModC", "<", "0")], [...msg(560, q("Слот C пуст"), "rgbEx(100, 40, 40)")]),
		E([cmp2("Slot", "=", "4"), cmp2("HandModD", "<", "0")], [...msg(560, q("Слот D пуст"), "rgbEx(100, 40, 40)")]),
	]),
	Fn("StripGun2Mods", [], [], [
		E([varIs("Gun2ModA", ">=", 0)], [Call("StashMod", "Gun2ModA"), setVar("Gun2ModA", -1)]),
		E([varIs("Gun2ModB", ">=", 0)], [Call("StashMod", "Gun2ModB"), setVar("Gun2ModB", -1)]),
		E([varIs("Gun2ModC", ">=", 0)], [Call("StashMod", "Gun2ModC"), setVar("Gun2ModC", -1)]),
		E([varIs("Gun2ModD", ">=", 0)], [Call("StashMod", "Gun2ModD"), setVar("Gun2ModD", -1)]),
	]),
	Fn("RefreshModUI", [], [
		Call("SyncCombatMeta"),
		A("ModInfo", "set-text", { text: modInfoText }),
	], [
		E([pickBy("ModRow", "ModRow.Slot", "=", "1")], [A("ModRow", "set-text", { text: `"A: " & ModNameA & "  вес " & HandCostA` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "2")], [A("ModRow", "set-text", { text: `"B: " & ModNameB & "  вес " & HandCostB` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "3")], [A("ModRow", "set-text", { text: `"C: " & ModNameC & "  вес " & HandCostC` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "4")], [A("ModRow", "set-text", { text: `"D: " & ModNameD & "  вес " & HandCostD` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "5")], [A("ModRow", "set-text", { text: `"Остриё ×" & InvM1 & "  вес4  +ур"` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "6")], [A("ModRow", "set-text", { text: `"Скорострел ×" & InvM2 & "  вес5  темп"` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "7")], [A("ModRow", "set-text", { text: `"Вампир ×" & InvM3 & "  вес6  +HP"` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "8")], [A("ModRow", "set-text", { text: `"Калибр ×" & InvM4 & "  вес7  +ур"` })]),
		E([pickBy("ModRow", "ModRow.Slot", "=", "9")], [A("ModRow", "set-text", { text: `"Искра ×" & InvM5 & "  вес3  +ур"` })]),
		...[
			["1", "HandModA"], ["2", "HandModB"], ["3", "HandModC"], ["4", "HandModD"],
		].flatMap(([slot, modVar]) => [
			E([pickBy("ModBtn", "ModBtn.Slot", "=", slot), varIs(modVar, ">=", 0)], [
				A("ModBtn", "set-animation", { animation: q("buy"), from: "beginning" }),
			]),
			E([pickBy("ModBtn", "ModBtn.Slot", "=", slot), varIs(modVar, "<", 0)], [
				A("ModBtn", "set-animation", { animation: q("deny"), from: "beginning" }),
			]),
			E([pickBy("ModBtnLabel", "ModBtnLabel.Slot", "=", slot), varIs(modVar, ">=", 0)], [
				A("ModBtnLabel", "set-text", { text: q("СНЯТЬ") }),
			]),
			E([pickBy("ModBtnLabel", "ModBtnLabel.Slot", "=", slot), varIs(modVar, "<", 0)], [
				A("ModBtnLabel", "set-text", { text: q("ПУСТО") }),
			]),
		]),
		...MOD_DEFS.flatMap(({ kind, cost }) => {
			const btn = String(kind + 4);
			return [
				E([pickBy("ModBtn", "ModBtn.Slot", "=", btn), varIs(`InvM${kind}`, "<=", 0)], [
					A("ModBtn", "set-animation", { animation: q("deny"), from: "beginning" }),
				]),
				E([pickBy("ModBtnLabel", "ModBtnLabel.Slot", "=", btn), varIs(`InvM${kind}`, "<=", 0)], [
					A("ModBtnLabel", "set-text", { text: q("НЕТ") }),
				]),
				E([pickBy("ModBtn", "ModBtn.Slot", "=", btn), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 1)], [
					A("ModBtn", "set-animation", { animation: q("active"), from: "beginning" }),
				]),
				E([pickBy("ModBtnLabel", "ModBtnLabel.Slot", "=", btn), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 1)], [
					A("ModBtnLabel", "set-text", { text: q("ЕСТЬ") }),
				]),
				E([
					pickBy("ModBtn", "ModBtn.Slot", "=", btn), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
					cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				], [A("ModBtn", "set-animation", { animation: q("buy"), from: "beginning" })]),
				E([
					pickBy("ModBtnLabel", "ModBtnLabel.Slot", "=", btn), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
					cmp2(`HandCap + ${cost}`, "<=", String(GUN_MOD_CAP)),
				], [A("ModBtnLabel", "set-text", { text: q("СТАВ") })]),
				E([
					pickBy("ModBtn", "ModBtn.Slot", "=", btn), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
					cmp2(`HandCap + ${cost}`, ">", String(GUN_MOD_CAP)),
				], [A("ModBtn", "set-animation", { animation: q("deny"), from: "beginning" })]),
				E([
					pickBy("ModBtnLabel", "ModBtnLabel.Slot", "=", btn), varIs(`InvM${kind}`, ">", 0), varIs(`SlotHas${kind}`, "=", 0),
					cmp2(`HandCap + ${cost}`, ">", String(GUN_MOD_CAP)),
				], [A("ModBtnLabel", "set-text", { text: q("ВЕС") })]),
			];
		}),
	]),
	Fn("OpenMods", [], [...modShow]),
	Fn("CloseMods", [], [
		...modHide,
		A("ForgePrompt", "set-visible", { visibility: "visible" }),
		A("ModPrompt", "set-visible", { visibility: "visible" }),
		A("GatePrompt", "set-visible", { visibility: "visible" }),
	]),
	E([key(KEY.M), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("InHub", "=", 1), cmp2("distance(Hero.X, Hero.Y, ModBench.X, ModBench.Y)", "<", "140")], [
		Call("OpenMods"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ModBench" }), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("InHub", "=", 1)], [
		Call("OpenMods"),
	]),
	E([key(KEY.X), varIs("InMods", "=", 1)], [Call("CloseMods")]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ModClose" }), varIs("InMods", "=", 1)], [
		Call("CloseMods"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ModBtn" }), varIs("InMods", "=", 1)], [
		Call("ModBtnClick", "ModBtn.Slot"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ModBtnLabel" }), varIs("InMods", "=", 1)], [
		Call("ModBtnClick", "ModBtnLabel.Slot"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ModRow" }), varIs("InMods", "=", 1)], [
		Call("ModBtnClick", "ModRow.Slot"),
	]),
	Fn("ModBtnClick", [["Slot", "number"]], [], [
		E([cmp2("Slot", "<=", "4")], [Call("UninstallSlot", "Slot")]),
		E([cmp2("Slot", "=", "5")], [Call("InstallModKind", "1")]),
		E([cmp2("Slot", "=", "6")], [Call("InstallModKind", "2")]),
		E([cmp2("Slot", "=", "7")], [Call("InstallModKind", "3")]),
		E([cmp2("Slot", "=", "8")], [Call("InstallModKind", "4")]),
		E([cmp2("Slot", "=", "9")], [Call("InstallModKind", "5")]),
	]),
	E([key(KEY.D1), varIs("InMods", "=", 1)], [Call("InstallModKind", "1")]),
	E([key(KEY.D2), varIs("InMods", "=", 1)], [Call("InstallModKind", "2")]),
	E([key(KEY.D3), varIs("InMods", "=", 1)], [Call("InstallModKind", "3")]),
	E([key(KEY.D4), varIs("InMods", "=", 1)], [Call("InstallModKind", "4")]),
	E([key(KEY.D5), varIs("InMods", "=", 1)], [Call("InstallModKind", "5")]),

	// Молния: бьёт ВСЕХ других врагов в радиусе от точки попадания (не того, в кого попали)
	Fn("ShockZap", [], [
		setVar("ChainLock", 1),
		Call("ShockZapBody"),
		setVar("ChainLock", 0),
	], []),

	Fn("ShockZapBody", [], [], [
		E([
			cmp2("Enemy.Count", ">", 0),
			pickBy("Enemy", "distance(Enemy.X, Enemy.Y, ChainX, ChainY)", "<=", 120),
			pickBy("Enemy", "Enemy.UID", "!=", "HitUID"),
			forEach("Enemy"),
		], [
			setVar("ChainTargetUID", "Enemy.UID"),
			Call("ShockHit"),
		]),
	]),

	// Урон цепи только через сохранённый UID (create/fx не сбивают цель)
	Fn("ShockHit", [], [], [
		E([C("Enemy", "pick-by-unique-id", { "unique-id": "ChainTargetUID" })], [
			...floatText("Enemy.X", "Enemy.Y - 40", q("ЦЕПЬ"), "rgbEx(180, 120, 255)"),
			...fx("Enemy.X", "Enemy.Y", 55, "rgbEx(100, 40, 140)"),
			Call("DamageEnemy", "ChainTargetUID", "18 + RoomsDone * 2"),
		]),
	]),

	Comment("Ближний бой по герою (если рядом и Alert); на обороне приоритет — бур"),
	...(() => {
		const ready = [
			ivIs("Enemy", "AtkCD", "<=", 0), varIs("GameOver", "=", 0),
			varIs("InForge", "=", 0), varIs("InMods", "=", 0), forEach("Enemy"),
		];
		const meleePick = [
			[ivIs("Enemy", "IsBoss", "=", 1)],
			[ivIs("Enemy", "Archetype", "=", 1)],
			[ivIs("Enemy", "Archetype", "=", 6)],
			[ivIs("Enemy", "Archetype", "=", 7)],
			[ivIs("Enemy", "Archetype", "=", 3), ivIs("Enemy", "Agro", "=", 1)],
		];
		const hitHero = [setIv("Enemy", "AtkCD", "0.85"), Call("DamageHero", "Enemy.Damage")];
		const hitDrill = [setIv("Enemy", "AtkCD", "0.85"), Call("DamageDrill", "Enemy.Damage")];
		return meleePick.flatMap((arch) => [
			E([
				...ready, ...arch, cmp2("MissionType", "!=", "2"),
				ivIs("Enemy", "Alert", "=", 1),
				pickBy("Enemy", "distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<=", 52),
			], hitHero),
			E([
				...ready, ...arch, varIs("MissionType", "=", 2),
				pickBy("Enemy", "distance(Enemy.X, Enemy.Y, DefendX, DefendY)", "<=", 56),
			], hitDrill),
			E([
				...ready, ...arch, varIs("MissionType", "=", 2),
				pickBy("Enemy", "distance(Enemy.X, Enemy.Y, DefendX, DefendY)", ">", 56),
				pickBy("Enemy", "distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<=", 52),
			], hitHero),
		]);
	})(),

	Fn("DamageHero", [["Amount", "number"]], [], [
		E([varIs("GameOver", "=", 0), varIs("IFrames", "<=", 0), varIs("Shield", "<=", 0)], [
			subIv("Hero", "HP", "Amount"),
			A("Hero", "flash", { "on-time": "0.05", "off-time": "0.05", duration: "0.2" }, "Flash"),
			setVar("IFrames", 0.35),
		]),
	]),
	Comment("Урон по буру (Оборона): HP ≤ 0 → провал миссии"),
	Fn("DamageDrill", [["Amount", "number"]], [
		setVar("DefendHP", "max(0, DefendHP - Amount)"),
		...fx("DefendX", "DefendY", 55, "rgbEx(100, 70, 30)"),
		...floatText("DefendX", "DefendY - 40", `"-" & Floor(Amount)`, "rgbEx(200, 120, 40)"),
	], [
		E([varIs("DefendHP", "<=", 0), varIs("GameOver", "=", 0)], [
			Call("FailDefense"),
		]),
	]),
	Fn("FailDefense", [], [
		setVar("GameOver", 1),
		setVar("ObjectiveDone", 1),
		setVar("SpawnReady", 0),
		A("Enemy", "destroy"),
		A("EnemyBullet", "destroy"),
		A("Hero", "set-ignoring-input", { input: "start-ignoring" }, "EightDir"),
		A("GameOverText", "set-visible", { visibility: "visible" }),
		A("GameOverText", "set-font-color", { color: "rgbEx(100, 50, 30)" }),
		A("GameOverText", "set-text", {
			text: `"БУР УНИЧТОЖЕН" & newline & newline & "Оборона провалена" & newline & "Волна: " & Wave & "/" & WaveMax & newline & newline & "R — выбрать реликвию заново"`,
		}),
		A("System", "set-time-scale", { "time-scale": "0" }),
		...msg(140, q("ЦЕЛЬ УНИЧТОЖЕНА — ПРОВАЛ"), "rgbEx(160, 40, 20)"),
	], []),

	Comment("Подбор ядер"),
	E([C("Core", "on-collision-with-another-object", { object: "Hero" })], [
		addVar("CoreFire", "Core.Kind = 1 ? 1 : 0"),
		addVar("CoreIce", "Core.Kind = 2 ? 1 : 0"),
		addVar("CoreShock", "Core.Kind = 3 ? 1 : 0"),
		...floatText("Core.X", "Core.Y - 24", q("+ядро"), "rgbEx(80, 80, 20)"),
		A("Core", "destroy"),
	]),

	Comment("Рывок"),
	E([key(KEY.SPACE), varIs("DashCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0)], [
		A("Hero", "set-position", {
			x: `Hero.X + cos(angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)) * 120`,
			y: `Hero.Y + sin(angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)) * 120`,
		}),
		setVar("DashCD", 1.4),
		setVar("IFrames", 0.45),
		...fx("Hero.X", "Hero.Y", 70, "rgbEx(40, 70, 100)"),
	]),

	Comment("Реликвии Q"),
	E([key(KEY.Q), varIs("RelicType", "=", q("heal")), varIs("RelicCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0)], [
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + Hero.MaxHP * 0.35)"),
		setVar("RelicCD", 10),
		...fx("Hero.X", "Hero.Y", 120, "rgbEx(30, 100, 40)"),
		...floatText("Hero.X", "Hero.Y - 50", q("+HP"), "rgbEx(30, 100, 40)"),
	]),
	E([key(KEY.Q), varIs("RelicType", "=", q("shield")), varIs("RelicCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0)], [
		setVar("Shield", 2.5),
		setVar("RelicCD", 12),
		...fx("Hero.X", "Hero.Y", 110, "rgbEx(30, 60, 100)"),
		...msg(120, q("ЩИТ!"), "rgbEx(30, 60, 100)"),
	]),
	E([key(KEY.Q), varIs("RelicType", "=", q("nova")), varIs("RelicCD", "<=", 0), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0)], [
		setVar("RelicCD", 14),
		...fx("Hero.X", "Hero.Y", 160, "rgbEx(100, 30, 20)"),
	], [
		E([pickBy("Enemy", "distance(Enemy.X, Enemy.Y, Hero.X, Hero.Y)", "<=", 220), forEach("Enemy")], [
			Call("DamageEnemy", "Enemy.UID", "30 + RoomsDone * 3"),
		]),
	]),

	Comment("Пересчёт угроз: волки (arch 3) не входят в EnemiesAlive"),
	Fn("RecountThreats", [], [setVar("EnemiesAlive", 0)], [
		E([forEach("Enemy"), ivIs("Enemy", "Archetype", "!=", 3)], [addVar("EnemiesAlive", 1)]),
	]),
	E([
		varIs("SpawnReady", "=", 1), varIs("InMission", "=", 1), varIs("GameOver", "=", 0),
		everySec(0.2),
	], [Call("RecountThreats")]),

	Comment("Цели миссий: волны / оборона (волны) / зачистка → CompleteMission"),
	E([
		varIs("InMission", "=", 1), varIs("ObjectiveDone", "=", 0), varIs("GameOver", "=", 0),
		varIs("MissionType", "=", 1), varIs("EnemiesAlive", "<=", 0), varIs("SpawnReady", "=", 1),
		cmp2("Wave", "<", "WaveMax"),
		sys("trigger-once-while-true"),
	], [Call("SpawnWave")]),
	E([
		varIs("InMission", "=", 1), varIs("ObjectiveDone", "=", 0), varIs("GameOver", "=", 0),
		varIs("MissionType", "=", 1), varIs("EnemiesAlive", "<=", 0), varIs("SpawnReady", "=", 1),
		cmp2("Wave", ">=", "WaveMax"),
		sys("trigger-once-while-true"),
	], [Call("CompleteMission")]),
	// Оборона Warframe-lite: волна зачищена → следующая; все WaveMax → победа
	E([
		varIs("InMission", "=", 1), varIs("ObjectiveDone", "=", 0), varIs("GameOver", "=", 0),
		varIs("MissionType", "=", 2), varIs("EnemiesAlive", "<=", 0), varIs("SpawnReady", "=", 1),
		cmp2("Wave", "<", "WaveMax"),
		sys("trigger-once-while-true"),
	], [Call("SpawnDefenseWave")]),
	E([
		varIs("InMission", "=", 1), varIs("ObjectiveDone", "=", 0), varIs("GameOver", "=", 0),
		varIs("MissionType", "=", 2), varIs("EnemiesAlive", "<=", 0), varIs("SpawnReady", "=", 1),
		cmp2("Wave", ">=", "WaveMax"),
		sys("trigger-once-while-true"),
	], [Call("CompleteMission")]),
	...[0, 3, 4].map((mt) =>
		E([
			varIs("InMission", "=", 1), varIs("ObjectiveDone", "=", 0), varIs("GameOver", "=", 0),
			varIs("EnemiesAlive", "<=", 0), varIs("SpawnReady", "=", 1),
			varIs("MissionType", "=", mt),
			sys("trigger-once-while-true"),
		], [Call("CompleteMission")])),
	// Шпионаж: рядом с терминалом качаем прогресс (тревога замедляет)
	E([
		varIs("InMission", "=", 1), varIs("MissionType", "=", 5), varIs("GameOver", "=", 0),
		varIs("ObjectiveDone", "=", 0), everySec(0.25),
		cmp2("distance(Hero.X, Hero.Y, SpyTerminal.X, SpyTerminal.Y)", "<", "70"),
	], [
		setVar("SpyProgress", "min(100, SpyProgress + (Alarm = 1 ? 2 : 6))"),
	]),
	E([
		varIs("InMission", "=", 1), varIs("MissionType", "=", 5), varIs("GameOver", "=", 0),
		varIs("ObjectiveDone", "=", 0), varIs("SpyProgress", ">=", 100),
		sys("trigger-once-while-true"),
	], [
		...msg(90, q("Документы получены!"), "rgbEx(60, 160, 200)"),
		Call("CompleteMission"),
	]),
	// Спасение: подобрать заложника
	E([
		varIs("InMission", "=", 1), varIs("MissionType", "=", 6), varIs("HostageOK", "=", 0),
		varIs("GameOver", "=", 0),
		cmp2("distance(Hero.X, Hero.Y, Hostage.X, Hostage.Y)", "<", "60"),
		sys("trigger-once-while-true"),
	], [
		setVar("HostageOK", 1),
		setIv("Hostage", "Rescued", 1),
		setVar("ObjectiveX", String(POI.start[0])),
		setVar("ObjectiveY", String(POI.start[1])),
		...msg(90, q("Заложник спасён — к зоне эвака!"), "rgbEx(80, 160, 80)"),
	]),
	E([
		varIs("InMission", "=", 1), varIs("MissionType", "=", 6), varIs("HostageOK", "=", 1),
		varIs("GameOver", "=", 0), varIs("ObjectiveDone", "=", 0),
		cmp2("distance(Hostage.X, Hostage.Y, ExtractZone.X, ExtractZone.Y)", "<", "80"),
		sys("trigger-once-while-true"),
	], [
		...msg(90, q("Эвакуация успешна!"), "rgbEx(60, 180, 100)"),
		Call("CompleteMission"),
	]),

	Comment("Кузница: обновить кнопки магазина"),
	Fn("RefreshObjective", [], [], [
		E([varIs("InHub", "=", 1)], [
			A("ObjectiveText", "set-text", {
				text: `"Корабль · 1 отсек · узел " & Mission & "/" & PlanetNodes & newline & "F — карта узлов · V — планеты"`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 0)], [
			A("ObjectiveText", "set-text", {
				text: `"Истребление" & newline & "Врагов: " & EnemiesAlive & " · до цели " & ${poiDistExpr} & "м"`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 1)], [
			A("ObjectiveText", "set-text", {
				text: `"Волны " & Wave & "/" & WaveMax & newline & "Врагов: " & EnemiesAlive`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 2)], [
			A("ObjectiveText", "set-text", {
				text: `"Оборона" & newline & "Волна " & Wave & "/" & WaveMax & " · бур " & Floor(DefendHP) & "/" & DefendMaxHP & " · " & ${poiDistExpr} & "м"`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 3)], [
			A("ObjectiveText", "set-text", {
				text: `"Узел-элита" & newline & "Убей элиту · " & ${poiDistExpr} & "м"`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 5)], [
			A("ObjectiveText", "set-text", {
				text: `"Шпионаж" & newline & "Взлом: " & Floor(SpyProgress) & "% · " & ${poiDistExpr} & "м" & (Alarm = 1 ? " · ТРЕВОГА" : "") & (Stealth = 1 ? " · стелс" : "")`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 6)], [
			A("ObjectiveText", "set-text", {
				text: `"Спасение" & newline & (HostageOK = 1 ? "Эвак " & ${poiDistExpr} & "м" : "Заложник " & ${poiDistExpr} & "м") & (Stealth = 1 ? " · стелс" : "")`,
			}),
		]),
		E([varIs("InHub", "=", 0), varIs("MissionType", "=", 4)], [
			A("ObjectiveText", "set-text", {
				text: `"Босс мира" & newline & LayerName & " · " & ${poiDistExpr} & "м"`,
			}),
		]),
	]),
	Fn("RefreshForge", [], [
		A("ForgeWallet", "set-text", { text: forgeWalletText }),
	], [
		E([pickBy("ForgeBtn", "ForgeBtn.Slot", "=", "1")], [
			A("ForgeBtn", "set-animation", { animation: `(Element = 1 ? "active" : (CoreFire > 0 ? "buy" : "deny"))`, from: "beginning" }),
		]),
		E([pickBy("ForgeBtnLabel", "ForgeBtnLabel.Slot", "=", "1")], [
			A("ForgeBtnLabel", "set-text", { text: `(Element = 1 ? "АКТИВ" : (CoreFire > 0 ? "ВЗЯТЬ" : "НЕТ ЯДЕР"))` }),
		]),
		E([pickBy("ForgeBtn", "ForgeBtn.Slot", "=", "2")], [
			A("ForgeBtn", "set-animation", { animation: `(Element = 2 ? "active" : (CoreIce > 0 ? "buy" : "deny"))`, from: "beginning" }),
		]),
		E([pickBy("ForgeBtnLabel", "ForgeBtnLabel.Slot", "=", "2")], [
			A("ForgeBtnLabel", "set-text", { text: `(Element = 2 ? "АКТИВ" : (CoreIce > 0 ? "ВЗЯТЬ" : "НЕТ ЯДЕР"))` }),
		]),
		E([pickBy("ForgeBtn", "ForgeBtn.Slot", "=", "3")], [
			A("ForgeBtn", "set-animation", { animation: `(Element = 3 ? "active" : (CoreShock > 0 ? "buy" : "deny"))`, from: "beginning" }),
		]),
		E([pickBy("ForgeBtnLabel", "ForgeBtnLabel.Slot", "=", "3")], [
			A("ForgeBtnLabel", "set-text", { text: `(Element = 3 ? "АКТИВ" : (CoreShock > 0 ? "ВЗЯТЬ" : "НЕТ ЯДЕР"))` }),
		]),
		E([pickBy("ForgeBtn", "ForgeBtn.Slot", "=", "4")], [
			A("ForgeBtn", "set-animation", { animation: `(CoreFire >= 2 ? "buy" : "deny")`, from: "beginning" }),
		]),
		E([pickBy("ForgeBtnLabel", "ForgeBtnLabel.Slot", "=", "4")], [
			A("ForgeBtnLabel", "set-text", { text: `(CoreFire >= 2 ? "КОВАТЬ" : "НУЖНО 2")` }),
		]),
		E([pickBy("ForgeBtn", "ForgeBtn.Slot", "=", "5")], [
			A("ForgeBtn", "set-animation", { animation: `(CoreIce >= 2 ? "buy" : "deny")`, from: "beginning" }),
		]),
		E([pickBy("ForgeBtnLabel", "ForgeBtnLabel.Slot", "=", "5")], [
			A("ForgeBtnLabel", "set-text", { text: `(CoreIce >= 2 ? "КОВАТЬ" : "НУЖНО 2")` }),
		]),
		E([pickBy("ForgeBtn", "ForgeBtn.Slot", "=", "6")], [
			A("ForgeBtn", "set-animation", { animation: `(CoreShock >= 2 ? "buy" : "deny")`, from: "beginning" }),
		]),
		E([pickBy("ForgeBtnLabel", "ForgeBtnLabel.Slot", "=", "6")], [
			A("ForgeBtnLabel", "set-text", { text: `(CoreShock >= 2 ? "КОВАТЬ" : "НУЖНО 2")` }),
		]),
	]),

	Comment("Оружие на полу (хаб / миссия — одна локация)"),
	Fn("RefreshFloorGun", [], [], [
		E([varIs("FloorGun", "<", 0)], [
			A("FloorWeapon", "set-visible", { visibility: "invisible" }),
			A("FloorWeapon", "set-position", { x: "-900", y: "-900" }),
		]),
		E([varIs("FloorGun", ">=", 0)], [
			setVar("FloorX", "Hero.X + 50"),
			setVar("FloorY", "Hero.Y + 20"),
			Call("SyncFloorGunVisual"),
		]),
	]),
	Fn("SyncFloorGunVisual", [], [], [
		E([varIs("FloorGun", "<", 0)], [
			A("FloorWeapon", "set-visible", { visibility: "invisible" }),
			A("FloorWeapon", "set-position", { x: "-900", y: "-900" }),
		]),
		E([varIs("FloorGun", ">=", 0)], [
			A("FloorWeapon", "set-position", { x: "FloorX", y: "FloorY" }),
			A("FloorWeapon", "set-visible", { visibility: "visible" }),
			A("FloorWeapon", "set-animation", { animation: "FloorAnim", from: "beginning" }),
		]),
	]),
	Fn("PushCraftedGun", [["NewGun", "number"]], [], [
		E([varIs("Gun2", ">=", 0)], [
			Call("StripGun2Mods"),
			setVar("FloorGun", "Gun2"),
			Call("RefreshFloorGun"),
			...msg(80, q("Оружие из слота 2 выброшено на пол"), "rgbEx(90, 70, 40)"),
		]),
		E([], [
			setVar("Gun2", "Gun1"),
			setVar("Gun1", "NewGun"),
			setVar("Hand", 1),
			setVar("Element", "NewGun"),
		]),
	]),

	Comment("Кузница: покупка по слоту (мышь / клавиши 1–6)"),
	Fn("ForgeBuy", [["Slot", "number"]], [], [
		E([cmp2("Slot", "=", "1"), varIs("CoreFire", ">", 0)], [
			addVar("CoreFire", -1), setVar("EchoElement", 1),
			...msg(560, q("Эхо-клинок заряжен: ОГОНЬ (возьми слот с эхо)"), "rgbEx(100, 40, 10)"),
			Call("RefreshForge"),
		]),
		E([cmp2("Slot", "=", "1"), varIs("CoreFire", "<=", 0)], [
			...msg(560, q("Нет ядер огня"), "rgbEx(100, 40, 40)"),
		]),
		E([cmp2("Slot", "=", "2"), varIs("CoreIce", ">", 0)], [
			addVar("CoreIce", -1), setVar("EchoElement", 2),
			...msg(560, q("Эхо-клинок заряжен: ЛЁД"), "rgbEx(30, 60, 100)"),
			Call("RefreshForge"),
		]),
		E([cmp2("Slot", "=", "2"), varIs("CoreIce", "<=", 0)], [
			...msg(560, q("Нет ядер льда"), "rgbEx(100, 40, 40)"),
		]),
		E([cmp2("Slot", "=", "3"), varIs("CoreShock", ">", 0)], [
			addVar("CoreShock", -1), setVar("EchoElement", 3),
			...msg(560, q("Эхо-клинок заряжен: МОЛНИЯ"), "rgbEx(70, 30, 100)"),
			Call("RefreshForge"),
		]),
		E([cmp2("Slot", "=", "3"), varIs("CoreShock", "<=", 0)], [
			...msg(560, q("Нет ядер молнии"), "rgbEx(100, 40, 40)"),
		]),
		E([cmp2("Slot", "=", "4"), varIs("CoreFire", ">=", 2)], [
			addVar("CoreFire", -2),
			Call("PushCraftedGun", "1"),
			...msg(560, q("Скован Клинок пепла → слот 1"), "rgbEx(100, 50, 10)"),
			Call("RefreshForge"),
		]),
		E([cmp2("Slot", "=", "4"), varIs("CoreFire", "<", 2)], [
			...msg(560, q("Нужно 2 ядра огня"), "rgbEx(100, 40, 40)"),
		]),
		E([cmp2("Slot", "=", "5"), varIs("CoreIce", ">=", 2)], [
			addVar("CoreIce", -2),
			Call("PushCraftedGun", "2"),
			...msg(560, q("Скован Клинок инея → слот 1"), "rgbEx(40, 70, 110)"),
			Call("RefreshForge"),
		]),
		E([cmp2("Slot", "=", "5"), varIs("CoreIce", "<", 2)], [
			...msg(560, q("Нужно 2 ядра льда"), "rgbEx(100, 40, 40)"),
		]),
		E([cmp2("Slot", "=", "6"), varIs("CoreShock", ">=", 2)], [
			addVar("CoreShock", -2),
			Call("PushCraftedGun", "3"),
			...msg(560, q("Скован Клинок грозы → слот 1"), "rgbEx(80, 40, 110)"),
			Call("RefreshForge"),
		]),
		E([cmp2("Slot", "=", "6"), varIs("CoreShock", "<", 2)], [
			...msg(560, q("Нужно 2 ядра молнии"), "rgbEx(100, 40, 40)"),
		]),
	]),

	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ForgeBtn" }), varIs("InForge", "=", 1)], [
		Call("ForgeBuy", "ForgeBtn.Slot"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ForgeBtnLabel" }), varIs("InForge", "=", 1)], [
		Call("ForgeBuy", "ForgeBtnLabel.Slot"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ForgeRow" }), varIs("InForge", "=", 1)], [
		Call("ForgeBuy", "ForgeRow.Slot"),
	]),
	E([key(KEY.D1), varIs("InForge", "=", 1)], [Call("ForgeBuy", "1")]),
	E([key(KEY.D2), varIs("InForge", "=", 1)], [Call("ForgeBuy", "2")]),
	E([key(KEY.D3), varIs("InForge", "=", 1)], [Call("ForgeBuy", "3")]),
	E([key(KEY.D4), varIs("InForge", "=", 1)], [Call("ForgeBuy", "4")]),
	E([key(KEY.D5), varIs("InForge", "=", 1)], [Call("ForgeBuy", "5")]),
	E([key(KEY.D6), varIs("InForge", "=", 1)], [Call("ForgeBuy", "6")]),

	Comment("В бою: 1/2 — слот в руке · G — обмен с полом"),
	E([key(KEY.D1), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("GameOver", "=", 0)], [
		setVar("Hand", 1),
		...msg(520, `"В руках [1]: " & Gun1Name`, "rgbEx(80, 90, 120)"),
	]),
	E([key(KEY.D2), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("Gun2", ">=", 0), varIs("GameOver", "=", 0)], [
		setVar("Hand", 2),
		...msg(520, `"В руках [2]: " & Gun2Name`, "rgbEx(80, 90, 120)"),
	]),
	E([key(KEY.D2), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("Gun2", "<", 0), varIs("GameOver", "=", 0)], [
		...msg(520, q("Слот 2 пуст"), "rgbEx(100, 40, 40)"),
	]),
	E([key(KEY.G), varIs("FloorGun", ">=", 0), varIs("GameOver", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0)], [
		setVar("TempGun", "ActiveGun"),
	], [
		E([varIs("Hand", "=", 1)], [
			setVar("Gun1", "FloorGun"),
			setVar("FloorGun", "TempGun"),
			Call("RefreshFloorGun"),
			...msg(520, `"Подобрал: " & Gun1Name & "  (старое на полу)"`, "rgbEx(80, 100, 40)"),
		]),
		E([varIs("Hand", "=", 2)], [
			setVar("Gun2", "FloorGun"),
			setVar("FloorGun", "TempGun"),
			Call("RefreshFloorGun"),
			...msg(520, `"Подобрал: " & Gun2Name & "  (старое на пол)"`, "rgbEx(80, 100, 40)"),
		]),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "FloorWeapon" }), varIs("FloorGun", ">=", 0), varIs("GameOver", "=", 0)], [
		setVar("TempGun", "ActiveGun"),
	], [
		E([varIs("Hand", "=", 1)], [
			setVar("Gun1", "FloorGun"),
			setVar("FloorGun", "TempGun"),
			Call("RefreshFloorGun"),
			...msg(520, `"Подобрал: " & Gun1Name`, "rgbEx(80, 100, 40)"),
		]),
		E([varIs("Hand", "=", 2)], [
			setVar("Gun2", "FloorGun"),
			setVar("FloorGun", "TempGun"),
			Call("RefreshFloorGun"),
			...msg(520, `"Подобрал: " & Gun2Name`, "rgbEx(80, 100, 40)"),
		]),
	]),
	E([key(KEY.G), varIs("FloorGun", "<", 0), varIs("GameOver", "=", 0)], [
		...msg(520, q("На полу нет оружия"), "rgbEx(100, 40, 40)"),
	]),
	Fn("SaveMissionProg", [], [], [
		E([varIs("Layer", "=", 1)], [setVar("MissionL1", "Mission")]),
		E([varIs("Layer", "=", 2)], [setVar("MissionL2", "Mission")]),
		E([varIs("Layer", "=", 3)], [setVar("MissionL3", "Mission")]),
		E([varIs("Layer", "=", 4)], [setVar("MissionL4", "Mission")]),
		E([varIs("Layer", "=", 5)], [setVar("MissionL5", "Mission")]),
		E([varIs("Layer", "=", 6)], [setVar("MissionL6", "Mission")]),
	]),
	Fn("LoadMissionProg", [], [], [
		E([varIs("Layer", "=", 1)], [setVar("Mission", "MissionL1")]),
		E([varIs("Layer", "=", 2)], [setVar("Mission", "MissionL2")]),
		E([varIs("Layer", "=", 3)], [setVar("Mission", "MissionL3")]),
		E([varIs("Layer", "=", 4)], [setVar("Mission", "MissionL4")]),
		E([varIs("Layer", "=", 5)], [setVar("Mission", "MissionL5")]),
		E([varIs("Layer", "=", 6)], [setVar("Mission", "MissionL6")]),
	]),
	Fn("ClearArena", [], [
		setVar("BossAlive", 0),
		setVar("BossPhase", 0),
		setVar("InForge", 0),
		setVar("InMods", 0),
		setVar("InStarMap", 0),
		setVar("ObjectiveDone", 0),
		setVar("SpawnReady", 0),
		setVar("EnemiesAlive", 0),
		setVar("Stealth", 0),
		setVar("SpyProgress", 0),
		setVar("Alarm", 0),
		setVar("HostageOK", 0),
		A("Enemy", "destroy"),
		A("Door", "destroy"),
		A("HeroBullet", "destroy"),
		A("EnemyBullet", "destroy"),
		A("Core", "destroy"),
		A("ModPickup", "destroy"),
		A("WolfDen", "destroy"),
		A("RoomProp", "destroy"),
		A("SpyTerminal", "destroy"),
		A("Hostage", "destroy"),
		A("ExtractZone", "destroy"),
		A("Wall", "destroy"),
		...miniClearAll,
		...forgeHide,
		...modHide,
		...starUiHide,
		...forgeClearNpc,
	], []),
	Fn("BuildLayout", [], [A("Wall", "destroy"), A("MiniWall", "destroy"), A("RoomProp", "destroy")], [
		E([varIs("InHub", "=", 1)], [...resizeGroundHubActions(), ...layoutHubActions()]),
		E([varIs("InMission", "=", 1)], [...resizeGroundWorldActions()]),
		// Истребление / босс: 3 варианта open
		...[0, 4].flatMap((mt) => [
			E([varIs("InMission", "=", 1), varIs("MissionType", "=", mt), cmp2("(Mission + Layer) % 3", "=", "0")], [...layoutOpenA()]),
			E([varIs("InMission", "=", 1), varIs("MissionType", "=", mt), cmp2("(Mission + Layer) % 3", "=", "1")], [...layoutOpenB()]),
			E([varIs("InMission", "=", 1), varIs("MissionType", "=", mt), cmp2("(Mission + Layer) % 3", "=", "2")], [...layoutOpenC()]),
		]),
		// Волны: 3 коридора
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 1), cmp2("(Mission + Layer) % 3", "=", "0")], [...layoutCorridorsA()]),
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 1), cmp2("(Mission + Layer) % 3", "=", "1")], [...layoutCorridorsB()]),
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 1), cmp2("(Mission + Layer) % 3", "=", "2")], [...layoutCorridorsC()]),
		// Оборона
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 2), cmp2("(Mission + Layer) % 2", "=", "0")], [...layoutDefenseA()]),
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 2), cmp2("(Mission + Layer) % 2", "=", "1")], [...layoutDefenseB()]),
		// Элита
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 3), cmp2("(Mission + Layer) % 2", "=", "0")], [...layoutEliteA()]),
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 3), cmp2("(Mission + Layer) % 2", "=", "1")], [...layoutEliteB()]),
		// Шпионаж
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 5), cmp2("(Mission + Layer) % 2", "=", "0")], [...layoutSpyA()]),
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 5), cmp2("(Mission + Layer) % 2", "=", "1")], [...layoutSpyB()]),
		// Спасение
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 6), cmp2("(Mission + Layer) % 2", "=", "0")], [...layoutRescueA()]),
		E([varIs("InMission", "=", 1), varIs("MissionType", "=", 6), cmp2("(Mission + Layer) % 2", "=", "1")], [...layoutRescueB()]),
		E([varIs("InMission", "=", 1)], [...layoutDecorActions()]),
	]),
	Fn("SyncPlanetMeta", [], [], [
		...LAYER_META.map(({ layer, nodes, name, ground }) =>
			E([varIs("Layer", "=", layer)], [
				setVar("PlanetNodes", nodes),
				setVar("LayerName", q(name)),
				setVar("GroundAnim", q(ground)),
			])),
		E([varIs("InHub", "=", 1)], [setVar("GroundAnim", q("forge"))]),
	]),
	Fn("SyncMissionTypeName", [], [], [
		...Object.entries(MISSION_TYPE_NAMES).map(([id, name]) =>
			E([varIs("MissionType", "=", Number(id))], [setVar("MissionTypeName", q(name))])),
	]),
	/** Короткие переменные вместо nested ternary в тике / HUD / уроне. */
	Fn("SyncCombatMeta", [], [], [
		E([varIs("Hand", "=", 1)], [
			setVar("ActiveGun", "Gun1"),
			setVar("HandModA", "Gun1ModA"), setVar("HandModB", "Gun1ModB"),
			setVar("HandModC", "Gun1ModC"), setVar("HandModD", "Gun1ModD"),
			setVar("HandMark1", q(" <<")), setVar("HandMark2", q("")),
		]),
		E([varIs("Hand", "=", 2)], [
			setVar("ActiveGun", "Gun2"),
			setVar("HandModA", "Gun2ModA"), setVar("HandModB", "Gun2ModB"),
			setVar("HandModC", "Gun2ModC"), setVar("HandModD", "Gun2ModD"),
			setVar("HandMark1", q("")), setVar("HandMark2", q(" <<")),
		]),
		E([varIs("ActiveGun", ">", 0)], [setVar("Element", "ActiveGun")]),
		E([varIs("ActiveGun", "<=", 0)], [setVar("Element", "EchoElement")]),
		E([varIs("MissionType", "=", 2)], [setVar("AiTX", "DefendX"), setVar("AiTY", "DefendY")]),
		E([cmp2("MissionType", "!=", "2")], [setVar("AiTX", "Hero.X"), setVar("AiTY", "Hero.Y")]),
		E([], [
			setVar("Gun1Name", q(GUN_TYPE_NAMES[0])),
			setVar("Gun2Name", q("—")),
			setVar("FloorGunName", q("—")),
			setVar("FloorAnim", q("echo")),
			setVar("ElemAnim", q("normal")),
		], [
			...[1, 2, 3].flatMap((t) => [
				E([varIs("Gun1", "=", t)], [setVar("Gun1Name", q(GUN_TYPE_NAMES[t]))]),
				E([varIs("Gun2", "=", t)], [setVar("Gun2Name", q(GUN_TYPE_NAMES[t]))]),
				E([varIs("FloorGun", "=", t)], [
					setVar("FloorGunName", q(GUN_TYPE_NAMES[t])),
					setVar("FloorAnim", q(t === 1 ? "fire" : t === 2 ? "ice" : "shock")),
				]),
			]),
			E([varIs("Gun1", "<", 0)], [setVar("Gun1Name", q("—"))]),
			E([varIs("Gun2", "=", 0)], [setVar("Gun2Name", q(GUN_TYPE_NAMES[0]))]),
			E([varIs("FloorGun", "=", 0)], [setVar("FloorGunName", q(GUN_TYPE_NAMES[0]))]),
			E([varIs("Element", "=", 1)], [setVar("ElemAnim", q("fire"))]),
			E([varIs("Element", "=", 2)], [setVar("ElemAnim", q("ice"))]),
			E([varIs("Element", "=", 3)], [setVar("ElemAnim", q("shock"))]),
		]),
		E([varIs("Hand", "=", 1)], [setVar("HandGunName", "Gun1Name")]),
		E([varIs("Hand", "=", 2)], [setVar("HandGunName", "Gun2Name")]),
		E([], [
			setVar("HandCap", 0), setVar("ModBonusDmg", 0),
			setVar("HasLifeMod", 0), setVar("HasSpeedMod", 0),
			setVar("ModNameA", q("—")), setVar("ModNameB", q("—")),
			setVar("ModNameC", q("—")), setVar("ModNameD", q("—")),
			setVar("HandCostA", 0), setVar("HandCostB", 0),
			setVar("HandCostC", 0), setVar("HandCostD", 0),
			setVar("SlotHas1", 0), setVar("SlotHas2", 0), setVar("SlotHas3", 0),
			setVar("SlotHas4", 0), setVar("SlotHas5", 0),
		], [
			...applyHandModSlot("HandModA", "ModNameA", "HandCostA"),
			...applyHandModSlot("HandModB", "ModNameB", "HandCostB"),
			...applyHandModSlot("HandModC", "ModNameC", "HandCostC"),
			...applyHandModSlot("HandModD", "ModNameD", "HandCostD"),
		]),
		E([], [
			setVar("BulletDmg", "Hero.Damage + Floor(RoomsDone / 2) + ModBonusDmg"),
		], [
			E([varIs("ActiveGun", "=", 1)], [addVar("BulletDmg", 12)]),
			E([varIs("ActiveGun", "=", 2)], [addVar("BulletDmg", 9)]),
			E([varIs("ActiveGun", "=", 3)], [addVar("BulletDmg", 12)]),
			E([varIs("ActiveGun", "<=", 0), varIs("Element", "=", 1)], [addVar("BulletDmg", 6)]),
			E([varIs("ActiveGun", "<=", 0), varIs("Element", "=", 2)], [addVar("BulletDmg", 3)]),
			E([varIs("ActiveGun", "<=", 0), varIs("Element", "=", 3)], [addVar("BulletDmg", 8)]),
		]),
		E([], [
			setVar("RelicReadyText", q(" ГОТОВА")),
			setVar("ShieldText", q("")),
			setVar("StealthText", q("")),
			setVar("AlarmText", q("")),
		], [
			E([varIs("RelicCD", ">", 0)], [setVar("RelicReadyText", `" (" & ceil(RelicCD) & "с)"`)]),
			E([varIs("Shield", ">", 0)], [setVar("ShieldText", q("  [ЩИТ]"))]),
			E([varIs("Stealth", "=", 1)], [setVar("StealthText", q("  [СТЕЛС]"))]),
			E([varIs("Alarm", "=", 1)], [setVar("AlarmText", q("  [ТРЕВОГА]"))]),
		]),
	]),
	Fn("EnterHub", [], [
		setVar("InHub", 1),
		setVar("InMission", 0),
		setVar("ObjectiveDone", 0),
		setVar("SpawnReady", 0),
		setVar("Stealth", 0),
		setVar("Alarm", 0),
		setVar("ObjectiveX", 640),
		setVar("ObjectiveY", 400),
		Call("SyncPlanetMeta"),
		Call("ClearArena"),
		Call("BuildLayout"),
		A("Ground", "set-animation", { animation: "GroundAnim", from: "beginning" }),
		...forgeSpawnNpc,
		A("Hero", "set-position", { x: "640", y: "400" }),
		setVar("IFrames", 1),
		Call("SyncFloorGunVisual"),
		...msg(70, `"Корабль · 1 отсек · " & LayerName & " · узел " & Mission & "/" & PlanetNodes & " · F — узлы"`, "rgbEx(80, 120, 160)"),
	], []),
	Fn("TravelToLayer", [["Target", "number"]], [
		Call("SaveMissionProg"),
		setVar("Layer", "Target"),
		Call("LoadMissionProg"),
		Call("EnterHub"),
		...msg(60, `"Навигация → " & LayerName & " · узел " & Mission & "/" & PlanetNodes`, "rgbEx(80, 160, 220)"),
		...fx("Hero.X", "Hero.Y", 120, "rgbEx(60, 120, 180)"),
	], []),
	Fn("AdvanceMission", [], [
		addVar("Mission", 1),
		addVar("RoomsDone", 1),
		Call("SaveMissionProg"),
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + Hero.MaxHP * 0.2)"),
		Call("EnterHub"),
		...msg(70, `"Узел пройден → следующий " & Mission & "/" & PlanetNodes`, "rgbEx(80, 160, 100)"),
		...fx("Hero.X", "Hero.Y", 120, "rgbEx(60, 140, 80)"),
	], []),
	Fn("AdvanceLayer", [], [
		Call("SaveMissionProg"),
		addVar("Layer", 1),
		setVar("MaxLayer", "max(MaxLayer, Layer)"),
		setVar("Mission", 1),
		addVar("RoomsDone", 1),
		Call("SaveMissionProg"),
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + Hero.MaxHP * 0.35)"),
		Call("EnterHub"),
		...msg(60, `"Новая планета → " & LayerName & " · узлов: " & PlanetNodes`, "rgbEx(80, 140, 200)"),
		...fx("Hero.X", "Hero.Y", 140, "rgbEx(60, 100, 160)"),
	], []),
	Fn("CompleteMission", [], [
		setVar("ObjectiveDone", 1),
		setVar("SpawnReady", 0),
		setVar("BossAlive", 0),
	], [
		E([cmp2("Mission", "<", "PlanetNodes")], [Call("AdvanceMission")]),
		E([cmp2("Mission", ">=", "PlanetNodes"), cmp2("Layer", "<", String(PLANET_COUNT))], [Call("AdvanceLayer")]),
		E([cmp2("Mission", ">=", "PlanetNodes"), varIs("Layer", "=", PLANET_COUNT)], [
			setVar("Won", 1),
			setVar("GameOver", 1),
			A("Hero", "set-ignoring-input", { input: "start-ignoring" }, "EightDir"),
			A("GameOverText", "set-visible", { visibility: "visible" }),
			A("GameOverText", "set-font-color", { color: "rgbEx(40, 100, 50)" }),
			A("GameOverText", "set-text", {
				text: `"ЭХО ПРОЙДЕНО!" & newline & newline & "Планеты: ${PLANET_COUNT}/${PLANET_COUNT}   Убито: " & Kills & newline & newline & "R — новый забег"`,
			}),
			A("System", "set-time-scale", { "time-scale": "0" }),
		]),
	]),

	Comment("Звёздная карта: планеты + прогресс узлов-миссий"),
	Fn("RefreshStarMap", [], [
		Call("SyncPlanetMeta"),
		A("StarInfo", "set-text", { text: starInfoText }),
	], [
		...LAYER_META.flatMap(({ layer: slot, prefix, name, nodes, mVar }) => [
			E([pickBy("PlanetBtn", "PlanetBtn.Slot", "=", String(slot)), varIs("Layer", "=", slot)], [
				A("PlanetBtn", "set-animation", { animation: q(`${prefix}Here`), from: "beginning" }),
			]),
			E([pickBy("PlanetBtn", "PlanetBtn.Slot", "=", String(slot)), cmp2("Layer", "!=", String(slot)), cmp2(String(slot), "<=", "MaxLayer")], [
				A("PlanetBtn", "set-animation", { animation: q(`${prefix}Open`), from: "beginning" }),
			]),
			E([pickBy("PlanetBtn", "PlanetBtn.Slot", "=", String(slot)), cmp2("Layer", "!=", String(slot)), cmp2(String(slot), ">", "MaxLayer")], [
				A("PlanetBtn", "set-animation", { animation: q(`${prefix}Lock`), from: "beginning" }),
			]),
			E([pickBy("PlanetLabel", "PlanetLabel.Slot", "=", String(slot)), varIs("Layer", "=", slot)], [
				A("PlanetLabel", "set-text", { text: `"${name}" & newline & "[здесь] " & Mission & "/${nodes}"` }),
			]),
			E([pickBy("PlanetLabel", "PlanetLabel.Slot", "=", String(slot)), cmp2("Layer", "!=", String(slot)), cmp2(String(slot), "<=", "MaxLayer")], [
				A("PlanetLabel", "set-text", { text: `"${name}" & newline & "узел " & ${mVar} & "/${nodes}"` }),
			]),
			E([pickBy("PlanetLabel", "PlanetLabel.Slot", "=", String(slot)), cmp2("Layer", "!=", String(slot)), cmp2(String(slot), ">", "MaxLayer")], [
				A("PlanetLabel", "set-text", { text: `"${name}" & newline & "[замок]"` }),
			]),
		]),
	]),
	Fn("OpenStarMap", [], [...starShow]),
	Fn("CloseStarMap", [], [
		...starUiHide,
		A("ForgeDim", "set-visible", { visibility: "invisible" }),
		...hudShow(),
	], [
		E([varIs("InHub", "=", 1)], [
			A("ForgePrompt", "set-visible", { visibility: "visible" }),
			A("GatePrompt", "set-text", { text: q("F — узлы · V — планеты") }),
			A("GatePrompt", "set-visible", { visibility: "visible" }),
			A("ModPrompt", "set-visible", { visibility: "visible" }),
		]),
	]),
	Fn("StarTravel", [["Target", "number"]], [], [
		E([cmp2("Target", "=", "Layer")], [
			...msg(90, q("Вы уже на этой планете"), "rgbEx(100, 80, 40)"),
		]),
		E([cmp2("Target", ">", "MaxLayer")], [
			...msg(110, q("Планета закрыта — пройдите все узлы и босса текущего мира"), "rgbEx(100, 60, 40)"),
		]),
		E([cmp2("Target", "<=", "MaxLayer"), cmp2("Target", "!=", "Layer")], [
			Call("TravelToLayer", "Target"),
		]),
	]),
	E([
		key(KEY.V), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0),
		varIs("InHub", "=", 1),
		cmp2("distance(Hero.X, Hero.Y, EchoGate.X, EchoGate.Y)", "<", "160"),
	], [Call("OpenStarMap")]),
	E([
		C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "EchoGate" }),
		varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0),
		varIs("InHub", "=", 1),
	], [Call("OpenStarMap")]),
	E([
		key(KEY.F), varIs("GameOver", "=", 0), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0),
		varIs("InHub", "=", 1),
	], [Call("OpenMissionMap")]),
	E([key(KEY.X), varIs("InStarMap", "=", 1)], [Call("CloseStarMap")]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "StarClose" }), varIs("InStarMap", "=", 1)], [
		Call("CloseStarMap"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "PlanetBtn" }), varIs("InStarMap", "=", 1)], [
		Call("StarTravel", "PlanetBtn.Slot"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "PlanetLabel" }), varIs("InStarMap", "=", 1)], [
		Call("StarTravel", "PlanetLabel.Slot"),
	]),
	E([key(KEY.D1), varIs("InStarMap", "=", 1)], [Call("StarTravel", "1")]),
	E([key(KEY.D2), varIs("InStarMap", "=", 1)], [Call("StarTravel", "2")]),
	E([key(KEY.D3), varIs("InStarMap", "=", 1)], [Call("StarTravel", "3")]),
	E([key(KEY.D4), varIs("InStarMap", "=", 1)], [Call("StarTravel", "4")]),
	E([key(KEY.D5), varIs("InStarMap", "=", 1)], [Call("StarTravel", "5")]),
	E([key(KEY.D6), varIs("InStarMap", "=", 1)], [Call("StarTravel", "6")]),

	Comment("Кузница: открыть / закрыть окно"),
	Fn("OpenForge", [], [
		...forgeShow,
	], []),
	Fn("CloseForge", [], [
		...forgeHide,
	], [
		E([varIs("InHub", "=", 1)], [
			A("ForgePrompt", "set-position", { x: "280", y: "240" }),
			A("ForgePrompt", "set-text", { text: q("E — кузница") }),
			A("ForgePrompt", "set-visible", { visibility: "visible" }),
			A("GatePrompt", "set-position", { x: "500", y: "230" }),
			A("GatePrompt", "set-text", { text: q("F — узлы · V — планеты") }),
			A("GatePrompt", "set-visible", { visibility: "visible" }),
			A("ModPrompt", "set-position", { x: "740", y: "240" }),
			A("ModPrompt", "set-text", { text: q("M — автомат модов") }),
			A("ModPrompt", "set-visible", { visibility: "visible" }),
		]),
	]),

	E([key(KEY.E), varIs("InHub", "=", 1), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("GameOver", "=", 0)], [
		Call("OpenForge"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ForgeNPC" }), varIs("InHub", "=", 1), varIs("InForge", "=", 0), varIs("InMods", "=", 0), varIs("InStarMap", "=", 0), varIs("InMissionMap", "=", 0), varIs("GameOver", "=", 0)], [
		Call("OpenForge"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ForgeClose" }), varIs("InForge", "=", 1)], [
		Call("CloseForge"),
	]),

	Comment("Карта узлов миссий (Warframe Earth-style)"),
	Fn("RebuildMissionEdges", [], [A("MissionEdge", "destroy")], [
		...MISSION_EDGES.map(([a, b]) => {
			const [x1, y1] = MISSION_NODE_POS[a];
			const [x2, y2] = MISSION_NODE_POS[b];
			const mx = ((x1 + x2) / 2).toFixed(1);
			const my = ((y1 + y2) / 2).toFixed(1);
			const len = Math.hypot(x2 - x1, y2 - y1).toFixed(1);
			const ang = ((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI).toFixed(2);
			const need = Math.max(a, b) + 1;
			return E([cmp2("PlanetNodes", ">=", String(need))], [
				create("MissionEdge", "HUD", mx, my),
				A("MissionEdge", "set-size", { width: String(len), height: "3" }),
				A("MissionEdge", "set-angle", { angle: String(ang) }),
				A("MissionEdge", "set-visible", { visibility: "visible" }),
			]);
		}),
	]),
	Fn("RefreshMissionMap", [], [
		Call("SyncPlanetMeta"),
		A("MissionMapTitle", "set-text", { text: `"УЗЛЫ · " & LayerName` }),
		A("MissionMapInfo", "set-text", { text: missionMapInfoText }),
		Call("RebuildMissionEdges"),
	], [
		...Array.from({ length: 15 }, (_, i) => i + 1).flatMap((slot) => {
			const name = MISSION_NODE_NAMES[slot - 1];
			const pickN = pickBy("MissionNode", "MissionNode.Slot", "=", String(slot));
			const pickL = pickBy("MissionNodeLabel", "MissionNodeLabel.Slot", "=", String(slot));
			return [
				E([pickN, cmp2(String(slot), ">", "PlanetNodes")], [
					A("MissionNode", "set-visible", { visibility: "invisible" }),
				]),
				E([pickN, cmp2(String(slot), "<=", "PlanetNodes"), cmp2(String(slot), "<", "Mission")], [
					A("MissionNode", "set-visible", { visibility: "visible" }),
					A("MissionNode", "set-animation", { animation: q("done"), from: "beginning" }),
				]),
				E([pickN, cmp2(String(slot), "=", "Mission"), cmp2(String(slot), "<", "PlanetNodes")], [
					A("MissionNode", "set-visible", { visibility: "visible" }),
					A("MissionNode", "set-animation", { animation: q("here"), from: "beginning" }),
				]),
				E([pickN, cmp2(String(slot), "=", "Mission"), cmp2(String(slot), "=", "PlanetNodes")], [
					A("MissionNode", "set-visible", { visibility: "visible" }),
					A("MissionNode", "set-animation", { animation: q("boss"), from: "beginning" }),
				]),
				E([pickN, cmp2(String(slot), ">", "Mission"), cmp2(String(slot), "<", "PlanetNodes")], [
					A("MissionNode", "set-visible", { visibility: "visible" }),
					A("MissionNode", "set-animation", { animation: q("lock"), from: "beginning" }),
				]),
				E([pickN, cmp2(String(slot), ">", "Mission"), cmp2(String(slot), "=", "PlanetNodes")], [
					A("MissionNode", "set-visible", { visibility: "visible" }),
					A("MissionNode", "set-animation", { animation: q("boss"), from: "beginning" }),
				]),
				E([pickL, cmp2(String(slot), ">", "PlanetNodes")], [
					A("MissionNodeLabel", "set-visible", { visibility: "invisible" }),
				]),
				E([pickL, cmp2(String(slot), "<", "PlanetNodes")], [
					A("MissionNodeLabel", "set-visible", { visibility: "visible" }),
					A("MissionNodeLabel", "set-text", { text: q(name) }),
				]),
				E([pickL, cmp2(String(slot), "=", "PlanetNodes")], [
					A("MissionNodeLabel", "set-visible", { visibility: "visible" }),
					A("MissionNodeLabel", "set-text", { text: q("ГОЛЕМ МИРА") }),
				]),
			];
		}),
	]),
	Fn("OpenMissionMap", [], [...missionMapShow]),
	Fn("CloseMissionMap", [], [
		...missionMapUiHide,
		A("ForgeDim", "set-visible", { visibility: "invisible" }),
		...hudShow(),
	], [
		E([varIs("InHub", "=", 1)], [
			A("ForgePrompt", "set-visible", { visibility: "visible" }),
			A("GatePrompt", "set-text", { text: q("F — узлы · V — планеты") }),
			A("GatePrompt", "set-visible", { visibility: "visible" }),
			A("ModPrompt", "set-visible", { visibility: "visible" }),
		]),
	]),
	Fn("MissionNodeClick", [["Slot", "number"]], [], [
		E([cmp2("Slot", ">", "PlanetNodes")], [
			...msg(80, q("Узел вне карты планеты"), "rgbEx(100, 60, 40)"),
		]),
		E([cmp2("Slot", ">", "Mission")], [
			...msg(90, q("Узел закрыт — пройдите предыдущие"), "rgbEx(100, 70, 40)"),
		]),
		E([cmp2("Slot", "<", "Mission")], [
			...msg(90, q("Узел уже пройден"), "rgbEx(60, 100, 70)"),
		]),
		E([cmp2("Slot", "=", "Mission"), cmp2("Slot", "<=", "PlanetNodes")], [
			Call("CloseMissionMap"),
			Call("StartMission"),
		]),
	]),
	E([key(KEY.X), varIs("InMissionMap", "=", 1)], [Call("CloseMissionMap")]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "MissionMapClose" }), varIs("InMissionMap", "=", 1)], [
		Call("CloseMissionMap"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "MissionNode" }), varIs("InMissionMap", "=", 1)], [
		Call("MissionNodeClick", "MissionNode.Slot"),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "MissionNodeLabel" }), varIs("InMissionMap", "=", 1)], [
		Call("MissionNodeClick", "MissionNodeLabel.Slot"),
	]),

	Comment("Старт миссии на большой локации"),
	Fn("StartMission", [], [
		...missionMapUiHide,
		A("ForgeDim", "set-visible", { visibility: "invisible" }),
		setVar("InHub", 0),
		setVar("InMission", 1),
		Call("SyncPlanetMeta"),
		setVar("ObjectiveDone", 0),
		setVar("SpawnReady", 0),
		setVar("Wave", 0),
		setVar("WaveMax", "3 + Floor(Mission / 4)"),
		setVar("DefendHP", "180 + Layer * 40 + Mission * 8"),
		setVar("DefendMaxHP", "180 + Layer * 40 + Mission * 8"),
		setVar("Stealth", 0),
		setVar("SpyProgress", 0),
		setVar("Alarm", 0),
		setVar("HostageOK", 0),
		setVar("ObjectiveX", String(POI.center[0])),
		setVar("ObjectiveY", String(POI.center[1])),
		Call("ClearArena"),
	], [
		E([cmp2("Mission", ">=", "PlanetNodes")], [setVar("MissionType", 4)]),
		E([cmp2("Mission", "<", "PlanetNodes"), cmp2("(Mission + Layer * 2) % 6", "=", "4")], [setVar("MissionType", 5)]),
		E([cmp2("Mission", "<", "PlanetNodes"), cmp2("(Mission + Layer * 2) % 6", "=", "5")], [setVar("MissionType", 6)]),
		E([
			cmp2("Mission", "<", "PlanetNodes"),
			cmp2("(Mission + Layer * 2) % 6", "!=", "4"),
			cmp2("(Mission + Layer * 2) % 6", "!=", "5"),
		], [setVar("MissionType", "(Mission + Layer * 2) % 6")]),
		E([], [
			Call("SyncMissionTypeName"),
			Call("SyncCombatMeta"),
			Call("BuildLayout"),
			A("Ground", "set-animation", { animation: "GroundAnim", from: "beginning" }),
			A("Hero", "set-position", { x: String(POI.start[0]), y: String(POI.start[1]) }),
			setVar("IFrames", 1),
			Call("SyncFloorGunVisual"),
			...msg(70, `LayerName & " · " & MissionTypeName & " · большая локация"`, "rgbEx(50, 80, 120)"),
		]),
		E([varIs("MissionType", "=", 0)], [Call("SpawnExterminate")]),
		E([varIs("MissionType", "=", 1)], [Call("SpawnWave")]),
		E([varIs("MissionType", "=", 2)], [Call("SpawnDefense")]),
		E([varIs("MissionType", "=", 3)], [Call("SpawnElite")]),
		E([varIs("MissionType", "=", 4)], [Call("SpawnWorldBoss")]),
		E([varIs("MissionType", "=", 5)], [Call("SpawnSpy")]),
		E([varIs("MissionType", "=", 6)], [Call("SpawnRescue")]),
		E([], [setVar("SpawnReady", 1), Call("RecountThreats")]),
	]),

	Fn("SpawnExterminate", [], [
		setVar("EnemiesAlive", 0),
		setVar("ObjectiveX", String(POI.center[0])),
		setVar("ObjectiveY", String(POI.center[1])),
	], [
		E([], [
			...spawnEnemyActions(POI.north[0], POI.north[1], 1),
			...spawnEnemyActions(POI.east[0], POI.east[1], 0),
			...spawnEnemyActions(POI.west[0], POI.west[1], 1),
			...spawnEnemyActions(POI.south[0], POI.south[1], 0),
			...spawnEnemyActions(POI.se[0], POI.se[1], 2),
			...spawnEnemyActions(POI.sw[0], POI.sw[1], 1),
			...spawnEnemyActions(POI.center[0] - 120, POI.center[1], 0),
			...spawnEnemyActions(POI.center[0] + 120, POI.center[1], 1),
			...spawnProp(POI.north[0] - 80, POI.north[1] - 60, "tree"),
			...spawnProp(POI.east[0] + 40, POI.east[1], "tree"),
			...spawnProp(POI.sw[0], POI.sw[1] + 40, "tree"),
			Call("RecountThreats"),
		]),
	]),

	Fn("SpawnWave", [], [
		addVar("Wave", 1),
		setVar("EnemiesAlive", 0),
		setVar("ObjectiveX", String(POI.center[0])),
		setVar("ObjectiveY", String(POI.center[1])),
	], [
		E([], [
			...spawnEnemyActions(POI.north[0], POI.north[1], 1),
			...spawnEnemyActions(POI.east[0], POI.east[1], 0),
			...spawnEnemyActions(POI.west[0], POI.west[1], 5),
			...spawnEnemyActions(POI.south[0], POI.south[1], 0),
		]),
		E([cmp2("Wave", ">=", "2")], [
			...spawnEnemyActions(POI.se[0], POI.se[1], 1),
			...spawnEnemyActions(POI.sw[0], POI.sw[1], 0),
		]),
		E([], [
			Call("RecountThreats"),
			...msg(100, `"Волна " & Wave & "/" & WaveMax`, "rgbEx(80, 100, 160)"),
		]),
	]),

	Fn("SpawnDefense", [], [
		setVar("EnemiesAlive", 0),
		setVar("Wave", 0),
		setVar("WaveMax", "6"),
		setVar("DefendX", String(POI.center[0])),
		setVar("DefendY", String(POI.center[1])),
		setVar("ObjectiveX", String(POI.center[0])),
		setVar("ObjectiveY", String(POI.center[1])),
		setVar("DefendMaxHP", "180 + Layer * 40 + Mission * 8"),
		setVar("DefendHP", "DefendMaxHP"),
		...spawnProp(POI.center[0], POI.center[1], "beacon"),
		...msg(100, q("Оборона: найди бур и защити 6 волн!"), "rgbEx(80, 140, 180)"),
	], [
		E([], [Call("SpawnDefenseWave")]),
	]),
	Fn("SpawnDefenseWave", [], [
		addVar("Wave", 1),
		setVar("EnemiesAlive", 0),
	], [
		E([], [
			...spawnEnemyActions(POI.north[0], POI.north[1], 1),
			...spawnEnemyActions(POI.east[0], POI.east[1], 0),
			...spawnEnemyActions(POI.west[0], POI.west[1], 1),
			...spawnEnemyActions(POI.south[0], POI.south[1], 0),
		]),
		E([cmp2("Wave", ">=", "3")], [
			...spawnEnemyActions(POI.se[0], POI.se[1], 4),
			...spawnEnemyActions(POI.sw[0], POI.sw[1], 1),
			...spawnEnemyActions(POI.start[0], POI.start[1], 0),
		]),
		E([cmp2("Wave", ">=", "5")], [
			...spawnEnemyActions(POI.north[0] + 100, POI.north[1], 2),
			...spawnEnemyActions(POI.east[0] - 80, POI.east[1], 5),
		]),
		E([], [
			Call("RecountThreats"),
			...msg(90, `"Волна " & Wave & "/" & WaveMax & " · бур " & Floor(DefendHP) & "/" & DefendMaxHP`, "rgbEx(80, 140, 180)"),
		]),
	]),

	Fn("SpawnElite", [], [
		setVar("EnemiesAlive", 0),
		setVar("BossPhase", 1),
		setVar("BossAlive", 1),
		setVar("ObjectiveX", String(POI.center[0])),
		setVar("ObjectiveY", String(POI.center[1])),
		create("Enemy", "Game", String(POI.center[0]), String(POI.center[1])),
		A("Enemy", "set-animation", { animation: `(Layer >= 5 ? "ancient" & Layer : "heavy" & Layer)`, from: "beginning" }),
		A("Enemy", "set-scale", { scale: "1.2 + Layer * 0.06" }),
		setIv("Enemy", "IsBoss", 1),
		setIv("Enemy", "Archetype", "Layer >= 5 ? 7 : 4"),
		setIv("Enemy", "Agro", 1),
		setIv("Enemy", "Alert", 1),
		setIv("Enemy", "MaxHP", "70 + Layer * 25 + Mission * 10 + RoomsDone * 5"),
		setIv("Enemy", "HP", "Self.MaxHP"),
		setIv("Enemy", "Damage", "10 + Layer * 3 + Floor(Mission / 2)"),
		setIv("Enemy", "Speed", "55 + Layer * 3"),
		setIv("Enemy", "Bounty", "20 + Layer * 8 + Mission * 2"),
		setIv("Enemy", "AtkCD", "0.55"),
		setIv("Enemy", "PathAng", `angle(${POI.center[0]}, ${POI.center[1]}, Hero.X, Hero.Y)`),
		addVar("EnemiesAlive", 1),
		...spawnEnemyActions(POI.north[0], POI.north[1], 1),
		...spawnEnemyActions(POI.south[0], POI.south[1], 0),
		...msg(110, `"Узел-элита · " & LayerName`, "rgbEx(100, 70, 30)"),
	], []),

	Fn("SpawnWorldBoss", [], [
		setVar("EnemiesAlive", 0),
		setVar("BossPhase", 1),
		setVar("BossAlive", 1),
		setVar("ObjectiveX", String(POI.center[0])),
		setVar("ObjectiveY", String(POI.center[1])),
		create("Enemy", "Game", String(POI.center[0]), String(POI.center[1] - 80)),
		A("Enemy", "set-animation", { animation: bossAnimExpr, from: "beginning" }),
		A("Enemy", "set-scale", { scale: "1.45 + Layer * 0.12" }),
		setIv("Enemy", "IsBoss", 1),
		setIv("Enemy", "Archetype", 1),
		setIv("Enemy", "Agro", 1),
		setIv("Enemy", "Alert", 1),
		setIv("Enemy", "MaxHP", "140 + Layer * 55 + Mission * 8 + RoomsDone * 8"),
		setIv("Enemy", "HP", "Self.MaxHP"),
		setIv("Enemy", "Damage", "14 + Layer * 5"),
		setIv("Enemy", "Speed", "48 + Layer * 4"),
		setIv("Enemy", "Bounty", "40 + Layer * 15"),
		setIv("Enemy", "AtkCD", "0.45"),
		setIv("Enemy", "PathAng", `angle(${POI.center[0]}, ${POI.center[1] - 80}, Hero.X, Hero.Y)`),
		addVar("EnemiesAlive", 1),
		...spawnEnemyActions(POI.west[0], POI.west[1], 1),
		...spawnEnemyActions(POI.east[0], POI.east[1], 0),
		...msg(130, `"БОСС МИРА · " & LayerName`, "rgbEx(100, 30, 20)"),
	], []),

	Fn("SpawnSpy", [], [
		setVar("SpyProgress", 0),
		setVar("Alarm", 0),
		setVar("ObjectiveX", String(POI.se[0])),
		setVar("ObjectiveY", String(POI.se[1])),
		create("SpyTerminal", "Game", String(POI.se[0]), String(POI.se[1])),
		A("SpyTerminal", "set-visible", { visibility: "visible" }),
		...spawnEnemyActions(POI.east[0], POI.east[1], 0),
		...spawnEnemyActions(POI.south[0], POI.south[1], 1),
		...spawnEnemyActions(POI.center[0], POI.center[1], 2),
		...spawnEnemyActions(POI.se[0] - 150, POI.se[1] - 80, 0),
		...msg(100, q("Шпионаж: доберись до терминала · Shift стелс"), "rgbEx(80, 160, 200)"),
	], []),

	Fn("SpawnRescue", [], [
		setVar("HostageOK", 0),
		setVar("ObjectiveX", String(POI.se[0])),
		setVar("ObjectiveY", String(POI.se[1])),
		create("Hostage", "Game", String(POI.se[0]), String(POI.se[1])),
		setIv("Hostage", "Rescued", 0),
		A("Hostage", "set-visible", { visibility: "visible" }),
		A("Hostage", "set-speed", { speed: "0" }, "Bullet"),
		create("ExtractZone", "Game", String(POI.start[0]), String(POI.start[1])),
		A("ExtractZone", "set-visible", { visibility: "visible" }),
		...spawnEnemyActions(POI.east[0], POI.east[1], 1),
		...spawnEnemyActions(POI.south[0], POI.south[1], 0),
		...spawnEnemyActions(POI.center[0], POI.center[1], 4),
		...spawnEnemyActions(POI.se[0] - 120, POI.se[1], 0),
		...msg(100, q("Спасение: найди заложника и доведи до зоны эвака"), "rgbEx(100, 160, 80)"),
	], []),

	Comment("Смерть / меню / пауза"),
	E([ivIs("Hero", "HP", "<=", 0), sys("trigger-once-while-true")], [
		setVar("GameOver", 1),
		A("Hero", "set-ignoring-input", { input: "start-ignoring" }, "EightDir"),
		A("GameOverText", "set-visible", { visibility: "visible" }),
		A("GameOverText", "set-font-color", { color: "rgbEx(100, 40, 35)" }),
		A("GameOverText", "set-text", { text: `"ПОРАЖЕНИЕ" & newline & newline & "Планета: " & LayerName & newline & "Узел: " & Mission & "/" & PlanetNodes & " · мир " & Layer & "/${PLANET_COUNT}" & newline & "Цель: " & MissionTypeName & "   Убито: " & Kills & newline & newline & "R — выбрать реликвию заново"` }),
		A("System", "set-time-scale", { "time-scale": "0" }),
	]),
	E([key(KEY.R)], [A("System", "go-to-layout", { layout: "Menu" })]),
	E([key(KEY.P), varIs("GameOver", "=", 0)], [
		A("System", "set-time-scale", { "time-scale": "timescale = 0 ? 1 : 0" }),
		A("PauseText", "set-visible", { visibility: "toggle" }),
	]),

	Comment("Стихия огня: DoT рядом"),
	E([
		varIs("Element", "=", 1), everySec(0.45), varIs("GameOver", "=", 0), varIs("InForge", "=", 0),
		C("Enemy", "pick-nearestfurthest", { which: "nearest", x: "Hero.X", y: "Hero.Y", z: "0", "pick-all-tied": false }),
		cmp2("distance(Hero.X, Hero.Y, Enemy.X, Enemy.Y)", "<=", 170),
	], [
		Call("DamageEnemy", "Enemy.UID", "4 + Floor(RoomsDone / 2)"),
	]),

	Comment("Босс: фаза 2 при ≤50% HP (временные цифры до таблицы GD)"),
	E([
		varIs("BossAlive", "=", 1), varIs("BossPhase", "=", 1), varIs("GameOver", "=", 0),
		ivIs("Enemy", "IsBoss", "=", 1),
		cmp2("Enemy.HP", "<=", "Enemy.MaxHP * 0.5"),
		sys("trigger-once-while-true"),
	], [
		setVar("BossPhase", 2),
		setIv("Enemy", "Speed", "Self.Speed + 40"),
		setIv("Enemy", "Damage", "Self.Damage + 10"),
		setIv("Enemy", "AtkCD", "0.25"),
		A("Enemy", "set-scale", { scale: "1.9" }),
		A("Enemy", "set-default-color", { color: "rgbEx(140, 25, 20)" }),
		...spawnEnemyActions(POI.west[0], POI.west[1], 0),
		...spawnEnemyActions(POI.east[0], POI.east[1], 0),
		...spawnEnemyActions(POI.sw[0], POI.sw[1], 1),
		...spawnEnemyActions(POI.se[0], POI.se[1], 2),
		...fx("Enemy.X", "Enemy.Y", 180, "rgbEx(120, 20, 15)"),
		...msg(140, q("ФАЗА 2 — ЯРОСТЬ!"), "rgbEx(120, 20, 15)"),
	]),

	Comment("Босс фаза 2: периодический призыв аддов"),
	E([
		varIs("BossAlive", "=", 1), varIs("BossPhase", "=", 2), everySec(7),
		varIs("GameOver", "=", 0), cmp2("Enemy.Count", "<", 8),
	], [
		...spawnEnemyActions(`choose(${POI.north[0]}, ${POI.east[0]}, ${POI.west[0]})`, `choose(${POI.north[1]}, ${POI.south[1]}, ${POI.center[1]})`, 0),
		...msg(80, q("+адд"), "rgbEx(90, 40, 30)"),
	]),

	Comment("Босс: 1 гарант. ядро (не 3) + золото"),
	E([C("Enemy", "on-destroyed"), ivIs("Enemy", "IsBoss", "=", 1)], [
		setVar("BossAlive", 0),
		create("Core", "Game", "Enemy.X", "Enemy.Y - 20"),
		setIv("Core", "Kind", "choose(1, 2, 3)"),
		A("Core", "set-animation", { animation: `(Self.Kind = 1 ? "fire" : (Self.Kind = 2 ? "ice" : "shock"))`, from: "beginning" }),
		addVar("Gold", 30),
	]),

	Comment("Лёгкий реген вне кузницы"),
	E([everySec(5), varIs("GameOver", "=", 0), varIs("InForge", "=", 0)], [
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + 2)"),
	]),

]);

// ===== проект =====
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
		used("behavior", "scrollto", "Scroll To"),
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
		description: "Эхо-Рыцарь — роглайк: большие локации, корабль-хаб, стелс, шпионаж и спасение.",
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
/** Пакуем через Windows tar — тот же формат, что у рабочих .c3p в репо. */
const zipTmp = path.join(ROOT, "build", "EchoKnight.zip");
fs.rmSync(zipTmp, { force: true });
const top = fs.readdirSync(OUT_DIR);
// project.c3proj первым в списке аргументов
const ordered = ["project.c3proj", ...top.filter(n => n !== "project.c3proj")];
execFileSync("tar", ["-a", "-c", "-f", zipTmp, "-C", OUT_DIR, ...ordered]);
fs.copyFileSync(zipTmp, C3P);
try { fs.copyFileSync(C3P, path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "EchoKnight.c3p")); } catch (_) {}

console.log(`events: menu=${menuEvents}, game=${eventCount - menuEvents}, total=${eventCount}`);
console.log(`files: ${files.size}, c3p: ${C3P} (${fs.statSync(C3P).size} bytes)`);
