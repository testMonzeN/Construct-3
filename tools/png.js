// Простой RGBA-холст и кодировщик PNG (без зависимостей)
const zlib = require("zlib");

const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();

function crc32(buf) {
	let c = 0xffffffff;
	for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}

function hex(c) {
	if (Array.isArray(c)) return c;
	const s = c.replace("#", "");
	const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255;
	return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), a];
}

class Canvas {
	constructor(w, h) {
		this.w = w;
		this.h = h;
		this.px = new Uint8Array(w * h * 4);
	}
	get(x, y) {
		const i = (y * this.w + x) * 4;
		return [this.px[i], this.px[i + 1], this.px[i + 2], this.px[i + 3]];
	}
	set(x, y, color) {
		x = Math.round(x);
		y = Math.round(y);
		if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
		const [r, g, b, a] = hex(color);
		const i = (y * this.w + x) * 4;
		if (a >= 255 || this.px[i + 3] === 0) {
			this.px.set([r, g, b, a], i);
			return;
		}
		const sa = a / 255, da = this.px[i + 3] / 255, oa = sa + da * (1 - sa);
		for (let k = 0; k < 3; k++) this.px[i + k] = Math.round(([r, g, b][k] * sa + this.px[i + k] * da * (1 - sa)) / oa);
		this.px[i + 3] = Math.round(oa * 255);
	}
	rect(x, y, w, h, c) {
		for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
	}
	ellipse(cx, cy, rx, ry, c) {
		for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
			for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
				const dx = (x - cx) / rx, dy = (y - cy) / ry;
				if (dx * dx + dy * dy <= 1) this.set(x, y, c);
			}
	}
	disc(cx, cy, r, c) {
		this.ellipse(cx, cy, r, r, c);
	}
	line(x0, y0, x1, y1, c, width = 1) {
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
		for (let s = 0; s <= steps; s++) {
			const x = x0 + ((x1 - x0) * s) / steps, y = y0 + ((y1 - y0) * s) / steps;
			if (width <= 1) this.set(x, y, c);
			else this.disc(x, y, width / 2, c);
		}
	}
	tri(ax, ay, bx, by, cx, cy, c) {
		const minX = Math.floor(Math.min(ax, bx, cx)), maxX = Math.ceil(Math.max(ax, bx, cx));
		const minY = Math.floor(Math.min(ay, by, cy)), maxY = Math.ceil(Math.max(ay, by, cy));
		const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
		for (let y = minY; y <= maxY; y++)
			for (let x = minX; x <= maxX; x++) {
				const w0 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / area;
				const w1 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / area;
				const w2 = 1 - w0 - w1;
				if (w0 >= -0.01 && w1 >= -0.01 && w2 >= -0.01) this.set(x, y, c);
			}
	}
	// Обводка 1px вокруг непрозрачных пикселей
	outline(c = "#120c0c") {
		const copy = new Uint8Array(this.px);
		const alpha = (x, y) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : copy[(y * this.w + x) * 4 + 3]);
		for (let y = 0; y < this.h; y++)
			for (let x = 0; x < this.w; x++) {
				if (alpha(x, y) > 0) continue;
				if (alpha(x - 1, y) > 128 || alpha(x + 1, y) > 128 || alpha(x, y - 1) > 128 || alpha(x, y + 1) > 128) this.set(x, y, c);
			}
		return this;
	}
	scale(f) {
		const out = new Canvas(this.w * f, this.h * f);
		for (let y = 0; y < out.h; y++)
			for (let x = 0; x < out.w; x++) {
				const i = (Math.floor(y / f) * this.w + Math.floor(x / f)) * 4;
				out.px.set(this.px.subarray(i, i + 4), (y * out.w + x) * 4);
			}
		return out;
	}
	blit(src, ox, oy) {
		for (let y = 0; y < src.h; y++)
			for (let x = 0; x < src.w; x++) {
				const p = src.get(x, y);
				if (p[3] > 0) this.set(ox + x, oy + y, p);
			}
	}
	toPNG() {
		const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
		for (let y = 0; y < this.h; y++) {
			raw[y * (this.w * 4 + 1)] = 0;
			Buffer.from(this.px.buffer, y * this.w * 4, this.w * 4).copy(raw, y * (this.w * 4 + 1) + 1);
		}
		const ihdr = Buffer.alloc(13);
		ihdr.writeUInt32BE(this.w, 0);
		ihdr.writeUInt32BE(this.h, 4);
		ihdr[8] = 8;
		ihdr[9] = 6;
		return Buffer.concat([
			Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
			chunk("IHDR", ihdr),
			chunk("IDAT", zlib.deflateSync(raw)),
			chunk("IEND", Buffer.alloc(0)),
		]);
	}
}

module.exports = { Canvas };
