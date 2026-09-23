// Runs as the tenant's npm build inside the build sandbox and records what a
// hostile build could see or reach. Values are never recorded, only names.
const fs = require("fs");
const net = require("net");
const http = require("http");

const SUSPICIOUS = /DATABASE|JWT|S3_|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|REDIS|POWERDNS|OIDC|INTERNAL|DEPLOY_KEY|AWS_|MINIO/i;
const envNames = (text) => text.split("\0").filter(Boolean).map((kv) => kv.split("=")[0]);

function procEnvironNames() {
  const found = {};
  for (const pid of fs.readdirSync("/proc").filter((p) => /^\d+$/.test(p))) {
    try {
      const names = envNames(fs.readFileSync(`/proc/${pid}/environ`, "latin1")).filter((n) => SUSPICIOUS.test(n));
      if (names.length) found[pid] = names;
    } catch (_) {}
  }
  return found;
}

function exists(p) { try { fs.accessSync(p); return true; } catch (_) { return false; } }

function tcp(host, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 4000 });
    const done = (v) => { s.destroy(); resolve(v); };
    s.on("connect", () => done("open"));
    s.on("timeout", () => done("blocked"));
    s.on("error", (e) => done(e.code === "ENOTFOUND" ? "no-dns" : "blocked"));
  });
}

function httpStatus(url, method) {
  return new Promise((resolve) => {
    const req = http.request(url, { method, timeout: 5000 }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on("timeout", () => { req.destroy(); resolve("timeout"); });
    req.on("error", () => resolve("error"));
    req.end();
  });
}

const TARGETS = [
  ["api-main", "web-hosting-api", 8080],
  ["api-build-stage", "web-hosting-api", 8082],
  ["postgres", "web-hosting-postgres-ha-v2-rw", 5432],
  ["minio", "web-hosting-minio-ha", 9000],
  ["kube-api-svc", "kubernetes.default.svc", 443],
  ["kube-api-vip", "10.112.0.23", 8443],
  ["metadata", "169.254.169.254", 80],
  ["node1-lan-ssh", "192.168.10.19", 22],
  ["node1-kubelet", "192.168.10.19", 10250],
  ["node1-public-kubelet", "81.181.245.150", 10250],
  ["public-edge-https", "81.181.245.60", 443],
  ["github-https", "github.com", 443],
];

(async () => {
  const result = {
    stage: "npm-build",
    uid: process.getuid(),
    suspiciousEnv: Object.keys(process.env).filter((n) => SUSPICIOUS.test(n)),
    suspiciousProcEnviron: procEnvironNames(),
    serviceAccountToken: exists("/var/run/secrets/kubernetes.io/serviceaccount/token"),
    fetchCredsVolume: exists("/creds"),
    registryConfig: exists("/registry") || exists("/kaniko/.docker/config.json"),
    rootWritable: (() => { try { fs.writeFileSync("/probe-write", "x"); return true; } catch (_) { return false; } })(),
    reach: {},
    buildStageCheckoutWithoutToken: await httpStatus("http://web-hosting-api:8082/internal/build/v1/checkout", "POST"),
  };
  for (const [name, host, port] of TARGETS) result.reach[name] = await tcp(host, port);
  fs.mkdirSync("dist", { recursive: true });
  fs.writeFileSync("dist/probe.json", JSON.stringify(result, null, 2) + "\n");
  fs.writeFileSync("dist/index.html", "<!doctype html><title>isolation probe</title><p>See <a href=\"probe.json\">probe.json</a>.</p>\n");
  console.log("PROBE-BUILD " + JSON.stringify(result));
})();
