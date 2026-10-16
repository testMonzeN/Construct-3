// Procedural pixel art for the game. All characters are top-down and face right (angle 0).
const { Canvas } = require("./png");

function rng(seed) {
	return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- heroes (26x26 logical) ----------
function drawSF(c, ox = 0, oy = 0) {
	c.ellipse(ox + 11, oy + 13, 8, 11, "#3b0a0e");
	c.ellipse(ox + 11, oy + 13, 7, 10, "#6e1015");
	c.ellipse(ox + 10, oy + 13, 4, 7, "#a3171c");
	c.disc(ox + 8, oy + 13, 2.5, "#ff7a1a");
	c.disc(ox + 8, oy + 13, 1.2, "#ffd84a");
	c.line(ox + 15, oy + 9, ox + 22, oy + 5, "#4a4a4a", 2);
	c.line(ox + 15, oy + 17, ox + 22, oy + 21, "#4a4a4a", 2);
	c.disc(ox + 15, oy + 13, 4.5, "#1e0708");
	c.disc(ox + 15, oy + 13, 3.5, "#3d0b0e");
	c.set(ox + 18, oy + 11, "#ffd84a");
	c.set(ox + 18, oy + 15, "#ffd84a");
	c.set(ox + 17, oy + 11, "#ff9a2a");
	c.set(ox + 17, oy + 15, "#ff9a2a");
	c.disc(ox + 4, oy + 5, 1.3, "#ff5a2a");
	c.disc(ox + 3, oy + 20, 1.3, "#ff5a2a");
}

function drawAM(c, ox = 0, oy = 0) {
	c.ellipse(ox + 10, oy + 13, 7, 10, "#2c1c4a");
	c.ellipse(ox + 11, oy + 13, 6, 9, "#5b3b8c");
	c.ellipse(ox + 10, oy + 13, 3, 6, "#7d58b8");
	c.line(ox + 13, oy + 6, ox + 24, oy + 2, "#bfe6ff", 2);
	c.line(ox + 13, oy + 20, ox + 24, oy + 24, "#bfe6ff", 2);
	c.line(ox + 21, oy + 3, ox + 23, oy + 6, "#7fc8ff", 1);
	c.line(ox + 21, oy + 23, ox + 23, oy + 20, "#7fc8ff", 1);
	c.disc(ox + 13, oy + 6, 1.6, "#c9a27e");
	c.disc(ox + 13, oy + 20, 1.6, "#c9a27e");
	c.disc(ox + 14, oy + 13, 4, "#c9a27e");
	c.ellipse(ox + 13, oy + 13, 3, 4, "#2a2a3a");
	c.set(ox + 17, oy + 12, "#7fd6ff");
	c.set(ox + 17, oy + 14, "#7fd6ff");
}

function drawJugg(c, ox = 0, oy = 0) {
	c.ellipse(ox + 10, oy + 13, 7, 10, "#7a3b10");
	c.ellipse(ox + 11, oy + 13, 6, 9, "#c8742b");
	c.ellipse(ox + 9, oy + 13, 2.5, 7, "#e39a4a");
	c.line(ox + 15, oy + 17, ox + 25, oy + 17, "#e2e8ee", 2);
	c.line(ox + 15, oy + 16, ox + 25, oy + 16, "#ffffff", 1);
	c.rect(ox + 13, oy + 15, 2, 4, "#d4a017");
	c.disc(ox + 14, oy + 11, 4.5, "#e8e2d0");
	c.line(ox + 12, oy + 8, ox + 12, oy + 14, "#c0262c", 1);
	c.line(ox + 15, oy + 8, ox + 15, oy + 14, "#c0262c", 1);
	c.set(ox + 17, oy + 10, "#111111");
	c.set(ox + 17, oy + 12, "#111111");
	c.line(ox + 9, oy + 6, ox + 6, oy + 2, "#e8c040", 1);
}

function hero(drawFn) {
	const c = new Canvas(26, 26);
	drawFn(c);
	return c.outline().scale(3);
}

// ---------- creeps (16x16 logical) ----------
function creepMelee() {
	const c = new Canvas(16, 16);
	c.disc(7, 8, 6, "#5a1c12");
	c.disc(7, 8, 5, "#8a2e1c");
	c.disc(8, 8, 3, "#3a3a3a");
	c.disc(8, 8, 2, "#6a6a6a");
	c.line(10, 11, 15, 12, "#cfd4da", 1);
	c.disc(10, 11, 1, "#d9b38c");
	c.set(10, 7, "#ffcc33");
	return c.outline().scale(3);
}

function creepRanged() {
	const c = new Canvas(16, 16);
	c.disc(7, 8, 5.5, "#2a1f3a");
	c.disc(7, 8, 4.5, "#4a3a66");
	c.disc(8, 8, 2.5, "#1a1424");
	c.line(9, 4, 15, 4, "#8a5a2a", 1);
	c.disc(14, 4, 1.6, "#7cff5a");
	c.set(10, 7, "#9cff7a");
	c.set(10, 9, "#9cff7a");
	return c.outline().scale(3);
}

// ---------- projectiles / effects ----------
function heroBullet() {
	const c = new Canvas(9, 9);
	c.disc(4, 4, 4, "#8a0f10");
	c.disc(4, 4, 3, "#ff3b2f");
	c.disc(5, 4, 1.6, "#ffb347");
	c.set(5, 4, "#fff2a8");
	return c.scale(3);
}

function creepBullet() {
	const c = new Canvas(6, 6);
	c.disc(2.5, 2.5, 2.5, "#3d9a1a");
	c.disc(2.5, 2.5, 1.5, "#b4ff7a");
	return c.scale(3);
}

function ring() {
	const s = 128, c = new Canvas(s, s), r = s / 2 - 2;
	for (let y = 0; y < s; y++)
		for (let x = 0; x < s; x++) {
			const d = Math.hypot(x - s / 2 + 0.5, y - s / 2 + 0.5);
			if (d > r) continue;
			const edge = Math.max(0, 1 - Math.abs(d - (r - 6)) / 7);
			const a = Math.round(255 * Math.max(edge, (d / r) * 0.35));
			c.set(x, y, [255, 255, 255, a]);
		}
	return c;
}

function solid(color, w = 8, h = 8) {
	const c = new Canvas(w, h);
	c.rect(0, 0, w, h, color);
	return c;
}

function grass() {
	const c = new Canvas(32, 32), r = rng(7);
	c.rect(0, 0, 32, 32, "#355f2a");
	for (let i = 0; i < 140; i++) c.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? "#2c5223" : "#41712f");
	for (let i = 0; i < 18; i++) {
		const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
		c.set(x, y, "#4f8a38");
		c.set(x, y - 1, "#4f8a38");
	}
	if (r() < 2) c.set(9, 22, "#e8d64a");
	c.set(25, 7, "#d86ad8");
	return c.scale(2);
}

