// Пиксель-арт для Эхо-Рыцаря
const { Canvas } = require("./png");

function outlineScale(c, s = 3) {
	return c.outline().scale(s);
}

function knight() {
	const c = new Canvas(22, 22);
	c.ellipse(10, 12, 7, 9, "#2a3a4a");
	c.ellipse(10, 12, 6, 8, "#3d5a73");
	c.disc(11, 10, 4, "#c9a27e");
	c.ellipse(11, 9, 3.5, 2.5, "#2f3d4a");
	c.set(12, 10, "#7fd6ff");
	c.set(13, 10, "#bfefff");
	c.rect(15, 11, 6, 2, "#d4d8de");
	c.rect(19, 10, 2, 4, "#8a93a0");
	c.disc(8, 18, 2, "#1e2a35");
	c.disc(13, 18, 2, "#1e2a35");
	return outlineScale(c);
}

function slime() {
	return meleeFoe();
}
function bat() {
	return shooterFoe();
}

/** Палитры слоёв: 1 лес · 2 луна · 3 марс · 4 гроза · 5 лёд · 6 бездна. */
const LAYER_SKIN = {
	1: { body: "#1a4a28", body2: "#2f8a45", head: "#3a6a30", accent: "#5a3a18", metal: "#8a5a28", eye: "#103020", glow: "#7ec8ff" },
	2: { body: "#6a6a72", body2: "#9a9aa4", head: "#b0b0b8", accent: "#5a5a62", metal: "#d0d0d8", eye: "#2a2a30", glow: "#ffffff" },
	3: { body: "#6a2820", body2: "#c05038", head: "#e07050", accent: "#5a2018", metal: "#e8a090", eye: "#301010", glow: "#ffccaa" },
	4: { body: "#2a1848", body2: "#6a40a0", head: "#8a60c0", accent: "#4a2080", metal: "#d08cff", eye: "#1a0830", glow: "#e0a0ff" },
	5: { body: "#1a3a5a", body2: "#4a90c0", head: "#a0d8f0", accent: "#2a6080", metal: "#e0f4ff", eye: "#0a2030", glow: "#ffffff" },
	6: { body: "#1a1028", body2: "#4a2868", head: "#6a3890", accent: "#301848", metal: "#c070ff", eye: "#0a0418", glow: "#ff60c0" },
};

/** Melee — страж слоя. */
function meleeFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(18, 18);
	c.ellipse(9, 11, 7, 6, s.body);
	c.ellipse(9, 10, 6, 5, s.body2);
	c.disc(9, 6, 4, s.head);
	c.set(7, 6, s.eye);
	c.set(11, 6, s.eye);
	c.rect(14, 8, 3, 8, s.accent);
	c.rect(13, 6, 5, 3, s.metal);
	return outlineScale(c);
}

/** Shooter — стрелок слоя. */
function shooterFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(20, 16);
	c.rect(6, 6, 8, 8, s.body);
	c.rect(7, 7, 6, 6, s.body2);
	c.disc(10, 5, 3.5, layer === 2 ? "#d8d0c8" : (layer === 5 ? "#c8e8f8" : (layer === 6 ? "#b090d0" : "#c9a27e")));
	c.set(9, 5, s.eye);
	c.set(11, 5, s.eye);
	c.rect(12, 8, 8, 2, s.accent);
	c.rect(14, 7, 5, 2, s.metal);
	c.rect(4, 12, 3, 4, s.accent);
	c.rect(10, 12, 3, 4, s.accent);
	return outlineScale(c);
}

/** Sniper — тяжёлый дальник слоя. */
function sniperFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(20, 20);
	c.rect(5, 8, 10, 10, s.body);
	c.rect(6, 9, 8, 8, s.body2);
	c.disc(10, 6, 4, s.accent);
	c.rect(8, 4, 4, 3, s.metal);
	c.set(9, 6, s.glow);
	c.set(11, 6, s.glow);
	c.rect(14, 10, 6, 2, s.accent);
	c.rect(18, 9, 2, 4, s.metal);
	c.rect(4, 16, 4, 3, s.body);
	c.rect(11, 16, 4, 3, s.body);
	return outlineScale(c);
}

/** Wolf — только лес (зеленовато-бурый). */
function wolfFoe() {
	const c = new Canvas(22, 14);
	c.ellipse(11, 8, 9, 5, "#2a3a28");
	c.ellipse(11, 7, 8, 4, "#4a5a40");
	c.tri(2, 6, 6, 3, 6, 9, "#3a4a30");
	c.disc(18, 6, 3.5, "#5a6a48");
	c.set(19, 5, "#ff6644");
	c.tri(16, 3, 18, 5, 15, 5, "#3a4a30");
	c.tri(20, 3, 18, 5, 21, 5, "#3a4a30");
	c.rect(6, 11, 3, 3, "#1a2018");
	c.rect(13, 11, 3, 3, "#1a2018");
	return outlineScale(c);
}

/** Heavy — пулемётчик / бронебой (Гринир-лайт). */
function heavyFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(22, 22);
	c.rect(4, 6, 12, 14, s.body);
	c.rect(5, 7, 10, 12, s.body2);
	c.rect(6, 4, 8, 5, s.metal);
	c.set(8, 6, s.eye);
	c.set(11, 6, s.eye);
	c.rect(15, 10, 7, 4, s.accent);
	c.rect(18, 9, 3, 6, s.metal);
	c.rect(3, 18, 5, 3, s.accent);
	c.rect(11, 18, 5, 3, s.accent);
	return outlineScale(c);
}

/** Drone — летающий дрон (Корпус-лайт). */
function droneFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(18, 16);
	c.ellipse(9, 9, 7, 5, s.body);
	c.ellipse(9, 9, 5, 3, s.body2);
	c.disc(9, 8, 2, s.glow);
	c.rect(2, 7, 3, 2, s.metal);
	c.rect(13, 7, 3, 2, s.metal);
	c.rect(7, 2, 4, 2, s.accent);
	c.rect(8, 12, 2, 3, s.accent);
	return outlineScale(c);
}

/** Swarm — быстрый заражённый бегун. */
function swarmFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(16, 14);
	c.ellipse(8, 8, 6, 5, s.body);
	c.ellipse(8, 7, 5, 4, s.body2);
	c.tri(1, 7, 5, 4, 5, 10, s.accent);
	c.disc(12, 6, 3, s.head);
	c.set(13, 5, s.glow);
	c.rect(5, 11, 2, 3, s.eye);
	c.rect(9, 11, 2, 3, s.eye);
	return outlineScale(c);
}

/** Ancient — древний / экзимус с аурой. */
function ancientFoe(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(22, 24);
	c.ellipse(11, 14, 8, 8, s.body);
	c.ellipse(11, 13, 6, 6, s.body2);
	c.disc(11, 7, 5, s.head);
	c.set(9, 6, s.glow);
	c.set(13, 6, s.glow);
	c.rect(4, 12, 3, 10, s.accent);
	c.rect(15, 12, 3, 10, s.accent);
	c.ellipse(11, 16, 4, 3, s.glow);
	return outlineScale(c);
}

