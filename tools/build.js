// Generates the Construct 3 project "Dota 2D: Farm Arena" as a project folder and a .c3p file.
// Usage: node tools/build.js
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const art = require("./art");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "build", "Dota2D");
const C3P = path.join(ROOT, "Dota2D.c3p");

// ---------- ids ----------
let sidCounter = 0;
const sid = () => 100000000000000 + ((sidCounter++ * 7919 + 12345) % 899999999999999);
let uidCounter = 0;
const uid = () => uidCounter++;
let imgCounter = 1000000;
const imgId = () => imgCounter++;

// ---------- files ----------
const files = new Map();
const writeJSON = (rel, obj) => files.set(rel, Buffer.from(JSON.stringify(obj, null, "\t")));
const writeBin = (rel, buf) => files.set(rel, buf);

// ---------- object types ----------
const objectTypes = [];

function frameJSON(canvas, origin) {
	return {
		width: canvas.w,
		height: canvas.h,
		originX: origin ? origin[0] : 0.5,
		originY: origin ? origin[1] : 0.5,
		originalSource: "",
		exportFormat: "lossless",
		exportQuality: 0.8,
		imageSpriteId: imgId(),
		useCollisionPoly: true,
		duration: 1,
		tag: "",
	};
}

function instVars(list) {
	return (list || []).map(([name, type]) => ({ name, type, desc: "", show: true, sid: sid() }));
}

function behaviorTypes(list) {
	return (list || []).map(([behaviorId, name]) => ({ behaviorId, name, sid: sid() }));
}

// anims: { AnimName: [canvas, canvas, ...] }
function sprite(name, anims, opts = {}) {
	const items = [];
	for (const [animName, frames] of Object.entries(anims)) {
		items.push({
			frames: frames.map((c, i) => {
				writeBin(`images/${name.toLowerCase()}-${animName.toLowerCase()}-${String(i).padStart(3, "0")}.png`, c.toPNG());
				return frameJSON(c, opts.origin);
			}),
			sid: sid(),
			name: animName,
			isLooping: false,
			isPingPong: false,
			repeatCount: 1,
			repeatTo: 0,
			speed: 0,
		});
	}
	const first = Object.values(anims)[0][0];
	objectTypes.push(name);
	writeJSON(`objectTypes/${name}.json`, {
		name,
		"plugin-id": "Sprite",
		sid: sid(),
		isGlobal: false,
		instanceVariables: instVars(opts.vars),
		behaviorTypes: behaviorTypes(opts.behaviors),
		effectTypes: [],
		animations: { items, subfolders: [] },
	});
	return { name, w: first.w, h: first.h, origin: opts.origin || [0.5, 0.5], firstAnim: Object.keys(anims)[0] };
}

function textType(name, opts = {}) {
	objectTypes.push(name);
	writeJSON(`objectTypes/${name}.json`, {
		name,
		"plugin-id": "Text",
		sid: sid(),
		isGlobal: false,
		instanceVariables: instVars(opts.vars),
		behaviorTypes: behaviorTypes(opts.behaviors),
		effectTypes: [],
	});
	return { name };
}

function tiledType(name, canvas) {
	objectTypes.push(name);
	writeBin(`images/${name.toLowerCase()}.png`, canvas.toPNG());
	writeJSON(`objectTypes/${name}.json`, {
		name,
		"plugin-id": "TiledBg",
		sid: sid(),
		isGlobal: false,
		instanceVariables: [],
		behaviorTypes: [],
		effectTypes: [],
		image: {
			width: canvas.w,
			height: canvas.h,
			originX: 0.5,
			originY: 0.5,
			originalSource: "",
			exportFormat: "lossless",
			exportQuality: 0.8,
			imageSpriteId: imgId(),
			useCollisionPoly: true,
			tag: "",
		},
	});
	return { name };
}

function singleGlobal(name, pluginId) {
	objectTypes.push(name);
	writeJSON(`objectTypes/${name}.json`, {
		name,
		"plugin-id": pluginId,
		sid: sid(),
		"singleglobal-inst": { type: name, properties: {}, uid: uid() },
	});
}

// ---------- instances ----------
const WHITE = [1, 1, 1, 1];

function world(x, y, w, h, origin) {
	return { x, y, width: w, height: h, originX: origin[0], originY: origin[1], color: WHITE, angle: 0, zElevation: 0 };
}

function spriteInst(t, x, y, opts = {}) {
	return {
		type: t.name,
		properties: {
			"initially-visible": opts.visible !== false,
			"initial-animation": opts.anim || t.firstAnim,
			"initial-frame": opts.frame || 0,
			"enable-collisions": true,
			"live-preview": false,
		},
		uid: uid(),
		instanceVariables: opts.vars || {},
		behaviors: opts.behaviors || {},
		world: world(x, y, opts.w || t.w, opts.h || t.h, t.origin),
	};
}

function rgb01(hexColor) {
	const s = hexColor.replace("#", "");
	return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255);
}

function textInst(t, x, y, w, h, text, opts = {}) {
	return {
		type: t.name,
		properties: {
			text,
			"enable-bbcode": false,
			font: "Arial",
			size: opts.size || 12,
			"line-height": 0,
			bold: opts.bold !== false,
			italic: false,
			color: [...rgb01(opts.color || "#ffffff"), 0],
			"horizontal-alignment": opts.align || "left",
			"vertical-alignment": opts.valign || "top",
			wrapping: "word",
			"text-direction": "ltr",
			"icon-set": -1,
			"initially-visible": opts.visible !== false,
			origin: "top-left",
			"read-aloud": false,
		},
		uid: uid(),
		instanceVariables: opts.vars || {},
		behaviors: opts.behaviors || {},
		world: world(x, y, w, h, [0, 0]),
	};
}

