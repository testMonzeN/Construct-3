// Extracts common ACE definitions (t.Qcs = condition, t.Jcs = action) from editor main.js
const s = require("fs").readFileSync(__dirname + "/ref/main.js", "utf8");
const start = s.indexOf('id:"compare-instance-variable"') - 40000;
const end = start + 90000;
const chunk = s.slice(start, end);
const re = /t\.(Qcs|Jcs)\(\{id:"([^"]+)"(.*?)\}\)(?=[,.)])/g;
const filter = new RegExp(process.argv[2] || ".", "i");
let m;
while ((m = re.exec(chunk))) {
	const kind = m[1] === "Qcs" ? "COND" : "ACT ";
	if (!filter.test(m[2])) continue;
	const params = [...m[3].matchAll(/\{id:"([^"]+)",type:"([^"]+)"(?:,items:\[([^\]]*)\])?/g)].map(p => `${p[1]}:${p[2]}${p[3] ? "[" + p[3].replace(/"/g, "") + "]" : ""}`);
	const trig = /isTrigger:!0/.test(m[3]) ? " (trigger)" : "";
	console.log(`${kind} ${m[2]}${trig}  ${params.join(", ")}`);
}