function golemSkin(layer = 1) {
	const s = LAYER_SKIN[layer] || LAYER_SKIN[1];
	const c = new Canvas(22, 22);
	c.rect(4, 4, 14, 14, s.body);
	c.rect(5, 5, 12, 12, s.body2);
	c.rect(7, 7, 3, 3, s.glow);
	c.rect(12, 7, 3, 3, s.glow);
	c.rect(8, 13, 6, 2, s.accent);
	return outlineScale(c);
}

function wolfDen() {
	const c = new Canvas(28, 22);
	c.ellipse(14, 14, 12, 7, "#2a1c10");
	c.ellipse(14, 13, 10, 6, "#3a2818");
	c.tri(4, 14, 14, 2, 24, 14, "#4a3420");
	c.tri(8, 14, 14, 6, 20, 14, "#1a1008");
	c.disc(14, 12, 3, "#0a0804");
	c.rect(10, 16, 3, 2, "#5a4030");
	c.rect(16, 16, 3, 2, "#5a4030");
	return c.outline().scale(2);
}

function enemyBulletArt() {
	const c = new Canvas(10, 6);
	c.ellipse(6, 3, 4, 2.5, "#8a3030");
	c.ellipse(6, 3, 2.5, 1.5, "#ff6a4a");
	c.disc(2, 3, 2, "#c0392b");
	c.set(7, 3, "#ffffff");
	return c.outline("#1a0808").scale(2);
}

function propTree() {
	const c = new Canvas(16, 24);
	c.rect(7, 14, 3, 10, "#4a3018");
	c.disc(8, 10, 7, "#1a4a28");
	c.disc(5, 12, 5, "#2a6a38");
	c.disc(11, 11, 5, "#246030");
	c.disc(8, 7, 4, "#3a8a48");
	return c.outline().scale(2);
}

function propCrater() {
	const c = new Canvas(24, 16);
	c.ellipse(12, 9, 11, 6, "#6a6a70");
	c.ellipse(12, 9, 8, 4, "#3a3a42");
	c.ellipse(12, 9, 4, 2, "#1a1a22");
	c.disc(8, 7, 1, "#9a9aa0");
	return c.outline().scale(2);
}

function propSpark() {
	const c = new Canvas(14, 18);
	c.tri(7, 1, 4, 9, 7, 9, "#d08cff");
	c.tri(7, 9, 10, 9, 5, 17, "#a569bd");
	c.tri(7, 9, 9, 9, 6, 15, "#ffffff88");
	return c.outline().scale(2);
}

/** Красный валун / дюна Марса. */
function propDune() {
	const c = new Canvas(24, 14);
	c.ellipse(12, 10, 11, 4, "#8a3020");
	c.ellipse(12, 8, 9, 5, "#c05038");
	c.ellipse(12, 7, 5, 2, "#e07050");
	c.disc(8, 6, 1, "#ffaa88");
	return c.outline().scale(2);
}

/** Ледяной шип Европы. */
function propIce() {
	const c = new Canvas(14, 22);
	c.tri(7, 1, 2, 20, 12, 20, "#7ec8ff");
	c.tri(7, 4, 5, 18, 9, 18, "#e0f4ff");
	c.rect(4, 18, 6, 3, "#4a90c0");
	return c.outline().scale(2);
}

/** Разлом Бездны. */
function propRift() {
	const c = new Canvas(20, 20);
	c.ellipse(10, 10, 8, 8, "#2a1040");
	c.ellipse(10, 10, 5, 5, "#6a28a0");
	c.ellipse(10, 10, 2, 3, "#ff60c0");
	c.rect(9, 2, 2, 16, "#c070ff88");
	return c.outline().scale(2);
}

/** Терминал шпионажа (документы / консоль). */
function spyTerminalArt() {
	const c = new Canvas(20, 22);
	c.rect(2, 8, 16, 12, "#1a2838");
	c.rect(3, 9, 14, 10, "#2a4058");
	c.rect(5, 11, 10, 6, "#0a1820");
	c.rect(6, 12, 8, 4, "#3a90c0");
	c.set(8, 13, "#7ec8ff");
	c.set(11, 14, "#7ec8ff");
	c.rect(8, 4, 4, 5, "#4a6080");
	c.rect(7, 2, 6, 3, "#6a80a0");
	return c.outline().scale(2);
}

/** Заложник для спасения. */
function hostageArt() {
	const c = new Canvas(16, 20);
	c.disc(8, 5, 4, "#c9a27e");
	c.rect(5, 9, 6, 8, "#4a6080");
	c.rect(4, 10, 2, 5, "#3a4a60");
	c.rect(10, 10, 2, 5, "#3a4a60");
	c.rect(5, 17, 2, 3, "#2a3040");
	c.rect(9, 17, 2, 3, "#2a3040");
	c.set(7, 5, "#1a2030");
	c.set(9, 5, "#1a2030");
	return c.outline().scale(2);
}

/** Зона эвакуации. */
function extractZoneArt() {
	const c = new Canvas(48, 48);
	c.ellipse(24, 24, 22, 22, "#1a4a38");
	c.ellipse(24, 24, 18, 18, "#2a6a48");
	c.ellipse(24, 24, 12, 12, "#3a8a58");
	c.rect(20, 8, 8, 32, "#7dffa0");
	c.rect(8, 20, 32, 8, "#7dffa0");
	return c;
}

/** Бур / криокапсула обороны (цель миссии, как в Warframe Defense). */
function propBeacon() {
	const c = new Canvas(22, 28);
	// постамент
	c.rect(4, 22, 14, 5, "#2a3548");
	c.rect(5, 23, 12, 3, "#3a4a60");
	// корпус капсулы
	c.rect(6, 6, 10, 16, "#1a2838");
	c.rect(7, 7, 8, 14, "#2a5080");
	c.rect(8, 8, 6, 12, "#3a80b0");
	// стекло / ядро
	c.ellipse(11, 14, 3, 5, "#7ec8ff");
	c.disc(11, 14, 2, "#c8f0ff");
	// антенна / бур сверху
	c.rect(10, 1, 2, 6, "#d0e0f0");
	c.rect(9, 0, 4, 2, "#a0c0e0");
	// индикаторы HP
	c.rect(5, 10, 2, 2, "#5ade70");
	c.rect(15, 10, 2, 2, "#5ade70");
	c.rect(5, 14, 2, 2, "#5ade70");
	c.rect(15, 14, 2, 2, "#e8c86a");
	return c.outline().scale(2);
}

/** Эхо-врата → вход в звёздную карту. */
function echoGate() {
	const c = new Canvas(28, 32);
	c.rect(4, 28, 20, 4, "#2a3040");
	c.rect(6, 4, 16, 26, "#1a2838");
	c.rect(8, 6, 12, 22, "#0a1520");
	c.ellipse(14, 16, 5, 8, "#3a6a9a");
	c.ellipse(14, 16, 3, 5, "#7ec8ff");
	c.disc(14, 16, 2, "#c8f0ff");
	c.rect(5, 2, 3, 4, "#5a8ab0");
	c.rect(20, 2, 3, 4, "#5a8ab0");
	return c.outline().scale(2);
}