function tiledInst(t, x, y, w, h) {
	return {
		type: t.name,
		properties: {
			"initially-visible": true,
			origin: "top-left",
			"wrap-horizontal": "repeat",
			"wrap-vertical": "repeat",
			"image-offset-x": 0,
			"image-offset-y": 0,
			"image-scale-x": 1,
			"image-scale-y": 1,
			"image-angle": 0,
			"enable-tile-randomization": false,
			"x-random": 1,
			"y-random": 1,
			"angle-random": 1,
			"blend-margin-x": 0.1,
			"blend-margin-y": 0.1,
		},
		uid: uid(),
		instanceVariables: {},
		behaviors: {},
		world: world(x, y, w, h, [0, 0]),
	};
}

function layer(name, instances, opts = {}) {
	return {
		name,
		overriden: 0,
		subLayers: [],
		instances,
		sid: sid(),
		effectTypes: [],
		isInitiallyVisible: true,
		isInitiallyInteractive: true,
		isHTMLElementsLayer: false,
		color: WHITE,
		backgroundColor: [...rgb01(opts.bg || "#000000"), 1],
		isTransparent: !!opts.transparent,
		sampling: "auto",
		parallaxX: opts.parallax === 0 ? 0 : 1,
		parallaxY: opts.parallax === 0 ? 0 : 1,
		scaleRate: 1,
		forceOwnTexture: false,
		renderingMode: "2d",
		drawOrder: "z-order",
		useRenderCells: false,
		blendMode: "normal",
		zElevation: 0,
		global: false,
	};
}

const layouts = [];
function layout(name, eventSheet, layers) {
	layouts.push(name);
	writeJSON(`layouts/${name}.json`, {
		name,
		layers,
		sid: sid(),
		"nonworld-instances": [],
		effectTypes: [],
		width: 1280,
		height: 720,
		unboundedScrolling: false,
		sampling: "auto",
		vpX: 0.5,
		vpY: 0.5,
		projection: "orthographic",
		eventSheet,
	});
}

// ---------- event DSL ----------
const CMP = { "=": 0, "!=": 1, "<": 2, "<=": 3, ">": 4, ">=": 5 };
const q = s => JSON.stringify(s); // quote a string literal for Construct expressions

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
		functionName: name,
		functionDescription: "",
		functionCategory: "",
		functionReturnType: "none",
		functionCopyPicked: false,
		functionIsAsync: false,
		functionParameters: params.map(([pname, type]) => ({ name: pname, type, initialValue: type === "string" ? "" : "0", comment: "", sid: sid() })),
		eventType: "function-block",
		conditions: [],
		actions,
		sid: sid(),
		children,
	};
}
const Var = (name, type, initialValue) => ({ eventType: "variable", name, type, initialValue: String(initialValue), comment: "", isStatic: false, isConstant: false, sid: sid() });
const Comment = text => ({ eventType: "comment", text });

// common condition/action helpers
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
const KEY = { Q: 81, W: 87, R: 82, P: 80 };

// ======================================================================
// Object types
// ======================================================================
singleGlobal("Mouse", "Mouse");
singleGlobal("Keyboard", "Keyboard");

const Hero = sprite("Hero", { SF: [art.sf()], AM: [art.am()], JUGG: [art.jugg()] }, {
	vars: [["HP", "number"], ["MaxHP", "number"], ["Damage", "number"], ["AtkTime", "number"], ["AtkCD", "number"], ["Range", "number"], ["Armor", "number"], ["Regen", "number"]],
	behaviors: [["MoveTo", "MoveTo"], ["bound", "BoundToLayout"], ["Timer", "Timer"], ["Rotate", "Rotate"], ["Flash", "Flash"]],
});
const Creep = sprite("Creep", { melee: [art.creepMelee()], ranged: [art.creepRanged()] }, {
	vars: [["HP", "number"], ["MaxHP", "number"], ["Damage", "number"], ["Bounty", "number"], ["AtkCD", "number"], ["Range", "number"], ["Speed", "number"], ["Type", "string"]],
	behaviors: [["Bullet", "Bullet"]],
});
const HeroBullet = sprite("HeroBullet", { Default: [art.heroBullet()] }, { behaviors: [["Bullet", "Bullet"], ["destroy", "DestroyOutsideLayout"]] });
const CreepBullet = sprite("CreepBullet", { Default: [art.creepBullet()] }, { behaviors: [["Bullet", "Bullet"], ["destroy", "DestroyOutsideLayout"]] });
const Fx = sprite("Fx", { Default: [art.ring()] }, { behaviors: [["Fade", "Fade"]] });
const HPBack = sprite("HPBarBack", { Default: [art.solid("#14161a")] }, { origin: [0, 0] });
const HPBar = sprite("HPBar", { Default: [art.solid("#3fd34a")] }, { origin: [0, 0] });
const ShopButton = sprite("ShopButton", { Default: [0, 1, 2, 3, 4, 5, 6].map(i => art.shopIcon(i)) }, {
	vars: [["ItemID", "number"], ["Cost", "number"], ["ItemName", "string"], ["ItemDesc", "string"]],
});
const HeroCard = sprite("HeroCard", { Default: [art.cardSF(), art.cardAM(), art.cardJugg()] }, {
	vars: [["HeroID", "string"], ["Desc", "string"]],
});
const Ground = tiledType("Ground", art.grass());

