// Запуск: node tools/aces.js <regex> — печатает id ACE и параметры
const plugins = require("./ref/pluginAces.json");
const behaviors = require("./ref/behaviorAces.json");
const re = new RegExp(process.argv[2] || ".", "i");

function walk(owner, data) {
	for (const [cat, group] of Object.entries(data)) {
		for (const kind of ["conditions", "actions", "expressions"]) {
			for (const ace of group[kind] || []) {
				const key = `${owner}/${cat}/${kind}/${ace.id}`;
				if (!re.test(key)) continue;
				const params = (ace.params || []).map(p => `${p.id}:${p.type}${p.items ? "[" + p.items.join("|") + "]" : ""}${p.initialValue !== undefined ? "=" + JSON.stringify(p.initialValue) : ""}`);
				console.log(`${key}${ace.isTrigger ? " (trigger)" : ""}  ${params.join(", ")}`);
			}
		}
	}
}
for (const [k, v] of Object.entries(plugins)) walk("P:" + k, v);
for (const [k, v] of Object.entries(behaviors)) walk("B:" + k, v);