/** Фон карты узлов миссий (планета + орбиты, как Earth в Warframe). */
function missionMapWindow() {
	const W = 1100, H = 580;
	const c = new Canvas(W, H);
	c.rect(0, 0, W, H, "#1a3050");
	c.rect(2, 2, W - 4, H - 4, "#5a9ad0");
	c.rect(4, 4, W - 8, H - 8, "#060a14");
	c.rect(8, 8, W - 16, H - 16, "#080e1a");
	for (const [x, y] of [
		[50, 70], [140, 50], [260, 90], [380, 40], [520, 80], [700, 55], [880, 95], [1000, 60],
		[70, 200], [200, 280], [900, 220], [1020, 300], [90, 420], [980, 450], [180, 520], [860, 530],
	]) c.set(x, y, "#c8e0ff");
	// планета в центре
	c.disc(550, 310, 110, "#0a1828");
	c.disc(550, 310, 98, "#1a4a38");
	c.disc(550, 310, 90, "#2a6a48");
	c.ellipse(520, 290, 28, 16, "#1a5030");
	c.ellipse(580, 340, 22, 12, "#3a8058");
	c.disc(510, 270, 14, "#4a9060");
	c.disc(590, 300, 8, "#ffffff33");
	// орбиты (точки, без заливки эллипса)
	for (const [rx, ry] of [[160, 100], [220, 140], [280, 175]]) {
		for (let a = 0; a < 360; a += 8) {
			const rad = (a * Math.PI) / 180;
			c.set(Math.round(550 + rx * Math.cos(rad)), Math.round(310 + ry * Math.sin(rad)), "#2a4060");
		}
	}
	// шапка / низ
	c.rect(12, 12, W - 24, 44, "#122038");
	c.rect(14, 14, W - 28, 40, "#1a3050");
	c.rect(12, H - 52, W - 24, 40, "#0a1018");
	c.rect(14, H - 50, W - 28, 36, "#121c2c");
	return c;
}

/** Линия связи между узлами миссий. */
function missionEdgeArt() {
	const c = new Canvas(64, 4);
	c.rect(0, 1, 64, 2, "#5a8ab0");
	c.rect(0, 0, 64, 1, "#a0d0f0");
	c.rect(0, 3, 64, 1, "#2a5070");
	return c;
}

/**
 * Ромб-узел миссии (как ноды на карте Земли в WF).
 * state: lock | open | here | done | boss
 */
function missionNodeArt(state) {
	const c = new Canvas(36, 36);
	const cx = 18, cy = 18;
	const diamond = (r, fill) => {
		c.tri(cx, cy - r, cx + r, cy, cx, cy + r, fill);
		c.tri(cx, cy - r, cx - r, cy, cx, cy + r, fill);
	};
	if (state === "lock") {
		diamond(14, "#1a1e28");
		diamond(11, "#2a3040");
		c.rect(15, 16, 6, 7, "#4a5060");
		c.rect(14, 14, 8, 4, "#5a6070");
	} else if (state === "done") {
		diamond(14, "#1a3a28");
		diamond(11, "#2d6b45");
		c.disc(cx, cy, 4, "#7dffa0");
		c.disc(cx, cy, 2, "#c8ffe0");
	} else if (state === "here") {
		diamond(15, "#5ec8ff");
		diamond(12, "#1a4a6a");
		diamond(8, "#2a6a9a");
		c.disc(cx, cy, 3, "#ffffff");
	} else if (state === "boss") {
		diamond(15, "#c0392b");
		diamond(12, "#6a2028");
		c.rect(13, 12, 10, 8, "#e74c3c");
		c.set(15, 14, "#ffdd55");
		c.set(20, 14, "#ffdd55");
	} else {
		// open
		diamond(14, "#3a6080");
		diamond(11, "#5a8ab0");
		diamond(6, "#a0d0f0");
	}
	return c;
}

/** Фон звёздной карты (как Navigation / Planets в Warframe). */
function starWindow() {
	const W = 900, H = 480;
	const c = new Canvas(W, H);
	c.rect(0, 0, W, H, "#1a3050");
	c.rect(2, 2, W - 4, H - 4, "#5a9ad0");
	c.rect(4, 4, W - 8, H - 8, "#060a14");
	c.rect(8, 8, W - 16, H - 16, "#0a1020");
	for (const [x, y] of [[40, 60], [120, 90], [200, 40], [300, 100], [450, 50], [550, 80], [720, 70], [820, 120], [80, 200], [180, 250], [500, 220], [650, 260], [800, 280], [100, 360], [350, 340], [480, 400], [700, 380], [850, 420]])
		c.set(x, y, "#c8e0ff");
	// верхний ряд узлов
	c.rect(120, 190, 520, 4, "#2a4060");
	c.rect(120, 191, 520, 2, "#5a8ab0");
	c.rect(248, 184, 12, 16, "#3a6080");
	c.rect(408, 184, 12, 16, "#3a6080");
	// связь к нижнему ряду
	c.rect(560, 190, 4, 120, "#2a4060");
	c.rect(561, 190, 2, 120, "#5a8ab0");
	// нижний ряд
	c.rect(240, 310, 520, 4, "#2a4060");
	c.rect(240, 311, 520, 2, "#5a8ab0");
	c.rect(408, 304, 12, 16, "#3a6080");
	c.rect(568, 304, 12, 16, "#3a6080");
	c.rect(12, 12, W - 24, 40, "#122038");
	c.rect(14, 14, W - 28, 36, "#1a3050");
	c.rect(12, H - 56, W - 24, 44, "#0a1018");
	c.rect(14, H - 54, W - 28, 40, "#121c2c");
	return c;
}

/**
 * Иконка планеты на карте.
 * 1 лес · 2 луна · 3 марс · 4 гроза · 5 лёд · 6 бездна
 */
function planetNode(planet, state) {
	const pal = {
		1: { fill: "#2a6a38", rim: "#5ade70", dark: "#143020" },
		2: { fill: "#8a8a96", rim: "#d0d0d8", dark: "#3a3a48" },
		3: { fill: "#c05038", rim: "#ff9070", dark: "#501810" },
		4: { fill: "#6a40a0", rim: "#d08cff", dark: "#2a1848" },
		5: { fill: "#4a90c0", rim: "#a0e8ff", dark: "#1a3a5a" },
		6: { fill: "#4a2868", rim: "#ff60c0", dark: "#1a1028" },
	};
	const p = pal[planet] || pal[1];
	const c = new Canvas(56, 56);
	if (state === "lock") {
		c.disc(28, 28, 22, "#1a1a22");
		c.disc(28, 28, 18, "#2a2a34");
		c.rect(22, 24, 12, 14, "#4a4a55");
		c.rect(20, 20, 16, 8, "#5a5a68");
		c.disc(28, 18, 6, "#5a5a68");
	} else {
		c.disc(28, 28, 24, state === "here" ? p.rim : p.dark);
		c.disc(28, 28, 20, p.fill);
		c.disc(22, 22, 5, "#ffffff44");
		if (planet === 1) {
			c.rect(18, 30, 4, 8, "#4a3018");
			c.disc(20, 28, 5, "#1a4a28");
		} else if (planet === 2) {
			c.ellipse(20, 32, 6, 3, p.dark);
			c.ellipse(34, 22, 4, 2, p.dark);
		} else if (planet === 3) {
			c.ellipse(30, 34, 8, 3, "#8a3020");
		} else if (planet === 4) {
			c.rect(26, 16, 2, 18, "#d08cff");
			c.rect(22, 22, 10, 2, "#a070ff");
		} else if (planet === 5) {
			c.tri(28, 14, 22, 36, 34, 36, "#e0f4ff");
		} else {
			c.ellipse(28, 28, 6, 8, "#ff60c0");
			c.ellipse(28, 28, 3, 4, "#1a1028");
		}
		if (state === "here") {
			c.rect(2, 2, 52, 3, p.rim);
			c.rect(2, 51, 52, 3, p.rim);
			c.rect(2, 2, 3, 52, p.rim);
			c.rect(51, 2, 3, 52, p.rim);
		}
	}
	return c.outline("#050810").scale(2);
}