const FloatText = textType("FloatText", { behaviors: [["Bullet", "Bullet"], ["Fade", "Fade"]] });
const MsgText = textType("MsgText", { behaviors: [["Fade", "Fade"]] });
const StatsText = textType("StatsText");
const AbilityText = textType("AbilityText");
const TooltipText = textType("TooltipText");
const GameOverText = textType("GameOverText");
const PauseText = textType("PauseText");
const Label = textType("Label");
const InfoText = textType("InfoText");

// ======================================================================
// Layouts
// ======================================================================
const HEROES = [
	["SF", "Shadow Fiend", "Shadow Fiend — дальний бой. За каждого добитого крипа получает душу (до 20), каждая душа даёт +2 урона.\nQ — Requiem of Souls: взрыв душ вокруг героя.  W — Shadowraze: удар в точку в сторону курсора."],
	["AM", "Anti-Mage", "Anti-Mage — ближний бой, очень быстрые удары. Mana Break: каждый удар снимает 6% макс. HP крипа.\nQ — Blink: телепорт к курсору (до 450).  W — Mana Void: огромный урон по крипу у курсора."],
	["JUGG", "Juggernaut", "Juggernaut — ближний бой, 25% шанс критического удара x2.2.\nQ — Blade Fury: 3 секунды вращения, урон вокруг и неуязвимость.  W — Healing Ward: лечит 35% HP."],
];

layout("Menu", "Menu_ev", [
	layer("Menu", [
		textInst(Label, 0, 40, 1280, 70, "DOTA 2D: ФАРМ АРЕНА", { size: 34, align: "center", color: "#ffcc4d" }),
		textInst(Label, 0, 105, 1280, 30, "Выбери героя — наведи мышку, чтобы прочитать описание, и кликни", { size: 13, align: "center", color: "#c8ccd4", bold: false }),
		...HEROES.map(([id, , desc], i) => spriteInst(HeroCard, 340 + i * 300, 330, { frame: i, vars: { HeroID: id, Desc: desc } })),
		...HEROES.map(([, name], i) => textInst(Label, 340 + i * 300 - 120, 445, 240, 30, name, { size: 16, align: "center" })),
		textInst(InfoText, 190, 500, 900, 120, "", { size: 13, align: "center", color: "#e6e6e6", bold: false }),
		textInst(Label, 0, 660, 1280, 30, "ПКМ — идти · автоатака · Q / W — способности · 1–7 — покупка · P — пауза · R — в меню", { size: 11, align: "center", color: "#8a909c", bold: false }),
	], { bg: "#14161c" }),
]);

const ITEMS = [
	["Healing Salve", 110, "Мгновенно лечит 450 HP"],
	["Blades of Attack", 450, "+15 к урону"],
	["Boots of Speed", 500, "+60 к скорости движения"],
	["Chainmail", 550, "+5 брони"],
	["Vitality Booster", 1000, "+400 к максимальному HP"],
	["Hyperstone", 2000, "Атаки на 20% быстрее"],
	["Divine Rapier", 6000, "+300 к урону"],
];

const fadeProps = (wait, out) => ({ properties: { "fade-in-time": 0, "wait-time": wait, "fade-out-time": out, destroy: true, enabled: true, "live-preview": false } });
const bulletProps = (speed, setAngle) => ({ properties: { speed, acceleration: 0, gravity: 0, "bounce-off-solids": false, "set-angle": setAngle, step: false, enabled: true } });

layout("Game", "Game_ev", [
	layer("Game", [
		tiledInst(Ground, 0, 0, 1280, 720),
		spriteInst(Hero, 640, 360, {
			vars: { HP: 1000, MaxHP: 1000, Damage: 40, AtkTime: 1, AtkCD: 0, Range: 120, Armor: 0, Regen: 0 },
			behaviors: {
				MoveTo: { properties: { "max-speed": 240, acceleration: 3000, deceleration: 3000, "rotate-speed": 0, "set-angle": true, "stop-on-solids": false, enabled: true } },
				BoundToLayout: { properties: { "bound-by": "edge", region: "layout" } },
				Timer: { properties: {} },
				Rotate: { properties: { speed: 1080, acceleration: 0, "rotation-type": "2d", enabled: false } },
				Flash: { properties: { enabled: true } },
			},
		}),
		spriteInst(Fx, -300, -300, { w: 10, h: 10, behaviors: { Fade: fadeProps(0, 0.45) } }),
		spriteInst(Creep, -500, -500, { vars: { HP: 1, MaxHP: 1, Damage: 0, Bounty: 0, AtkCD: 1, Range: 55, Speed: 85, Type: "melee" }, behaviors: { Bullet: bulletProps(0, false) } }),
		spriteInst(HeroBullet, -500, -400, { behaviors: { Bullet: bulletProps(750, true), DestroyOutsideLayout: { properties: { region: "layout" } } } }),
		spriteInst(CreepBullet, -500, -300, { behaviors: { Bullet: bulletProps(380, true), DestroyOutsideLayout: { properties: { region: "layout" } } } }),
		textInst(FloatText, -300, -200, 120, 24, "0", { size: 12, behaviors: { Bullet: bulletProps(55, false), Fade: fadeProps(0.25, 0.6) } }),
	], { bg: "#355f2a" }),
	layer("HUD", [
		textInst(StatsText, 12, 10, 520, 110, "", { size: 12 }),
		spriteInst(HPBack, 486, 676, { w: 308, h: 26 }),
		spriteInst(HPBar, 490, 680, { w: 300, h: 18 }),
		textInst(AbilityText, 300, 640, 680, 30, "", { size: 12, align: "center" }),
		textInst(Label, 828, 588, 440, 20, "МАГАЗИН (клавиши 1–7, или клик)", { size: 10, color: "#ffcc4d" }),
		...ITEMS.map(([name, cost, desc], i) => spriteInst(ShopButton, 856 + i * 62, 640, { w: 56, h: 56, frame: i, vars: { ItemID: i + 1, Cost: cost, ItemName: name, ItemDesc: desc } })),
		...ITEMS.map(([, cost], i) => textInst(Label, 828 + i * 62, 670, 56, 18, `${i + 1}: ${cost}`, { size: 9, align: "center", color: "#ffd84a" })),
		textInst(TooltipText, 828, 530, 440, 56, "", { size: 11, color: "#ffffff" }),
		textInst(GameOverText, 240, 230, 800, 240, "", { size: 22, align: "center", color: "#ff5a4a", visible: false }),
		textInst(PauseText, 440, 320, 400, 60, "ПАУЗА", { size: 28, align: "center", color: "#ffffff", visible: false }),
		textInst(MsgText, -900, -300, 700, 40, "", { size: 20, align: "center", color: "#ffcc4d", behaviors: { Fade: fadeProps(1, 0.8) } }),
	], { transparent: true, parallax: 0 }),
]);