// ---------- shop icons (16x16 logical, 7 frames) ----------
function iconBase() {
	const c = new Canvas(16, 16);
	c.rect(0, 0, 16, 16, "#8a7442");
	c.rect(1, 1, 14, 14, "#1d2026");
	c.rect(1, 1, 14, 2, "#2a2e36");
	return c;
}

const ICONS = [
	c => { c.ellipse(8, 9, 4, 4.5, "#2e8a2e"); c.ellipse(7, 8, 2.5, 3, "#5fd35f"); c.rect(7, 3, 2, 2, "#a8743a"); },
	c => { c.line(3, 13, 12, 3, "#cfd4da", 1.5); c.line(4, 3, 13, 13, "#9aa2ab", 1.5); c.rect(6, 10, 4, 1, "#a8743a"); },
	c => { c.rect(5, 3, 4, 8, "#8a5a2a"); c.rect(5, 10, 8, 3, "#6e4520"); c.rect(5, 3, 4, 1, "#c48a4a"); c.rect(11, 10, 2, 3, "#c48a4a"); },
	c => { c.rect(4, 4, 8, 9, "#7d8590"); for (let y = 5; y < 13; y += 2) for (let x = 5; x < 12; x += 2) c.set(x, y, "#b8c0ca"); c.rect(2, 4, 2, 4, "#7d8590"); c.rect(12, 4, 2, 4, "#7d8590"); },
	c => { c.disc(6, 7, 2.6, "#e0353a"); c.disc(10, 7, 2.6, "#e0353a"); c.tri(3.5, 8, 12.5, 8, 8, 13, "#e0353a"); c.set(6, 6, "#ffb0b0"); },
	c => { c.tri(8, 2, 13, 8, 8, 14, "#2f7fe0"); c.tri(8, 2, 3, 8, 8, 14, "#5aa8ff"); c.set(7, 6, "#e0f0ff"); },
	c => { c.line(3, 13, 13, 3, "#ffd24a", 1.5); c.line(4, 12, 12, 4, "#fff2a8", 0.5); c.line(3, 10, 6, 13, "#c8962a", 1); c.disc(13, 3, 1, "#ffffff"); },
];

function shopIcon(i) {
	const c = iconBase();
	ICONS[i](c);
	return c.scale(4);
}

// ---------- hero cards for the menu (40x52 logical) ----------
function heroCard(drawFn, bg, accent) {
	const c = new Canvas(40, 52);
	c.rect(0, 0, 40, 52, accent);
	c.rect(1, 1, 38, 50, "#15171d");
	c.rect(2, 2, 36, 48, bg);
	for (let y = 2; y < 50; y += 3) c.rect(2, y, 36, 1, "#00000022");
	const h = new Canvas(26, 26);
	drawFn(h);
	h.outline();
	c.blit(h, 7, 13);
	return c.scale(4);
}

module.exports = {
	sf: () => hero(drawSF),
	am: () => hero(drawAM),
	jugg: () => hero(drawJugg),
	creepMelee,
	creepRanged,
	heroBullet,
	creepBullet,
	ring,
	solid,
	grass,
	shopIcon,
	cardSF: () => heroCard(drawSF, "#3a1416", "#c0392b"),
	cardAM: () => heroCard(drawAM, "#24183a", "#8e5bd8"),
	cardJugg: () => heroCard(drawJugg, "#3a2410", "#e08a2e"),
};