/** Кузнец — NPC у горна. */
function smith() {
	const c = new Canvas(22, 24);
	// тело / фартук
	c.rect(6, 10, 10, 10, "#3a2a1a");
	c.rect(7, 12, 8, 8, "#8a4a2a");
	c.rect(8, 14, 6, 6, "#5a3030");
	// голова
	c.disc(11, 8, 4, "#c9a27e");
	c.rect(7, 5, 8, 3, "#2a1a10"); // волосы/шапка
	c.set(9, 8, "#203040");
	c.set(12, 8, "#203040");
	// борода
	c.tri(8, 10, 14, 10, 11, 14, "#6a4a28");
	// молот
	c.rect(16, 8, 2, 8, "#6a5a4a");
	c.rect(14, 6, 6, 3, "#8a8a96");
	c.rect(15, 5, 4, 2, "#b0b0bc");
	// ноги
	c.rect(7, 20, 3, 3, "#1e2a35");
	c.rect(12, 20, 3, 3, "#1e2a35");
	return outlineScale(c);
}

/** Карточка-мод: уникальная рамка + иконка (Warframe-lite). */
function modCard(kind) {
	const meta = {
		1: { bg: "#2a1010", edge: "#e74c3c", ribbon: "#ff6b5a", draw: drawModBlade },
		2: { bg: "#102030", edge: "#5dade2", ribbon: "#7ec8ff", draw: drawModArrows },
		3: { bg: "#102818", edge: "#2ecc71", ribbon: "#7dffa0", draw: drawModHeart },
		4: { bg: "#2a1c08", edge: "#f39c12", ribbon: "#ffd27a", draw: drawModShell },
		5: { bg: "#221038", edge: "#a569bd", ribbon: "#d7a6ff", draw: drawModBolt },
	};
	const m = meta[kind] || meta[1];
	const c = new Canvas(22, 30);
	c.rect(0, 0, 22, 30, m.edge);
	c.rect(1, 1, 20, 28, "#080a10");
	c.rect(2, 2, 18, 26, m.bg);
	// «полярити»-уголки
	c.tri(2, 2, 8, 2, 2, 8, m.edge);
	c.tri(20, 2, 14, 2, 20, 8, m.ribbon);
	c.rect(3, 3, 16, 3, m.ribbon);
	c.rect(4, 26, 14, 1, m.edge);
	m.draw(c, m.edge, m.ribbon);
	return c.outline("#050608").scale(2);
}
function drawModBlade(c, a, b) {
	c.tri(11, 8, 16, 22, 6, 22, a);
	c.tri(11, 10, 14, 20, 8, 20, b);
	c.rect(10, 20, 2, 4, "#8a909c");
}
function drawModArrows(c, a, b) {
	c.tri(6, 18, 11, 10, 11, 14, a);
	c.tri(11, 14, 11, 10, 16, 18, a);
	c.tri(7, 22, 11, 15, 11, 18, b);
	c.tri(11, 18, 11, 15, 15, 22, b);
}
function drawModHeart(c, a, b) {
	c.disc(8, 14, 3.5, a);
	c.disc(14, 14, 3.5, a);
	c.tri(5, 15, 17, 15, 11, 24, a);
	c.disc(9, 14, 1.5, b);
	c.set(11, 18, "#ffffff");
}
function drawModShell(c, a, b) {
	c.ellipse(11, 16, 4, 7, a);
	c.ellipse(11, 16, 2.5, 5, b);
	c.rect(9, 8, 4, 3, "#d4d8de");
	c.rect(10, 7, 2, 2, "#ffffff");
}
function drawModBolt(c, a, b) {
	c.tri(12, 8, 8, 16, 11, 16, a);
	c.tri(10, 16, 14, 16, 9, 24, b);
	c.tri(11, 16, 13, 16, 10, 22, "#ffffff88");
}

/** Оружие на полу — вид сбоку: рукоять вниз, ствол вправо (не «палка»). */
function floorWeapon(kind) {
	const c = new Canvas(30, 18);
	if (kind === 1) { // огонь — короткий дробовик/пепел
		c.rect(6, 10, 5, 7, "#3a2010"); // рукоять
		c.rect(7, 11, 3, 5, "#6a3a18");
		c.rect(4, 6, 14, 6, "#5a2218"); // тело
		c.rect(5, 7, 12, 4, "#c0392b");
		c.rect(16, 7, 10, 4, "#8a3030"); // ствол
		c.rect(24, 6, 4, 6, "#ff9a3c"); // дуло
		c.disc(26, 5, 2, "#ffcc66");
		c.rect(8, 5, 6, 2, "#2a1510"); // планка
	} else if (kind === 2) { // лёд — кристальный карабин
		c.rect(5, 10, 4, 7, "#1a3048");
		c.rect(6, 11, 2, 5, "#3a6080");
		c.rect(3, 5, 12, 6, "#1a4060");
		c.rect(4, 6, 10, 4, "#4aa0d0");
		c.rect(14, 6, 12, 3, "#aed6f1");
		c.tri(24, 5, 29, 7, 24, 10, "#e8f6ff");
		c.rect(8, 4, 3, 2, "#ffffff");
	} else if (kind === 3) { // молния — катушечный пистолет
		c.rect(7, 10, 4, 7, "#2a1840");
		c.rect(8, 11, 2, 5, "#5a3080");
		c.rect(4, 5, 11, 6, "#3a2060");
		c.rect(5, 6, 9, 4, "#8e44ad");
		c.rect(14, 7, 10, 2, "#c39bd3");
		c.disc(12, 4, 3, "#6a3a9a");
		c.disc(12, 4, 1.5, "#e8daef");
		c.line(15, 4, 22, 3, "#d08cff", 1);
		c.line(15, 5, 23, 7, "#d08cff", 1);
	} else { // эхо — синий пистолет с ядром
		c.rect(6, 10, 4, 7, "#1e2a35");
		c.rect(7, 11, 2, 5, "#3d5a73");
		c.rect(4, 5, 12, 6, "#2a4058");
		c.rect(5, 6, 10, 4, "#4a90d9");
		c.rect(15, 7, 11, 2, "#7ec8ff");
		c.rect(25, 6, 3, 4, "#a8d4ff");
		c.disc(10, 8, 2, "#7fd6ff");
		c.set(10, 8, "#ffffff");
	}
	return c.outline("#0a080c").scale(3);
}