// ======================================================================
// Event sheets
// ======================================================================
const eventSheets = [];
function sheet(name, events) {
	eventSheets.push(name);
	writeJSON(`eventSheets/${name}.json`, { name, events, sid: sid() });
}

// ---------------- Menu (3 events) ----------------
sheet("Menu_ev", [
	Comment("Меню выбора героя. Глобальные переменные объявлены в листе Game_ev."),
	E([sys("every-tick")], [A("HeroCard", "set-opacity", { opacity: "60" })]),
	E([C("Mouse", "cursor-is-over-object", { object: "HeroCard" })], [
		A("HeroCard", "set-opacity", { opacity: "100" }),
		A("InfoText", "set-text", { text: "HeroCard.Desc" }),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "HeroCard" })], [
		setVar("HeroType", "HeroCard.HeroID"),
		A("System", "go-to-layout", { layout: "Game" }),
	]),
]);
const menuEvents = eventCount;

// ---------------- Game ----------------
const heroName = `(HeroType = "SF" ? "Shadow Fiend" : (HeroType = "AM" ? "Anti-Mage" : "Juggernaut"))`;
const qName = `(HeroType = "SF" ? "Requiem of Souls" : (HeroType = "AM" ? "Blink" : "Blade Fury"))`;
const wName = `(HeroType = "SF" ? "Shadowraze" : (HeroType = "AM" ? "Mana Void" : "Healing Ward"))`;
const cd = v => `(${v} > 0 ? ceil(${v}) & "с" : "ГОТОВО")`;
const distHC = "distance(Hero.X, Hero.Y, Creep.X, Creep.Y)";
const mouseAngle = "angle(Hero.X, Hero.Y, Mouse.X, Mouse.Y)";

const heroStats = (id, hp, dmg, atk, range, armor, regen, speed) =>
	E([varIs("HeroType", "=", q(id))], [
		setIv("Hero", "MaxHP", hp),
		setIv("Hero", "HP", hp),
		setIv("Hero", "Damage", dmg),
		setIv("Hero", "AtkTime", atk),
		setIv("Hero", "Range", range),
		setIv("Hero", "Armor", armor),
		setIv("Hero", "Regen", regen),
		A("Hero", "set-max-speed", { "max-speed": String(speed) }, "MoveTo"),
	]);

