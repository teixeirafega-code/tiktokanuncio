const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8"
};

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const safePath = decoded.endsWith("/") ? `${decoded}index.html` : decoded;
  const fullPath = path.normalize(path.join(ROOT, safePath));
  if (!fullPath.startsWith(ROOT)) {
    return null;
  }
  return fullPath;
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const dbPath = path.join(ROOT, "database.json");

  if (urlPath === "/api/clients") {
    if (req.method === "GET") {
      fs.readFile(dbPath, "utf8", (err, data) => {
        if (err) {
          if (err.code === "ENOENT") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("[]");
            return;
          }
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Error");
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
      });
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        let newClient;
        try {
          newClient = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
          return;
        }

        fs.readFile(dbPath, "utf8", (readErr, data) => {
          let clients = [];
          if (!readErr && data.trim()) {
            try {
              clients = JSON.parse(data);
            } catch {
              clients = [];
            }
          }

          clients.push(newClient);
          fs.writeFile(dbPath, JSON.stringify(clients, null, 2), "utf8", writeErr => {
            if (writeErr) {
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, error: "Write failed" }));
              return;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          });
        });
      });
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const filePath = resolvePath(urlPath);

  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