/** Крестик закрытия окна магазина. */
function forgeClose() {
	const c = new Canvas(22, 22);
	c.rect(0, 0, 22, 22, "#8a3030");
	c.rect(1, 1, 20, 20, "#c0392b");
	c.rect(2, 2, 18, 18, "#6a2020");
	// X
	for (let i = 0; i < 12; i++) {
		c.set(5 + i, 5 + i, "#ffe0e0");
		c.set(6 + i, 5 + i, "#ffffff");
		c.set(16 - i, 5 + i, "#ffe0e0");
		c.set(15 - i, 5 + i, "#ffffff");
	}
	return c.scale(2);
}

function golem() {
	return golemSkin(1);
}

/** Пули — вытянутые снаряды, разные силуэты по стихии. */
function bullet(kind) {
	const c = new Canvas(12, 8);
	if (kind === "fire") {
		c.ellipse(7, 4, 5, 3, "#c0392b");
		c.ellipse(7, 4, 3, 2, "#ff9a3c");
		c.tri(1, 4, 5, 2, 5, 6, "#ffcc66");
		c.set(9, 4, "#ffffff");
	} else if (kind === "ice") {
		c.tri(2, 4, 10, 1, 10, 7, "#5dade2");
		c.tri(4, 4, 10, 2, 10, 6, "#aed6f1");
		c.set(8, 4, "#ffffff");
	} else if (kind === "shock") {
		c.rect(2, 3, 8, 2, "#8e44ad");
		c.tri(8, 1, 11, 4, 8, 7, "#d08cff");
		c.tri(1, 2, 4, 4, 1, 6, "#e8daef");
		c.set(6, 4, "#ffffff");
	} else {
		c.ellipse(7, 4, 4.5, 2.5, "#2a6a9a");
		c.ellipse(7, 4, 3, 1.5, "#7ec8ff");
		c.disc(3, 4, 2, "#4a90d9");
		c.set(8, 4, "#ffffff");
	}
	return c.outline("#0a080c").scale(2);
}

function core(color, accent) {
	const c = new Canvas(12, 12);
	c.disc(6, 6, 5, color);
	c.disc(6, 6, 3, accent);
	c.set(5, 5, "#ffffff");
	return c.outline().scale(3);
}

function door() {
	const c = new Canvas(20, 28);
	c.rect(0, 0, 20, 28, "#5a3a1a");
	c.rect(2, 2, 16, 24, "#8a5a2a");
	c.rect(3, 3, 14, 22, "#3a2810");
	c.disc(14, 14, 2, "#d4b24a");
	return c.scale(3);
}

function wallBlock() {
	const c = new Canvas(16, 16);
	// кирпичная кладка со швами
	c.rect(0, 0, 16, 16, "#1a1524");
	const bricks = [
		[0, 0, 8, 5, "#4a4060"], [8, 0, 8, 5, "#524a68"],
		[0, 5, 5, 5, "#3a3350"], [5, 5, 7, 5, "#5a5270"], [12, 5, 4, 5, "#45405c"],
		[0, 10, 9, 6, "#4e4664"], [9, 10, 7, 6, "#3e3854"],
	];
	for (const [x, y, w, h, col] of bricks) {
		c.rect(x, y, w, h, col);
		c.rect(x, y, w, 1, "#6a6280");
		c.rect(x, y + h - 1, w, 1, "#2a2438");
	}
	c.rect(2, 2, 2, 1, "#7a7290");
	c.rect(11, 12, 2, 1, "#7a7290");
	return c.scale(2);
}

function doorNS() {
	const c = new Canvas(40, 18);
	c.rect(0, 0, 40, 18, "#3a2810");
	c.rect(2, 2, 36, 14, "#6a4220");
	c.rect(4, 3, 15, 12, "#2a1c0c");
	c.rect(21, 3, 15, 12, "#2a1c0c");
	c.rect(18, 2, 4, 14, "#8a5a28");
	c.disc(14, 9, 2, "#d4b24a");
	c.disc(26, 9, 2, "#d4b24a");
	c.rect(6, 5, 10, 1, "#4a3020");
	c.rect(24, 5, 10, 1, "#4a3020");
	return c.scale(2);
}

function doorEW() {
	const c = new Canvas(18, 40);
	c.rect(0, 0, 18, 40, "#3a2810");
	c.rect(2, 2, 14, 36, "#6a4220");
	c.rect(3, 4, 12, 15, "#2a1c0c");
	c.rect(3, 21, 12, 15, "#2a1c0c");
	c.rect(2, 18, 14, 4, "#8a5a28");
	c.disc(9, 12, 2, "#d4b24a");
	c.disc(9, 28, 2, "#d4b24a");
	return c.scale(2);
}

function ring() {
	const s = 96, c = new Canvas(s, s), r = s / 2 - 2;
	for (let y = 0; y < s; y++)
		for (let x = 0; x < s; x++) {
			const d = Math.hypot(x - s / 2 + 0.5, y - s / 2 + 0.5);
			if (d > r) continue;
			const edge = Math.max(0, 1 - Math.abs(d - (r - 5)) / 6);
			c.set(x, y, [255, 255, 255, Math.round(255 * Math.max(edge, d / r * 0.25))]);
		}
	return c;
}