sheet("Game_ev", [
	Comment("Dota 2D: Фарм Арена. Герой в центре, крипы идут волнами с краёв карты. Ровно 50 событий на весь проект."),
	Var("HeroType", "string", "SF"),
	Var("Gold", "number", 600),
	Var("Wave", "number", 1),
	Var("Kills", "number", 0),
	Var("CreepHP", "number", 320),
	Var("CreepDmg", "number", 18),
	Var("CreepsPerWave", "number", 3),
	Var("SpawnInterval", "number", 5),
	Var("MegaCreeps", "number", 0),
	Var("Souls", "number", 0),
	Var("MaxSouls", "number", 20),
	Var("QCD", "number", 0),
	Var("WCD", "number", 0),
	Var("BladeFury", "number", 0),
	Var("RequiemDmg", "number", 0),
	Var("PointX", "number", 0),
	Var("PointY", "number", 0),
	Var("GameOver", "number", 0),
	Var("BestWave", "number", 0),

	Comment("Старт игры: сброс переменных и характеристики выбранного героя"),
	E([sys("on-start-of-layout")], [
		setVar("Gold", 600), setVar("Wave", 1), setVar("Kills", 0), setVar("CreepHP", 320), setVar("CreepDmg", 18),
		setVar("CreepsPerWave", 3), setVar("SpawnInterval", 5), setVar("MegaCreeps", 0), setVar("Souls", 0),
		setVar("QCD", 0), setVar("WCD", 0), setVar("BladeFury", 0), setVar("GameOver", 0),
		A("System", "set-time-scale", { "time-scale": "1" }),
		A("Hero", "set-animation", { animation: "HeroType", from: "beginning" }),
		A("Creep", "destroy"),
	], [
		heroStats("SF", 1100, 46, 1.0, 380, 2, 4, 230),
		heroStats("AM", 1250, 52, 0.7, 120, 4, 5, 270),
		heroStats("JUGG", 1400, 50, 0.85, 120, 3, 7, 250),
	]),

	Comment("Движение как в Доте: правая кнопка мыши"),
	E([C("Mouse", "on-click", { "mouse-button": "right", "click-type": "clicked" }), varIs("GameOver", "=", 0)], [
		A("Hero", "move-to-position", { x: "Mouse.X", y: "Mouse.Y", mode: "direct" }, "MoveTo"),
	]),

	Comment("Каждый тик: откаты, интерфейс, движение крипов к герою, расширение эффектов"),
	E([sys("every-tick")], [
		subIv("Hero", "AtkCD", "dt"),
		subIv("Creep", "AtkCD", "dt"),
		setVar("QCD", "max(0, QCD - dt)"),
		setVar("WCD", "max(0, WCD - dt)"),
		A("Creep", "set-angle-toward-position", { x: "Hero.X", y: "Hero.Y" }),
		A("Creep", "set-angle-of-motion", { angle: "Self.Angle" }, "Bullet"),
		A("Creep", "set-speed", { speed: "distance(Self.X, Self.Y, Hero.X, Hero.Y) > Self.Range ? Self.Speed : 0" }, "Bullet"),
		A("Fx", "set-size", { width: "Self.Width + 900 * dt", height: "Self.Height + 900 * dt" }),
		A("HPBar", "set-width", { width: "300 * max(0, Hero.HP) / Hero.MaxHP" }),
		A("StatsText", "set-text", {
			text: `${heroName} & newline & "Золото: " & floor(Gold) & "     Убито крипов: " & Kills & newline & "Волна: " & Wave & (MegaCreeps = 1 ? "   [МЕГА-КРИПЫ]" : "") & newline & "Урон: " & round(Hero.Damage + Souls * 2) & "   Броня: " & Hero.Armor & "   Атак в сек: " & round(10 / Hero.AtkTime) / 10 & (HeroType = "SF" ? newline & "Души: " & Souls & " / " & MaxSouls : "")`,
		}),
		A("AbilityText", "set-text", {
			text: `"HP " & ceil(max(0, Hero.HP)) & " / " & Hero.MaxHP & "        Q " & ${qName} & ": " & ${cd("QCD")} & "      W " & ${wName} & ": " & ${cd("WCD")}`,
		}),
		A("TooltipText", "set-text", { text: q("") }),
	]),

	Comment("Регенерация и пассивное золото раз в секунду"),
	E([everySec(1), varIs("GameOver", "=", 0)], [setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + Hero.Regen)")]),
	E([everySec(1), varIs("GameOver", "=", 0)], [addVar("Gold", "2 + floor(Wave / 2)")]),

	Comment("Спавн пачки крипов с левого и правого края"),
	E([sys("every-x-seconds", { "interval-seconds": "SpawnInterval" }), varIs("GameOver", "=", 0)], [], [
		E([sys("repeat", { count: "CreepsPerWave" })], [
			create("Creep", "Game", "choose(-40, LayoutWidth + 40)", "random(60, LayoutHeight - 60)"),
			setIv("Creep", "Type", `choose("melee", "melee", "ranged")`),
			A("Creep", "set-animation", { animation: "Self.Type", from: "beginning" }),
			setIv("Creep", "MaxHP", `CreepHP * (Self.Type = "melee" ? 1 : 0.7)`),
			setIv("Creep", "HP", "Self.MaxHP"),
			setIv("Creep", "Damage", `CreepDmg * (Self.Type = "melee" ? 1 : 0.8)`),
			setIv("Creep", "Bounty", "floor(random(36, 46)) + Wave * 2"),
			setIv("Creep", "Range", `Self.Type = "melee" ? 55 : 260`),
			setIv("Creep", "Speed", "85 + Wave * 2"),
			setIv("Creep", "AtkCD", 1),
		], [
			E([varIs("MegaCreeps", "=", 1)], [
				A("Creep", "set-scale", { scale: "1.35" }),
				setIv("Creep", "MaxHP", "Self.MaxHP * 2.2"),
				setIv("Creep", "HP", "Self.MaxHP"),
				setIv("Creep", "Damage", "Self.Damage * 1.6"),
				setIv("Creep", "Bounty", "floor(Self.Bounty * 0.75)"),
				A("Creep", "set-default-color", { color: "rgbEx(100, 80, 45)" }),
			]),
		]),
	]),

	Comment("Каждые 30 секунд крипы сильнее, их больше; с 10-й волны идут мега-крипы"),
	E([everySec(30), varIs("GameOver", "=", 0)], [
		addVar("Wave", 1),
		setVar("CreepHP", "CreepHP * 1.13"),
		setVar("CreepDmg", "CreepDmg * 1.1"),
		setVar("CreepsPerWave", "min(12, CreepsPerWave + 1)"),
		setVar("SpawnInterval", "max(2.5, SpawnInterval - 0.25)"),
		...msg(140, `"Волна " & Wave`, "rgbEx(100, 80, 30)"),
	]),
	E([varIs("Wave", ">=", 10), sys("trigger-once-while-true")], [
		setVar("MegaCreeps", 1),
		...msg(190, q("МЕГА-КРИПЫ!"), "rgbEx(100, 30, 20)"),
	]),

	Comment("Автоатака ближайшего крипа"),
	E([
		ivIs("Hero", "AtkCD", "<=", 0),
		varIs("BladeFury", "=", 0),
		varIs("GameOver", "=", 0),
		C("Creep", "pick-nearestfurthest", { which: "nearest", x: "Hero.X", y: "Hero.Y", z: "0", "pick-all-tied": false }),
		cmp2(distHC, "<=", "Hero.Range + 20"),
	], [setIv("Hero", "AtkCD", "Hero.AtkTime")], [
		E([varIs("HeroType", "=", q("SF"))], [
			A("Hero", "spawn-another-object", { object: "HeroBullet", layer: q("Game"), "image-point": "0", "create-hierarchy": false, "template-name": q("") }),
			A("HeroBullet", "set-angle-of-motion", { angle: "angle(Hero.X, Hero.Y, Creep.X, Creep.Y)" }, "Bullet"),
			A("HeroBullet", "set-speed", { speed: "750" }, "Bullet"),
		]),
		E([varIs("HeroType", "=", q("AM"))], [Call("DamageCreep", "Creep.UID", "Hero.Damage + Creep.MaxHP * 0.06")]),
		E([varIs("HeroType", "=", q("JUGG"))], [Call("DamageCreep", "Creep.UID", "random(100) < 25 ? Hero.Damage * 2.2 : Hero.Damage")]),
	]),
	E([C("HeroBullet", "on-collision-with-another-object", { object: "Creep" })], [
		Call("DamageCreep", "Creep.UID", "Hero.Damage + Souls * 2"),
		A("HeroBullet", "destroy"),
	]),

	Comment("Урон по крипу. Кто добил — тот получил золото (и душу для Shadow Fiend)"),
	Fn("DamageCreep", [["TargetUID", "number"], ["Amount", "number"]], [], [
		E([C("Creep", "pick-by-unique-id", { "unique-id": "TargetUID" })], [
			subIv("Creep", "HP", "Amount"),
			...floatText("Creep.X + random(-12, 12)", "Creep.Y - 30", "round(Amount)", "rgbEx(100, 100, 100)"),
		], [
			E([ivIs("Creep", "HP", "<=", 0)], [
				addVar("Gold", "Creep.Bounty"),
				addVar("Kills", 1),
				setVar("Souls", `HeroType = "SF" ? min(MaxSouls, Souls + 1) : 0`),
				...floatText("Creep.X", "Creep.Y - 50", `"+" & Creep.Bounty`, "rgbEx(100, 85, 10)"),
				...fx("Creep.X", "Creep.Y", 30, "rgbEx(100, 85, 30)"),
				A("Creep", "destroy"),
			]),
		]),
	]),

	Comment("Атака крипов: ближние бьют, дальние стреляют"),
	E([
		ivIs("Creep", "AtkCD", "<=", 0),
		varIs("GameOver", "=", 0),
		pickBy("Creep", "distance(Creep.X, Creep.Y, Hero.X, Hero.Y)", "<=", "Creep.Range + 15"),
		forEach("Creep"),
	], [setIv("Creep", "AtkCD", `Creep.Type = "melee" ? 1 : 1.6`)], [
		E([ivIs("Creep", "Type", "=", q("melee"))], [Call("DamageHero", "Creep.Damage")]),
		E([sys("else")], [
			A("Creep", "spawn-another-object", { object: "CreepBullet", layer: q("Game"), "image-point": "0", "create-hierarchy": false, "template-name": q("") }),
			A("CreepBullet", "set-angle-of-motion", { angle: "angle(Creep.X, Creep.Y, Hero.X, Hero.Y)" }, "Bullet"),
			A("CreepBullet", "set-speed", { speed: "380" }, "Bullet"),
		]),
	]),
	E([C("CreepBullet", "on-collision-with-another-object", { object: "Hero" })], [
		Call("DamageHero", "CreepDmg * 0.75"),
		A("CreepBullet", "destroy"),
	]),

	Comment("Урон по герою с учётом брони (формула из Доты)"),
	Fn("DamageHero", [["Amount", "number"]], [], [
		E([varIs("BladeFury", "=", 0), varIs("GameOver", "=", 0)], [
			subIv("Hero", "HP", "Amount * (1 - (0.06 * Hero.Armor) / (1 + 0.06 * Hero.Armor))"),
			A("Hero", "flash", { "on-time": "0.05", "off-time": "0.05", duration: "0.15" }, "Flash"),
		]),
	]),
	E([ivIs("Hero", "HP", "<=", 0), sys("trigger-once-while-true")], [
		setVar("GameOver", 1),
		setVar("BestWave", "max(BestWave, Wave)"),
		A("Hero", "stop", null, "MoveTo"),
		A("GameOverText", "set-visible", { visibility: "visible" }),
		A("GameOverText", "set-text", { text: `"ПОРАЖЕНИЕ!" & newline & newline & "Волна: " & Wave & "     Убито крипов: " & Kills & newline & "Рекорд волны: " & BestWave & newline & newline & "Нажми R, чтобы выбрать героя заново"` }),
		A("System", "set-time-scale", { "time-scale": "0" }),
	]),
	E([key(KEY.R)], [A("System", "go-to-layout", { layout: "Menu" })]),

	Comment("Shadow Fiend: Q — Requiem of Souls (взрыв душ), W — Shadowraze"),
	E([key(KEY.Q), varIs("HeroType", "=", q("SF")), varIs("QCD", "<=", 0), varIs("Souls", ">", 0), varIs("GameOver", "=", 0)], [
		setVar("RequiemDmg", "120 + Souls * 28"),
		setVar("Souls", "floor(Souls / 2)"),
		setVar("QCD", 18),
		...fx("Hero.X", "Hero.Y", 100, "rgbEx(100, 15, 10)"),
	], [
		E([pickBy("Creep", distHC, "<=", 480), forEach("Creep")], [Call("DamageCreep", "Creep.UID", "RequiemDmg")]),
	]),
	E([key(KEY.W), varIs("HeroType", "=", q("SF")), varIs("WCD", "<=", 0), varIs("GameOver", "=", 0)], [
		setVar("PointX", `Hero.X + cos(${mouseAngle}) * 200`),
		setVar("PointY", `Hero.Y + sin(${mouseAngle}) * 200`),
		setVar("WCD", 3),
		...fx("PointX", "PointY", 110, "rgbEx(100, 45, 10)"),
	], [
		E([pickBy("Creep", "distance(Creep.X, Creep.Y, PointX, PointY)", "<=", 130), forEach("Creep")], [Call("DamageCreep", "Creep.UID", "90 + Souls * 12")]),
	]),

	Comment("Anti-Mage: Q — Blink к курсору, W — Mana Void по крипу у курсора"),
	E([key(KEY.Q), varIs("HeroType", "=", q("AM")), varIs("QCD", "<=", 0), varIs("GameOver", "=", 0)], [
		...fx("Hero.X", "Hero.Y", 70, "rgbEx(60, 30, 100)"),
		setVar("PointX", `Hero.X + cos(${mouseAngle}) * min(450, distance(Hero.X, Hero.Y, Mouse.X, Mouse.Y))`),
		setVar("PointY", `Hero.Y + sin(${mouseAngle}) * min(450, distance(Hero.X, Hero.Y, Mouse.X, Mouse.Y))`),
		A("Hero", "set-position", { x: "PointX", y: "PointY" }),
		A("Hero", "stop", null, "MoveTo"),
		...fx("Hero.X", "Hero.Y", 70, "rgbEx(60, 30, 100)"),
		setVar("QCD", 5),
	]),
	E([key(KEY.W), varIs("HeroType", "=", q("AM")), varIs("WCD", "<=", 0), varIs("GameOver", "=", 0),
		C("Creep", "pick-nearestfurthest", { which: "nearest", x: "Mouse.X", y: "Mouse.Y", z: "0", "pick-all-tied": false })], [
		setVar("WCD", 20),
		...fx("Creep.X", "Creep.Y", 150, "rgbEx(30, 50, 100)"),
		Call("DamageCreep", "Creep.UID", "(Creep.MaxHP - Creep.HP) * 1.6 + 180"),
	]),

	Comment("Juggernaut: Q — Blade Fury, W — Healing Ward"),
	E([key(KEY.Q), varIs("HeroType", "=", q("JUGG")), varIs("QCD", "<=", 0), varIs("GameOver", "=", 0)], [
		setVar("BladeFury", 1),
		setVar("QCD", 16),
		A("Hero", "set-enabled", { state: "enabled" }, "Rotate"),
		A("Hero", "start-timer", { duration: "3", type: "once", tag: q("fury") }, "Timer"),
		...fx("Hero.X", "Hero.Y", 120, "rgbEx(100, 60, 20)"),
	]),
	E([varIs("BladeFury", "=", 1), everySec(0.25)], [], [
		E([pickBy("Creep", distHC, "<=", 170), forEach("Creep")], [Call("DamageCreep", "Creep.UID", "28 + Wave * 5")]),
	]),
	E([C("Hero", "on-timer", { tag: q("fury") }, { behavior: "Timer" })], [
		setVar("BladeFury", 0),
		A("Hero", "set-enabled", { state: "disabled" }, "Rotate"),
		A("Hero", "set-angle", { angle: "0" }),
	]),
	E([key(KEY.W), varIs("HeroType", "=", q("JUGG")), varIs("WCD", "<=", 0), varIs("GameOver", "=", 0)], [
		setIv("Hero", "HP", "min(Hero.MaxHP, Hero.HP + Hero.MaxHP * 0.35)"),
		setVar("WCD", 22),
		...fx("Hero.X", "Hero.Y", 130, "rgbEx(30, 100, 40)"),
		...floatText("Hero.X", "Hero.Y - 60", q("+HP"), "rgbEx(30, 100, 40)"),
	]),

	Comment("Магазин предметов"),
	Fn("BuyItem", [["ItemID", "number"], ["Cost", "number"], ["ItemName", "string"]], [], [
		E([varIs("Gold", ">=", "Cost")], [
			A("System", "subtract-from-eventvar", { variable: "Gold", value: "Cost" }),
			setIv("Hero", "HP", "ItemID = 1 ? min(Hero.MaxHP, Hero.HP + 450) : Hero.HP"),
			addIv("Hero", "Damage", "ItemID = 2 ? 15 : (ItemID = 7 ? 300 : 0)"),
			A("Hero", "set-max-speed", { "max-speed": "Hero.MoveTo.MaxSpeed + (ItemID = 3 ? 60 : 0)" }, "MoveTo"),
			addIv("Hero", "Armor", "ItemID = 4 ? 5 : 0"),
			addIv("Hero", "MaxHP", "ItemID = 5 ? 400 : 0"),
			addIv("Hero", "HP", "ItemID = 5 ? 400 : 0"),
			setIv("Hero", "AtkTime", "ItemID = 6 ? max(0.25, Hero.AtkTime * 0.8) : Hero.AtkTime"),
			...msg(560, `"Куплено: " & ItemName`, "rgbEx(40, 100, 40)"),
		]),
		E([sys("else")], [...msg(560, `"Не хватает золота на " & ItemName`, "rgbEx(100, 30, 30)")]),
	]),
	E([C("Mouse", "on-object-clicked", { "mouse-button": "left", "click-type": "clicked", "object-clicked": "ShopButton" }), varIs("GameOver", "=", 0)], [
		Call("BuyItem", "ShopButton.ItemID", "ShopButton.Cost", "ShopButton.ItemName"),
	]),
	E([C("Keyboard", "on-any-key-pressed"), varIs("GameOver", "=", 0), pickBy("ShopButton", "ShopButton.ItemID", "=", "Keyboard.LastKeyCode - 48")], [
		Call("BuyItem", "ShopButton.ItemID", "ShopButton.Cost", "ShopButton.ItemName"),
	]),
	E([C("Mouse", "cursor-is-over-object", { object: "ShopButton" })], [
		A("TooltipText", "set-text", { text: `ShopButton.ItemName & " — " & ShopButton.Cost & " золота" & newline & ShopButton.ItemDesc` }),
	]),

	Comment("Пауза"),
	E([key(KEY.P), varIs("GameOver", "=", 0)], [
		A("System", "set-time-scale", { "time-scale": "timescale = 0 ? 1 : 0" }),
		A("PauseText", "set-visible", { visibility: "toggle" }),
	]),
]);

// ======================================================================
// Project file
// ======================================================================
const used = (type, id, name) => ({ type, id, name, author: "Scirra", bundled: false });
const icons = ["icon-16.png", "icon-32.png", "icon-114.png", "icon-128.png", "icon-256.png", "loading-logo.png"];
const iconDir = path.join(__dirname, "ex", "spell-caster", "icons");
for (const ic of icons) writeBin(`icons/${ic}`, fs.readFileSync(path.join(iconDir, ic)));

writeJSON("project.c3proj", {
	projectFormatVersion: 1,
	savedWithRelease: 39000,
	name: "Dota 2D Farm Arena",
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
		used("behavior", "Fade", "Fade"),
		used("behavior", "Flash", "Flash"),
		used("behavior", "MoveTo", "Move to"),
		used("behavior", "Rotate", "Rotate"),
		used("behavior", "Timer", "Timer"),
		used("behavior", "bound", "Bound to layout"),
		used("behavior", "destroy", "Destroy outside layout"),
	],
	uniqueId: "d2farm" + Math.floor(Math.random() * 1e5).toString(36),
	objectTypes: { items: objectTypes, subfolders: [] },
	autosaveData: null,
	containers: [],
	families: { items: [], subfolders: [] },
	layouts: { items: layouts, subfolders: [] },
	eventSheets: { items: eventSheets, subfolders: [] },
	rootFileFolders: {
		script: { items: [], subfolders: [] },
		sound: { items: [], subfolders: [] },
		music: { items: [], subfolders: [] },
		video: { items: [], subfolders: [] },
		font: { items: [], subfolders: [] },
		icon: {
			items: icons.map(name => ({ name, type: "image/png", sid: sid(), "icon-info": { purpose: name === "loading-logo.png" ? "loading-logo" : "app-icon" } })),
			subfolders: [],
		},
		general: { items: [], subfolders: [] },
	},
	timelines: { items: [], subfolders: [] },
	flowcharts: { items: [], subfolders: [] },
	properties: {
		description: "2D Dota-like farm arena: pick a hero, last-hit creep waves, buy items.",
		version: "1.0.0.0",
		author: "",
		authorEmail: "",
		authorWebsite: "",
		appId: "com.example.dota2dfarm",
		pixelRounding: false,
		zAxisScale: "normalized",
		fov: 0.7853981633974483,
		useLoaderLayout: false,
		fullscreenMode: "letterbox-scale",
		fullscreenQuality: "high",
		viewportFit: "auto",
		backgroundColor: [0, 0, 0, 0],
		splashColor: [1, 1, 1, 0],
		useThemeColor: false,
		themeColor: [1, 1, 1, 0],
		orientations: "landscape",
		webgpu: "auto",
		gpuPreference: "high-performance",
		scriptsType: "module",
		framerateMode: "vsync",
		sampling: "nearest",
		downscaling: "medium",
		renderingMode: "auto",
		anisotropicFiltering: "auto",
		zNear: 1,
		zFar: 10000,
		maxSpriteSheetSize: 2048,
		loaderStyle: "splash",
		preloadSounds: true,
		cordovaiOSScheme: "app",
		cordovaAndroidScheme: "https",
		autoReloadScriptsOnPreview: false,
		exportFileStructure: "folders",
		uidAllocationMode: "increment",
	},
	viewportWidth: 1280,
	viewportHeight: 720,
	firstLayout: "Menu",
});

// ======================================================================
// Write folder + .c3p
// ======================================================================
fs.rmSync(OUT_DIR, { recursive: true, force: true });
for (const [rel, buf] of files) {
	const p = path.join(OUT_DIR, rel);
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, buf);
}
const zipTmp = path.join(ROOT, "build", "Dota2D.zip");
fs.rmSync(zipTmp, { force: true });
execFileSync("tar", ["-a", "-c", "-f", zipTmp, "-C", OUT_DIR, ...fs.readdirSync(OUT_DIR)]);
fs.copyFileSync(zipTmp, C3P);

console.log(`events: menu=${menuEvents}, game=${eventCount - menuEvents}, total=${eventCount}`);
console.log(`files: ${files.size}, c3p: ${C3P} (${fs.statSync(C3P).size} bytes)`);
