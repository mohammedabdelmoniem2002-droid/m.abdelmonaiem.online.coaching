/**
 * Elite Coach — Railway-ready server (zero dependencies)
 * Finds index.html in multiple possible locations.
 */
const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

const ENV = {
  COACH_USERNAME: process.env.COACH_USERNAME || "m.abdelmoniem",
  COACH_PASSWORD: process.env.COACH_PASSWORD || "30210120200932",
  COACH_PHONE: process.env.COACH_PHONE || "01284931730",
  WHATSAPP_NUMBER: String(process.env.WHATSAPP_NUMBER || "201284931730").replace(/\D/g, ""),
  SESSION_MINUTES: parseInt(process.env.SESSION_MINUTES || "10", 10) || 10,
};

function addMonths(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + (n || 1));
  return d.toISOString().slice(0, 10);
}

function parseClientUsers() {
  const raw = process.env.CLIENT_USERS || process.env.CLIENTS || "";
  if (!raw || !String(raw).trim()) {
    return [
      { name: "عميل تجريبي 1", phone: "01000000001", pass: "1111", months: "3", expiry: addMonths(3) },
      { name: "عميل تجريبي 2", phone: "01000000002", pass: "2222", months: "1", expiry: addMonths(1) },
    ];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((c) => c && (c.phone || c.username))
        .map((c) => ({
          name: String(c.name || c.username || c.phone || "").trim(),
          phone: String(c.phone || c.username || "").replace(/\s+/g, ""),
          pass: String(c.pass || c.password || "1234"),
          months: String(c.months || c.mo || "1"),
          expiry: c.expiry || addMonths(parseInt(c.months || "1", 10) || 1),
          photo: c.photo || "",
        }));
    }
  } catch (_) {}
  return String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const bits = part.split(":").map((s) => s.trim());
      const name = bits[0] || "Client";
      const phone = (bits[1] || bits[0] || "").replace(/\s+/g, "");
      const pass = bits[2] || "1234";
      const months = bits[3] || "1";
      return {
        name,
        phone,
        pass,
        months,
        expiry: addMonths(parseInt(months, 10) || 1),
        photo: "",
      };
    })
    .filter((c) => c.phone);
}

const CLIENT_USERS = parseClientUsers();

// Search multiple locations for index.html (Railway root-dir quirks)
const CANDIDATES = [
  path.join(__dirname, "public", "index.html"),
  path.join(__dirname, "index.html"),
  path.join(process.cwd(), "public", "index.html"),
  path.join(process.cwd(), "index.html"),
  path.join(__dirname, "..", "public", "index.html"),
  path.join(__dirname, "..", "index.html"),
];

function findIndexHtml() {
  for (const p of CANDIDATES) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (_) {}
  }
  return null;
}

const INDEX_PATH = findIndexHtml();
const STATIC_ROOT = INDEX_PATH ? path.dirname(INDEX_PATH) : path.join(__dirname, "public");

console.log("CWD:", process.cwd());
console.log("__dirname:", __dirname);
console.log("Looking for index.html in:");
CANDIDATES.forEach((p) => {
  const ok = fs.existsSync(p);
  console.log("  " + (ok ? "FOUND" : "miss ") + " " + p);
});
console.log("Using INDEX:", INDEX_PATH || "NOT FOUND");
console.log("STATIC_ROOT:", STATIC_ROOT);

