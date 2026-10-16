const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || ".");
const port = Number(process.argv[3] || 8765);

http.createServer((req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Private-Network", "true");
	res.setHeader("Cache-Control", "no-store");
	if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
	const file = path.join(root, decodeURIComponent(req.url.split("?")[0]));
	if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
		res.writeHead(404); return res.end("not found");
	}
	res.writeHead(200, { "Content-Type": file.endsWith(".c3p") ? "application/zip" : "application/octet-stream" });
	fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
