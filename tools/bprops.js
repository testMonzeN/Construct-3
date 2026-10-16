// Список id и значений по умолчанию для свойств behaviors
const s = require("fs").readFileSync(__dirname + "/ref/allEditorBehaviors.js", "utf8");
const want = (process.argv[2] || "Bullet,Fade,Rotate,Flash,MoveTo,bound,destroy,Timer").split(",");
for (const id of want) {
	const re = new RegExp(`"behaviors\\."\\+(\\w+)\\.toLowerCase\\(\\)`, "g");
	let m, found = false;
	while ((m = re.exec(s))) {
		const varName = m[1];
		const decl = s.lastIndexOf(`${varName}="`, m.index);
		const val = s.slice(decl + varName.length + 2, s.indexOf('"', decl + varName.length + 2));
		if (val !== id) continue;
		const gi = s.indexOf(".gi([", m.index);
		const end = s.indexOf("])", gi);
		const body = s.slice(gi + 5, end);
		const props = [...body.matchAll(/\("(\w+)","([\w-]+)",\{initialValue:([^,}]+)(?:,items:\[([^\]]*)\])?/g)].map(p => `${p[2]}(${p[1]})=${p[3]}${p[4] ? " [" + p[4] + "]" : ""}`);
		console.log(`${id}: ${props.join("; ")}`);
		found = true;
		break;
	}
	if (!found) console.log(`${id}: NOT FOUND`);
}