function buildHtml() {
  if (!INDEX_PATH) {
    const listing = [];
    try {
      listing.push("cwd files: " + fs.readdirSync(process.cwd()).join(", "));
    } catch (_) {}
    try {
      listing.push("__dirname files: " + fs.readdirSync(__dirname).join(", "));
    } catch (_) {}
    throw new Error(
      "index.html not found. Checked: " +
        CANDIDATES.join(" | ") +
        " || " +
        listing.join(" || ")
    );
  }
  let html = fs.readFileSync(INDEX_PATH, "utf8");

  const configPayload = Object.assign({}, ENV, { CLIENT_USERS: CLIENT_USERS });

  const inject = `
<script>
window.__ELITE_ENV = ${JSON.stringify(configPayload)};
(function seedEliteClients() {
  try {
    var list = (window.__ELITE_ENV && window.__ELITE_ENV.CLIENT_USERS) || [];
    if (!Array.isArray(list) || !list.length) return;
    var PUB = "elite_published_clients_v1";
    var SUBS = "elite_coach_subs_v1";
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem(PUB) || "[]") || []; } catch (e) {}
    if (!Array.isArray(existing)) existing = [];
    var map = {};
    existing.forEach(function (c) {
      if (c && c.phone) map[String(c.phone).replace(/\\s+/g, "")] = true;
    });
    var added = 0;
    list.forEach(function (c) {
      if (!c || !c.phone) return;
      var ph = String(c.phone).replace(/\\s+/g, "");
      if (map[ph]) return;
      existing.push({
        name: c.name || ph,
        phone: ph,
        pass: String(c.pass || "1234"),
        expiry: c.expiry || "",
        months: String(c.months || "1"),
        photo: c.photo || "",
        renew: ""
      });
      map[ph] = true;
      added++;
    });
    if (added > 0) {
      localStorage.setItem(PUB, JSON.stringify(existing));
      try {
        var subs = JSON.parse(localStorage.getItem(SUBS) || "[]") || [];
        if (!Array.isArray(subs)) subs = [];
        list.forEach(function (c) {
          if (!c || !c.phone) return;
          var ph = String(c.phone).replace(/\\s+/g, "");
          var found = false;
          for (var i = 0; i < subs.length; i++) {
            if (String(subs[i].phone || "").replace(/\\s+/g, "") === ph) { found = true; break; }
          }
          if (!found) {
            subs.push({
              id: "seed_" + ph,
              name: c.name || ph,
              phone: ph,
              pass: String(c.pass || "1234"),
              expiry: c.expiry || "",
              months: String(c.months || "1"),
              photo: c.photo || "",
              created: new Date().toISOString()
            });
          }
        });
        localStorage.setItem(SUBS, JSON.stringify(subs));
      } catch (e2) {}
      console.log("[Elite] Seeded " + added + " client user(s) from env");
    }
  } catch (err) {
    console.warn("[Elite] seed clients failed", err);
  }
})();
</script>
`;

  if (html.includes("<head>")) {
    html = html.replace("<head>", "<head>" + inject);
  } else if (html.includes("<body")) {
    html = html.replace(/<body[^>]*>/, function (m) { return m + inject; });
  } else {
    html = inject + html;
  }

  html = html.replace(
    /var USER\s*=\s*"[^"]*";/,
    'var USER = (window.__ELITE_ENV && window.__ELITE_ENV.COACH_USERNAME) || "m.abdelmoniem";'
  );
  html = html.replace(
    /var DEFAULT_PASS\s*=\s*"[^"]*";/,
    'var DEFAULT_PASS = (window.__ELITE_ENV && window.__ELITE_ENV.COACH_PASSWORD) || "30210120200932";'
  );
  html = html.replace(
    /var LINKED_PHONE\s*=\s*"[^"]*";/,
    'var LINKED_PHONE = (window.__ELITE_ENV && window.__ELITE_ENV.COACH_PHONE) || "01284931730";'
  );
  html = html.replace(
    /var SESSION_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000[^;]*/,
    "var SESSION_MS = ((window.__ELITE_ENV && window.__ELITE_ENV.SESSION_MINUTES) || 10) * 60 * 1000"
  );
  html = html.replace(
    /var DEFAULT_WA\s*=\s*"[^"]*";/,
    'var DEFAULT_WA = (window.__ELITE_ENV && window.__ELITE_ENV.WHATSAPP_NUMBER) || "201284931730";'
  );

  return html;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer(function (req, res) {
  let pathname = "/";
  try {
    pathname = new URL(req.url || "/", "http://localhost").pathname;
  } catch (_) {}
  pathname = decodeURIComponent(pathname);

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "elite-coach",
        coach: ENV.COACH_USERNAME,
        sessionMinutes: ENV.SESSION_MINUTES,
        whatsapp: ENV.WHATSAPP_NUMBER,
        seededClients: CLIENT_USERS.length,
        indexFound: !!INDEX_PATH,
        indexPath: INDEX_PATH,
        cwd: process.cwd(),
        dirname: __dirname,
      })
    );
    return;
  }

  // SPA routes
  if (
    pathname === "/" ||
    pathname === "/index.html" ||
    pathname === "/client" ||
    pathname === "/coach" ||
    !path.extname(pathname)
  ) {
    try {
      const html = buildHtml();
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Error building page: " + e.message);
    }
    return;
  }

  // Static from same folder as index
  const filePath = path.join(STATIC_ROOT, pathname.replace(/^\/+/, ""));
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      try {
        const html = buildHtml();
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(html);
      } catch (e) {
        res.writeHead(404);
        res.end("Not found");
      }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    });
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", function () {
  console.log("Elite Coach running on port " + PORT);
  console.log(
    "Coach: " +
      ENV.COACH_USERNAME +
      " | Session: " +
      ENV.SESSION_MINUTES +
      "min | WA: " +
      ENV.WHATSAPP_NUMBER
  );
  console.log("Seeded client users: " + CLIENT_USERS.length);
  CLIENT_USERS.forEach(function (c, i) {
    console.log("  " + (i + 1) + ". " + c.name + " | " + c.phone + " | pass=" + c.pass);
  });
});