/** Пол комнаты 1120×560 — разные темы (не один фиолетовый квадрат). */
function floorScene(theme) {
	const W = 140, H = 70;
	const c = new Canvas(W, H);
	const palettes = {
		start: { a: "#1a2838", b: "#243448", c: "#2a4058", accent: "#3a6a8a" },
		combat: { a: "#241830", b: "#2e203c", c: "#3a2a48", accent: "#5a3a6a" },
		forge: { a: "#2a1c10", b: "#3a2814", c: "#4a3418", accent: "#8a5a20" },
		boss: { a: "#1a0c10", b: "#2a1018", c: "#3a1520", accent: "#6a2028" },
		forest: { a: "#142818", b: "#1e3a24", c: "#2a4a30", accent: "#3a7a48" },
		moon: { a: "#2a2a30", b: "#3a3a44", c: "#4a4a56", accent: "#8a8a96" },
		storm: { a: "#181028", b: "#24183a", c: "#30204a", accent: "#6a40a0" },
		mars: { a: "#3a1810", b: "#5a2818", c: "#7a3820", accent: "#c05038" },
		ice: { a: "#102838", b: "#1a4058", c: "#2a5878", accent: "#7ec8ff" },
		void: { a: "#100818", b: "#1a1028", c: "#2a1838", accent: "#c070ff" },
	};
	const p = palettes[theme] || palettes.combat;
	c.rect(0, 0, W, H, p.a);
	// плитка — без гигантских эллипсов (на stretch 8× они превращались в «пятна света»)
	for (let y = 0; y < H; y += 7)
		for (let x = 0; x < W; x += 7) {
			const odd = ((x / 7) + (y / 7)) % 2 === 0;
			c.rect(x, y, 7, 7, odd ? p.b : p.c);
			c.rect(x, y, 7, 1, p.a);
			c.rect(x, y, 1, 7, p.a);
		}
	if (theme === "start") {
		c.rect(W / 2 - 8, H / 2 - 4, 16, 8, "#2a5080");
		c.rect(W / 2 - 4, H / 2 - 2, 8, 4, "#7ec8ff");
	} else if (theme === "forge") {
		c.rect(W / 2 - 20, H / 2 - 4, 40, 8, "#5a3010");
		c.rect(W / 2 - 16, H / 2 - 2, 32, 4, "#c07830");
		for (const [x, y] of [[30, 20], [50, 48], [90, 22], [110, 50], [70, 18]])
			c.rect(x, y, 2, 2, "#e07030");
	} else if (theme === "boss") {
		c.rect(W / 2 - 10, H / 2 - 8, 20, 16, "#5a1520");
		c.rect(W / 2 - 6, H / 2 - 4, 12, 10, "#8a2030");
		for (const [x, y] of [[25, 30], [100, 35], [55, 50], [85, 20]])
			c.rect(x, y, 2, 2, "#ff5050");
	} else if (theme === "forest") {
		// вода — компактные пруды (деревья только RoomProp, не на текстуре)
		c.rect(18, 44, 28, 14, "#1a5080");
		c.rect(22, 47, 20, 8, "#2a70a0");
		c.rect(98, 14, 24, 12, "#1a5080");
		c.rect(102, 17, 16, 6, "#2a70a0");
		// трава / кусты
		for (const [x, y] of [[40, 20], [70, 48], [100, 40], [55, 30], [120, 55]])
			c.rect(x, y, 3, 2, "#3a8a50");
	} else if (theme === "moon") {
		for (const [x, y, rw, rh] of [[30, 22, 14, 8], [85, 42, 18, 10], [55, 18, 8, 5], [105, 28, 10, 6], [38, 48, 12, 7]]) {
			c.rect(x, y, rw, rh, "#5a5a64");
			c.rect(x + 2, y + 2, rw - 4, rh - 4, "#2a2a34");
		}
	} else if (theme === "storm") {
		c.rect(20, 20, 2, 20, "#6a40c0");
		c.rect(90, 15, 2, 25, "#a070ff");
		c.rect(W / 2 - 4, H / 2 - 4, 8, 8, "#402868");
	} else if (theme === "mars") {
		for (let y = 0; y < H; y += 5)
			for (let x = 0; x < W; x += 5) {
				const odd = ((x + y) / 5) % 2 === 0;
				c.rect(x, y, 5, 5, odd ? "#8a4028" : "#6a3018");
			}
		for (const [x, y, rw, rh] of [[35, 42, 22, 8], [95, 26, 16, 6], [65, 52, 14, 5], [22, 18, 10, 4]]) {
			c.rect(x, y, rw, rh, "#a04830");
			c.rect(x + 2, y + 1, rw - 4, Math.max(1, rh - 2), "#d06848");
		}
	} else if (theme === "ice") {
		for (const [x, y, rw, rh] of [[25, 20, 18, 10], [70, 40, 22, 12], [100, 18, 14, 8], [45, 50, 16, 8]]) {
			c.rect(x, y, rw, rh, "#4a90c0");
			c.rect(x + 2, y + 2, rw - 4, rh - 4, "#a0d8f0");
		}
		c.rect(60, 10, 3, 20, "#e0f4ff");
		c.rect(110, 35, 2, 16, "#c8e8ff");
	} else if (theme === "void") {
		c.ellipse(W / 2, H / 2, 18, 14, "#2a1040");
		c.ellipse(W / 2, H / 2, 10, 8, "#6a28a0");
		c.ellipse(W / 2, H / 2, 4, 3, "#ff60c0");
		for (const [x, y] of [[30, 20], [110, 25], [40, 50], [100, 48], [70, 15]])
			c.rect(x, y, 2, 2, "#c070ff");
	} else {
		c.rect(20, 15, 2, 25, "#1a1020");
		c.rect(90, 12, 2, 28, "#1a1020");
		c.rect(W / 2 - 6, H / 2 - 6, 12, 12, "#3a2850");
	}
	return c.scale(8);
}
function floorTile() {
	return floorScene("combat");
}

function solid(color, w = 8, h = 8) {
	const c = new Canvas(w, h);
	c.rect(0, 0, w, h, color);
	return c;
}

function relicCard(kind) {
	const pal = {
		heal: ["#14301a", "#2ecc71", drawHeart],
		shield: ["#1a2438", "#5dade2", drawShield],
		nova: ["#301820", "#e74c3c", drawNova],
	};
	const [bg, accent, draw] = pal[kind];
	const c = new Canvas(40, 52);
	c.rect(0, 0, 40, 52, accent);
	c.rect(1, 1, 38, 50, "#12141a");
	c.rect(2, 2, 36, 48, bg);
	draw(c);
	return c.scale(4);
}

function drawHeart(c) {
	c.disc(14, 22, 5, "#e74c3c");
	c.disc(26, 22, 5, "#e74c3c");
	c.tri(9, 24, 31, 24, 20, 38, "#e74c3c");
}

function drawShield(c) {
	c.tri(20, 14, 32, 20, 20, 40, "#5dade2");
	c.tri(20, 14, 8, 20, 20, 40, "#3498db");
	c.rect(17, 22, 6, 10, "#aed6f1");
}

function drawNova(c) {
	c.disc(20, 26, 10, "#c0392b");
	c.disc(20, 26, 6, "#e74c3c");
	c.disc(20, 26, 3, "#f5b7b1");
	for (const [x, y] of [[20, 12], [20, 40], [8, 26], [32, 26]]) c.disc(x, y, 2, "#f39c12");
}

function mapFrame() {
	const c = new Canvas(140, 168);
	c.rect(0, 0, 140, 168, "#0c0a12");
	c.rect(2, 2, 136, 164, "#1a2233");
	c.rect(4, 4, 132, 160, "#121826");
	// полоска заголовка
	c.rect(8, 8, 124, 18, "#243044");
	c.rect(10, 10, 120, 14, "#1a2838");
	// коридоры между клетками
	const ox = 22, oy = 40, step = 34, cell = 26;
	for (let y = 0; y < 3; y++)
		for (let x = 0; x < 3; x++) {
			const cx = ox + x * step, cy = oy + y * step;
			if (x < 2) c.rect(cx + cell, cy + 10, step - cell, 6, "#2a3548");
			if (y < 2) c.rect(cx + 10, cy + cell, 6, step - cell, "#2a3548");
		}
	// полоска легенды снизу
	c.rect(8, 142, 124, 18, "#1a2434");
	return c;
}

