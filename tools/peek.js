// Запуск: node tools/peek.js <файл> <строка> [до] [после]
const s = require("fs").readFileSync(process.argv[2], "utf8");
const needle = process.argv[3];
const before = Number(process.argv[4] || 300), after = Number(process.argv[5] || 1500);
let i = -1, n = 0;
while ((i = s.indexOf(needle, i + 1)) >= 0 && n < 3) {
	console.log(`=== @${i}`);
	console.log(s.slice(Math.max(0, i - before), i + after));
	n++;
}
