/**
 * Node.js orchestrator: spawn Python detection worker → aggregate risk →
 * Cloudinary + alerts API only for HIGH / MEDIUM.
 *
 * Env (backend/.env): CLOUDINARY_*, BACKEND_API_URL, optional AI_CROSSWALK_ID.
 * Optional: PYTHON executable name (default "python").
 *
 * Run from backend: node ai/main_live_alerts.js
 */

import axios from "axios";
import { spawn } from "child_process";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.join(__dirname, "..");

dotenv.config({ path: path.join(BACKEND_ROOT, ".env") });

const AI_DIR = __dirname;
const MOCKS_IMG = path.join(AI_DIR, "mocks_img");
const WORKER_SCRIPT = path.join(AI_DIR, "detect_frame_worker.py");
const ALERTS_CLOUDINARY_FOLDER = "smart-crosswalk/alerts";

const REQUEST_TIMEOUT_MS = 10_000;
const FRAME_DELAY_MS = 500;

/** @type {Record<string, number>} */
const DANGER_PRIORITY = { HIGH: 3, MEDIUM: 2, LOW: 1 };

/** @type {Record<string, string>} */
const STATUS_TO_DANGER = {
  "CHILD - DANGER": "HIGH",
  "CHILD - LINKED": "MEDIUM",
  "ADULT - DISTRACTED": "MEDIUM",
  "ADULT - SAFE": "LOW",
};

function log(step, message, extra) {
  const tail = extra !== undefined ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${step}] ${message}${tail}`);
}

function resolveAlertsApiUrl() {
  const raw = process.env.BACKEND_API_URL?.trim();
  const url = raw || "http://localhost:3000/api/alerts";
  if (!raw) {
    log("config", "BACKEND_API_URL not set; using default", url);
  }
  return url;
}

function apiBaseFromAlertsUrl(alertsUrl) {
  const marker = "/api/alerts";
  const idx = alertsUrl.indexOf(marker);
  if (idx === -1) return alertsUrl.replace(/\/+$/, "");
  return alertsUrl.slice(0, idx);
}

function configureCloudinary() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  const missing = [
    ["CLOUDINARY_CLOUD_NAME", cloud_name],
    ["CLOUDINARY_API_KEY", api_key],
    ["CLOUDINARY_API_SECRET", api_secret],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(`Missing Cloudinary env: ${missing.join(", ")}`);
  }
  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
}

/**
 * @param {string[]} statuses
 * @returns {"HIGH"|"MEDIUM"|"LOW"}
 */
function frameDangerLevelFromStatuses(statuses) {
  if (!statuses?.length) return "LOW";
  const levels = statuses.map((s) => STATUS_TO_DANGER[s] ?? "LOW");
  return levels.reduce((best, cur) =>
    DANGER_PRIORITY[cur] > DANGER_PRIORITY[best] ? cur : best,
  );
}

/**
 * @param {string} imagePath
 * @returns {Promise<{ statuses: string[], annotated_image_base64: string }>}
 */
function runDetectionWorker(imagePath) {
  const pythonBin = process.env.PYTHON?.trim() || "python";

  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin, [WORKER_SCRIPT, imagePath], {
      cwd: AI_DIR,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(new Error(`spawn failed (${pythonBin}): ${err.message}`));
    });

    child.on("close", (code) => {
      if (stderr.trim()) {
        log("worker:stderr", stderr.trim());
      }

      const lines = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      let parsed = null;
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const o = JSON.parse(lines[i]);
          if (o && typeof o === "object" && "ok" in o) {
            parsed = o;
            break;
          }
        } catch {
          /* skip non-JSON lines */
        }
      }

      if (!parsed) {
        reject(
          new Error(
            `worker produced no JSON (exit ${code}). stdout: ${stdout.slice(0, 500)}`,
          ),
        );
        return;
      }

      if (!parsed.ok) {
        reject(new Error(parsed.error || "worker reported failure"));
        return;
      }

      if (code !== 0) {
        reject(new Error(`worker exited ${code} despite ok payload`));
        return;
      }

      resolve({
        statuses: Array.isArray(parsed.statuses) ? parsed.statuses : [],
        annotated_image_base64: String(parsed.annotated_image_base64 || ""),
      });
    });
  });
}

/**
 * @param {string} base64Jpeg
 * @param {string} sourceName
 */
async function uploadAlertImage(base64Jpeg, sourceName) {
  const basename = path.parse(sourceName).name;
  const public_id = `${basename}-${Date.now()}`;
  const dataUri = `data:image/jpeg;base64,${base64Jpeg}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: ALERTS_CLOUDINARY_FOLDER,
    public_id,
    overwrite: false,
    resource_type: "image",
  });

  const secureUrl = result?.secure_url;
  if (!secureUrl) {
    throw new Error("Cloudinary upload returned no secure_url");
  }
  log("upload", "Cloudinary OK", { public_id });
  return secureUrl;
}