/** Фон миникарты большой локации. */
function miniMapBgArt() {
	const c = new Canvas(122, 70);
	c.rect(0, 0, 122, 70, "#050810");
	c.rect(1, 1, 120, 68, "#1a3048");
	c.rect(3, 3, 116, 64, "#0e1824");
	c.rect(3, 3, 116, 1, "#2a5080");
	c.rect(3, 66, 116, 1, "#1a3048");
	return c;
}
function miniDotHero() {
	const c = new Canvas(8, 8);
	c.disc(4, 4, 3, "#3ad0ff");
	c.disc(4, 4, 1, "#e8ffff");
	return c;
}
function miniDotEnemy() {
	const c = new Canvas(6, 6);
	c.disc(3, 3, 2, "#ff4a4a");
	c.disc(3, 3, 1, "#ffb0b0");
	return c;
}
function miniDotObj() {
	const c = new Canvas(8, 8);
	c.rect(1, 1, 6, 6, "#ffe08a");
	c.rect(2, 2, 4, 4, "#ffc030");
	c.set(4, 4, "#fff8d0");
	return c;
}
function miniWallArt() {
	const c = new Canvas(4, 4);
	c.rect(0, 0, 4, 4, "#4a5a6a");
	c.rect(0, 0, 4, 1, "#6a7a8a");
	return c;
}

function mapCellBase(fill, border, accent) {
	const c = new Canvas(26, 26);
	c.rect(0, 0, 26, 26, border);
	c.rect(2, 2, 22, 22, fill);
	if (accent) c.rect(4, 4, 18, 18, accent);
	return c;
}

function mapCellFog() {
	const c = mapCellBase("#1a1e28", "#0a0c12", "#222836");
	// точки «тумана»
	c.set(8, 8, "#2a3040");
	c.set(16, 10, "#2a3040");
	c.set(11, 16, "#2a3040");
	return c;
}

function mapCellClear() {
	const c = mapCellBase("#1e3a2a", "#0a1810", "#2d6b45");
	c.disc(13, 13, 4, "#7dffa0");
	c.disc(13, 13, 2, "#c8ffe0");
	return c;
}

function mapCellHere() {
	const c = mapCellBase("#1a3a55", "#0a2030", "#2a6a9a");
	c.rect(1, 1, 24, 24, "#5ec8ff");
	c.rect(3, 3, 20, 20, "#1a4a6a");
	c.disc(13, 13, 5, "#7ec8ff");
	c.disc(13, 13, 2, "#ffffff");
	return c;
}

function mapCellBoss() {
	const c = mapCellBase("#3a1518", "#1a0808", "#6a2028");
	c.rect(7, 8, 12, 10, "#c0392b");
	c.rect(9, 6, 8, 4, "#e74c3c");
	c.set(10, 10, "#ffdd55");
	c.set(15, 10, "#ffdd55");
	return c;
}

function mapCellForge() {
	const c = mapCellBase("#3a2a12", "#1a1208", "#6a4a18");
	c.rect(6, 14, 14, 5, "#d4a84a");
	c.rect(10, 8, 6, 8, "#8a6a30");
	c.disc(13, 8, 3, "#f0d080");
	return c;
}

/** Окно магазина-кузницы (фон; кнопки — отдельные спрайты). */
function forgeWindow() {
	const W = 560, H = 440;
	const c = new Canvas(W, H);
	c.rect(0, 0, W, H, "#8a6a28");
	c.rect(2, 2, W - 4, H - 4, "#e8c86a");
	c.rect(4, 4, W - 8, H - 8, "#1a140c");
	c.rect(8, 8, W - 16, H - 16, "#12161e");
	// шапка
	c.rect(12, 12, W - 24, 44, "#3a2a10");
	c.rect(14, 14, W - 28, 40, "#5c4018");
	c.rect(16, 16, W - 32, 36, "#4a3414");
	c.rect(14, 14, 10, 10, "#f0d080");
	c.rect(W - 24, 14, 10, 10, "#f0d080");
	// ресурсы
	c.rect(12, 60, W - 24, 34, "#0a0e14");
	c.rect(14, 62, W - 28, 30, "#1a2838");
	// подписи секций
	c.rect(14, 100, 200, 18, "#2a2010");
	c.rect(14, 230, 200, 18, "#1a2430");
	// ряды товаров (место справа под кнопку)
	const rows = [122, 158, 194, 252, 288, 324];
	for (let i = 0; i < rows.length; i++) {
		const y = rows[i];
		const bg = i < 3 ? "#2a2214" : "#1a222c";
		c.rect(14, y, W - 28, 32, "#0a0c10");
		c.rect(16, y + 2, W - 140, 28, bg);
		// выемка под кнопку
		c.rect(W - 118, y + 2, 100, 28, "#0c1018");
	}
	// разделитель
	c.rect(14, 232, W - 28, 3, "#6a4a18");
	c.rect(14, 233, W - 28, 1, "#e0c060");
	// подвал
	c.rect(12, H - 48, W - 24, 36, "#0a0e14");
	c.rect(14, H - 46, W - 28, 32, "#1a2434");
	return c;
}

/** Кнопка слота магазина: buy / deny / active. */
function forgeBtn(kind) {
	const pal = {
		buy: { border: "#6ddf8a", fill: "#1a4a28", inner: "#2ecc71" },
		deny: { border: "#6a3030", fill: "#2a1515", inner: "#5a3030" },
		active: { border: "#7ec8ff", fill: "#1a3a55", inner: "#3a8ac8" },
	};
	const p = pal[kind] || pal.buy;
	const c = new Canvas(96, 28);
	c.rect(0, 0, 96, 28, p.border);
	c.rect(2, 2, 92, 24, p.fill);
	c.rect(4, 4, 88, 20, p.inner);
	c.rect(4, 4, 88, 3, "#ffffff44");
	return c;
}

/** Затемнение за окном магазина. */
function forgeDim() {
	const c = new Canvas(16, 16);
	c.rect(0, 0, 16, 16, "#000000c8");
	return c;
}

/** Автомат модов (как терминал Arsenal / Warframe). */
function modBench() {
	const c = new Canvas(28, 36);
	c.rect(4, 20, 20, 14, "#2a3548");
	c.rect(6, 22, 16, 10, "#1a2434");
	c.rect(8, 4, 12, 18, "#3a4a62");
	c.rect(10, 6, 8, 12, "#0a1828");
	c.rect(11, 8, 6, 8, "#5dade2");
	c.rect(12, 10, 4, 4, "#aed6f1");
	c.rect(2, 32, 24, 4, "#1a2030");
	c.rect(10, 2, 8, 3, "#7ec8ff");
	return c.outline().scale(2);
}

