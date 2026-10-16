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
	const c = new Canvas(16, 14);
	c.ellipse(8, 8, 7, 5, "#1a6b3a");
	c.ellipse(8, 7, 6, 4, "#2fbf5a");
	c.set(6, 6, "#e8ffe8");
	c.set(10, 6, "#e8ffe8");
	c.set(6, 6, "#103020");
	c.set(10, 6, "#103020");
	return outlineScale(c);
}

function bat() {
	const c = new Canvas(18, 12);
	c.tri(2, 6, 8, 3, 8, 9, "#4a2a6a");
	c.tri(16, 6, 10, 3, 10, 9, "#4a2a6a");
	c.disc(9, 6, 3.5, "#6a3a8a");
	c.set(8, 5, "#ffdd55");
	c.set(10, 5, "#ffdd55");
	return outlineScale(c);
}

function golem() {
	const c = new Canvas(22, 22);
	c.rect(4, 4, 14, 14, "#5a5a62");
	c.rect(5, 5, 12, 12, "#8a8a96");
	c.rect(7, 7, 3, 3, "#ff6644");
	c.rect(12, 7, 3, 3, "#ff6644");
	c.rect(8, 13, 6, 2, "#3a3a42");
	return outlineScale(c);
}

function bullet(color, glow) {
	const c = new Canvas(8, 8);
	c.disc(4, 4, 3.5, color);
	c.disc(4, 4, 2, glow);
	c.set(4, 4, "#ffffff");
	return c.scale(3);
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
	c.rect(0, 0, 16, 16, "#3a3348");
	c.rect(1, 1, 14, 14, "#524a62");
	c.rect(0, 0, 16, 2, "#2a2438");
	c.rect(0, 14, 16, 2, "#1e1830");
	c.rect(3, 3, 4, 4, "#6a6280");
	return c.scale(2);
}

function doorNS() {
	const c = new Canvas(36, 16);
	c.rect(0, 0, 36, 16, "#6a4020");
	c.rect(2, 2, 32, 12, "#3a2810");
	c.rect(15, 5, 6, 6, "#d4b24a");
	return c.scale(2);
}

function doorEW() {
	const c = new Canvas(16, 36);
	c.rect(0, 0, 16, 36, "#6a4020");
	c.rect(2, 2, 12, 32, "#3a2810");
	c.rect(5, 15, 6, 6, "#d4b24a");
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

function floorTile() {
	const c = new Canvas(32, 32);
	c.rect(0, 0, 32, 32, "#2a2438");
	for (let y = 0; y < 32; y += 8)
		for (let x = 0; x < 32; x += 8) {
			const shade = ((x + y) / 8) % 2 === 0 ? "#322a42" : "#262033";
			c.rect(x, y, 8, 8, shade);
		}
	c.rect(0, 0, 32, 1, "#1a1524");
	c.rect(0, 0, 1, 32, "#1a1524");
	return c.scale(2);
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

module.exports = {
	knight,
	slime,
	bat,
	golem,
	bulletNormal: () => bullet("#4a90d9", "#a8d4ff"),
	bulletFire: () => bullet("#c0392b", "#ff9a3c"),
	bulletIce: () => bullet("#2980b9", "#aed6f1"),
	bulletShock: () => bullet("#8e44ad", "#e8daef"),
	coreFire: () => core("#7a1f12", "#ff6a2a"),
	coreIce: () => core("#1a3a6a", "#7ec8ff"),
	coreShock: () => core("#4a1a6a", "#d08cff"),
	door,
	doorNS,
	doorEW,
	wallBlock,
	ring,
	floorTile,
	solid,
	mapFrame,
	mapCellFog,
	mapCellClear,
	mapCellHere,
	mapCellBoss,
	mapCellForge,
	cardHeal: () => relicCard("heal"),
	cardShield: () => relicCard("shield"),
	cardNova: () => relicCard("nova"),
};