async function resolveTargetCrosswalk() {
  const alertsUrl = resolveAlertsApiUrl();
  const base = apiBaseFromAlertsUrl(alertsUrl);
  const crosswalksUrl = `${base}/api/crosswalks`;

  const { data } = await axios.get(crosswalksUrl, {
    timeout: REQUEST_TIMEOUT_MS,
  });

  const list = data?.data;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("No crosswalks from backend — seed or create one first.");
  }

  const preferred = process.env.AI_CROSSWALK_ID?.trim();
  if (preferred) {
    const found = list.find((c) => c?._id === preferred);
    if (found) return found;
    log("crosswalk", "AI_CROSSWALK_ID not found; falling back to heuristics", {
      preferred,
    });
  }

  const withCam = list.find((c) => c?.cameraId);
  return withCam ?? list[0];
}

/**
 * @param {object} params
 */
async function createAlertOnBackend({
  imageUrl,
  dangerLevel,
  crosswalkId,
  location,
  cameraId,
}) {
  const alertsUrl = resolveAlertsApiUrl();
  const body = { dangerLevel: String(dangerLevel).toUpperCase() };
  if (imageUrl) body.imageUrl = imageUrl;
  if (crosswalkId) body.crosswalkId = crosswalkId;
  else if (location && (location.city || location.street || location.number)) {
    body.location = location;
  }
  if (cameraId) body.cameraId = cameraId;

  const res = await axios.post(alertsUrl, body, {
    headers: { "Content-Type": "application/json" },
    timeout: REQUEST_TIMEOUT_MS,
    validateStatus: () => true,
  });

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`API ${res.status}: ${JSON.stringify(res.data)}`);
  }

  const id = res.data?.data?._id ?? res.data?.id;
  log("api", "Alert created", { id: id || "n/a" });
  return id;
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);

async function main() {
  configureCloudinary();

  const exists = await fs.pathExists(MOCKS_IMG);
  if (!exists) {
    console.error(`Input folder not found: ${MOCKS_IMG}`);
    process.exit(1);
  }

  if (!(await fs.pathExists(WORKER_SCRIPT))) {
    console.error(`Worker script not found: ${WORKER_SCRIPT}`);
    process.exit(1);
  }

  // --- התיקון שלנו: קוראים לפונקציה ושומרים את התוצאה במשתנה ---
  const crosswalk = await resolveTargetCrosswalk();
  // --------------------------------------------------------------

  const crosswalkId = crosswalk?._id;
  const location = crosswalk?.location;
  const cam = crosswalk?.cameraId;
  const cameraId =
    cam && typeof cam === "object" ? cam._id : cam ? String(cam) : undefined;

  const alertsUrl = resolveAlertsApiUrl();
  log("start", "Orchestrator starting", {
    mocksImg: MOCKS_IMG,
    alertsUrl,
    crosswalkId,
  });

  const names = (await fs.readdir(MOCKS_IMG))
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .sort();

  const summary = { HIGH: 0, MEDIUM: 0, LOW: 0, discarded: 0, errors: 0 };

  for (const filename of names) {
    const imagePath = path.join(MOCKS_IMG, filename);
    log("frame", `Processing ${filename}`, { path: imagePath });

    let statuses;
    let b64;
    try {
      const out = await runDetectionWorker(imagePath);
      statuses = out.statuses;
      b64 = out.annotated_image_base64;
    } catch (e) {
      summary.errors += 1;
      log("error", String(e.message || e));
      continue;
    }

    log("detect", `Persons: ${statuses.length}`, { statuses });

    if (statuses.length === 0) {
      summary.discarded += 1;
      log("filter", "Discard: no persons detected — skip upload/API");
      continue;
    }

    const risk = frameDangerLevelFromStatuses(statuses);
    log("risk", `Frame danger level: ${risk}`);

    if (risk === "LOW") {
      summary.LOW += 1;
      summary.discarded += 1;
      log("filter", "Discard: LOW risk — skip upload/API");
      continue;
    }

    summary[risk] += 1;

    try {
      log("upload", "Uploading annotated frame (HIGH/MEDIUM only)…");
      const imageUrl = await uploadAlertImage(b64, filename);
      log("api", "POST alert to backend…");
      await createAlertOnBackend({
        imageUrl,
        dangerLevel: risk,
        crosswalkId,
        location,
        cameraId,
      });
      log("done", `Frame complete: ${filename}`, { risk });
    } catch (e) {
      summary.errors += 1;
      log("error", String(e.message || e));
    }

    await new Promise((r) => setTimeout(r, FRAME_DELAY_MS));
  }

  log(
    "summary",
    "Run finished",
    summary,
  );
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});