/** Окно автомата модов. */
function modWindow() {
	const W = 560, H = 500;
	const c = new Canvas(W, H);
	c.rect(0, 0, W, H, "#2a5080");
	c.rect(2, 2, W - 4, H - 4, "#7ec8ff");
	c.rect(4, 4, W - 8, H - 8, "#0c121c");
	c.rect(8, 8, W - 16, H - 16, "#101820");
	c.rect(12, 12, W - 24, 44, "#1a3048");
	c.rect(14, 14, W - 28, 40, "#243a58");
	c.rect(12, 60, W - 24, 40, "#0a1018");
	c.rect(14, 62, W - 28, 36, "#152030");
	c.rect(14, 110, 200, 18, "#1a3040");
	const eq = [132, 168, 204, 240];
	for (const y of eq) {
		c.rect(14, y, W - 28, 32, "#0a0c10");
		c.rect(16, y + 2, W - 140, 28, "#1a2838");
		c.rect(W - 118, y + 2, 100, 28, "#0c1018");
	}
	c.rect(14, 280, W - 28, 3, "#3a6a90");
	c.rect(14, 290, 220, 18, "#1a3040");
	const inv = [312, 348, 384, 420, 456];
	for (const y of inv) {
		c.rect(14, y, W - 28, 32, "#0a0c10");
		c.rect(16, y + 2, W - 140, 28, "#182028");
		c.rect(W - 118, y + 2, 100, 28, "#0c1018");
	}
	return c;
}

module.exports = {
	knight,
	slime,
	bat,
	meleeFoe,
	shooterFoe,
	sniperFoe,
	heavyFoe,
	droneFoe,
	swarmFoe,
	ancientFoe,
	wolfFoe,
	golemSkin,
	wolfDen,
	enemyBulletArt,
	propTree,
	propCrater,
	propSpark,
	propDune,
	propIce,
	propRift,
	propBeacon,
	spyTerminalArt,
	hostageArt,
	extractZoneArt,
	echoGate,
	starWindow,
	missionMapWindow,
	missionEdgeArt,
	missionNodeArt,
	missionNodeLock: () => missionNodeArt("lock"),
	missionNodeOpen: () => missionNodeArt("open"),
	missionNodeHere: () => missionNodeArt("here"),
	missionNodeDone: () => missionNodeArt("done"),
	missionNodeBoss: () => missionNodeArt("boss"),
	planetForestLock: () => planetNode(1, "lock"),
	planetForestOpen: () => planetNode(1, "open"),
	planetForestHere: () => planetNode(1, "here"),
	planetMoonLock: () => planetNode(2, "lock"),
	planetMoonOpen: () => planetNode(2, "open"),
	planetMoonHere: () => planetNode(2, "here"),
	planetMarsLock: () => planetNode(3, "lock"),
	planetMarsOpen: () => planetNode(3, "open"),
	planetMarsHere: () => planetNode(3, "here"),
	planetStormLock: () => planetNode(4, "lock"),
	planetStormOpen: () => planetNode(4, "open"),
	planetStormHere: () => planetNode(4, "here"),
	planetIceLock: () => planetNode(5, "lock"),
	planetIceOpen: () => planetNode(5, "open"),
	planetIceHere: () => planetNode(5, "here"),
	planetVoidLock: () => planetNode(6, "lock"),
	planetVoidOpen: () => planetNode(6, "open"),
	planetVoidHere: () => planetNode(6, "here"),
	golem,
	meleeForest: () => meleeFoe(1),
	meleeMoon: () => meleeFoe(2),
	meleeMars: () => meleeFoe(3),
	meleeStorm: () => meleeFoe(4),
	meleeIce: () => meleeFoe(5),
	meleeVoid: () => meleeFoe(6),
	shooterForest: () => shooterFoe(1),
	shooterMoon: () => shooterFoe(2),
	shooterMars: () => shooterFoe(3),
	shooterStorm: () => shooterFoe(4),
	shooterIce: () => shooterFoe(5),
	shooterVoid: () => shooterFoe(6),
	sniperForest: () => sniperFoe(1),
	sniperMoon: () => sniperFoe(2),
	sniperMars: () => sniperFoe(3),
	sniperStorm: () => sniperFoe(4),
	sniperIce: () => sniperFoe(5),
	sniperVoid: () => sniperFoe(6),
	golemForest: () => golemSkin(1),
	golemMoon: () => golemSkin(2),
	golemMars: () => golemSkin(3),
	golemStorm: () => golemSkin(4),
	golemIce: () => golemSkin(5),
	golemVoid: () => golemSkin(6),
	heavyForest: () => heavyFoe(1),
	heavyMoon: () => heavyFoe(2),
	heavyMars: () => heavyFoe(3),
	heavyStorm: () => heavyFoe(4),
	heavyIce: () => heavyFoe(5),
	heavyVoid: () => heavyFoe(6),
	droneForest: () => droneFoe(1),
	droneMoon: () => droneFoe(2),
	droneMars: () => droneFoe(3),
	droneStorm: () => droneFoe(4),
	droneIce: () => droneFoe(5),
	droneVoid: () => droneFoe(6),
	swarmForest: () => swarmFoe(1),
	swarmMoon: () => swarmFoe(2),
	swarmMars: () => swarmFoe(3),
	swarmStorm: () => swarmFoe(4),
	swarmIce: () => swarmFoe(5),
	swarmVoid: () => swarmFoe(6),
	ancientForest: () => ancientFoe(1),
	ancientMoon: () => ancientFoe(2),
	ancientMars: () => ancientFoe(3),
	ancientStorm: () => ancientFoe(4),
	ancientIce: () => ancientFoe(5),
	ancientVoid: () => ancientFoe(6),
	smith,
	forgeClose,
	floorGunEcho: () => floorWeapon(0),
	floorGunFire: () => floorWeapon(1),
	floorGunIce: () => floorWeapon(2),
	floorGunShock: () => floorWeapon(3),
	modSerration: () => modCard(1),
	modSpeed: () => modCard(2),
	modLife: () => modCard(3),
	modCaliber: () => modCard(4),
	modSpark: () => modCard(5),
	bulletNormal: () => bullet("normal"),
	bulletFire: () => bullet("fire"),
	bulletIce: () => bullet("ice"),
	bulletShock: () => bullet("shock"),
	coreFire: () => core("#7a1f12", "#ff6a2a"),
	coreIce: () => core("#1a3a6a", "#7ec8ff"),
	coreShock: () => core("#4a1a6a", "#d08cff"),
	door,
	doorNS,
	doorEW,
	wallBlock,
	ring,
	floorTile,
	floorStart: () => floorScene("start"),
	floorCombat: () => floorScene("combat"),
	floorForge: () => floorScene("forge"),
	floorBoss: () => floorScene("boss"),
	floorForest: () => floorScene("forest"),
	floorMoon: () => floorScene("moon"),
	floorStorm: () => floorScene("storm"),
	floorMars: () => floorScene("mars"),
	floorIce: () => floorScene("ice"),
	floorVoid: () => floorScene("void"),
	solid,
	mapFrame,
	mapCellFog,
	mapCellClear,
	mapCellHere,
	mapCellBoss,
	mapCellForge,
	miniMapBgArt,
	miniDotHero,
	miniDotEnemy,
	miniDotObj,
	miniWallArt,
	forgeWindow,
	forgeBtnBuy: () => forgeBtn("buy"),
	forgeBtnDeny: () => forgeBtn("deny"),
	forgeBtnActive: () => forgeBtn("active"),
	forgeDim,
	modBench,
	modWindow,
	cardHeal: () => relicCard("heal"),
	cardShield: () => relicCard("shield"),
	cardNova: () => relicCard("nova"),
};
