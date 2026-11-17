#!/usr/bin/env node
/**
 * One-command local run: starts the backend API and the frontend dev server
 * together from the repo root.
 *
 *   npm run setup   # once, installs backend and frontend dependencies
 *   npm start       # starts both; Ctrl+C stops both
 *
 * Owner: Razee Nepal
 *
 * No dependencies of its own: it runs `node server.js` in backend/ and Vite
 * in frontend/ directly (not through npm), so stopping it reliably stops both
 * on macOS, Linux and Windows. Output from each side is prefixed [api] or
 * [web] so the two logs can be told apart in one terminal.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(root, "backend");
const frontendDir = path.join(root, "frontend");
const viteBin = path.join(frontendDir, "node_modules", "vite", "bin", "vite.js");

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);

// Fail early, with the fix, if dependencies haven't been installed yet.
const missing = [];
if (!fs.existsSync(path.join(backendDir, "node_modules", "express"))) missing.push("backend");
if (!fs.existsSync(viteBin)) missing.push("frontend");
if (missing.length > 0) {
  console.error(`Dependencies are not installed for: ${missing.join(", ")}.`);
  console.error("Run this once from the repo root, then try again:\n\n  npm run setup\n");
  process.exit(1);
}

const children = [];
let shuttingDown = false;

function prefixLines(label, color, stream, out) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop();
    for (const line of lines) out.write(`${paint(color, label)} ${line}\n`);
  });
  stream.on("end", () => {
    if (pending) out.write(`${paint(color, label)} ${pending}\n`);
  });
}

function stopAll(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  // Set this too: if both children exit quickly, Node ends on its own before
  // the timer below fires, and would otherwise report success after a crash.
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  // Give them a moment to exit cleanly, then leave regardless.
  setTimeout(() => process.exit(exitCode), 1500).unref();
}

function run(label, color, args, cwd) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: useColor ? "1" : "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  prefixLines(label, color, child.stdout, process.stdout);
  prefixLines(label, color, child.stderr, process.stderr);

  // The most common first-run failure is a copy of the backend already
  // running; say so in plain words instead of leaving just a stack trace.
  let hinted = false;
  child.stderr.on("data", (chunk) => {
    if (!hinted && String(chunk).includes("EADDRINUSE")) {
      hinted = true;
      console.error(
        `\n${label} That port is already in use, probably by another copy of HandyDad still running. ` +
          "Stop it and try again, or see the README troubleshooting section.\n"
      );
    }
  });

  child.on("error", (error) => {
    console.error(`${label} could not start: ${error.message}`);
    stopAll(1);
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.error(`\n${label} stopped (${signal ?? `exit code ${code}`}). Stopping the other process too.`);
    stopAll(code ?? 1);
  });
  return child;
}

console.log(paint("1", "Starting HandyDad...") + " Ctrl+C stops both.\n");
run("[api]", "36", ["server.js"], backendDir);
run("[web]", "35", [viteBin], frontendDir);

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
