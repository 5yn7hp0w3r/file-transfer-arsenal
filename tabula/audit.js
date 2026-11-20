#!/usr/bin/env node
/*
 * Command audit for the TABULA catalogue:
 *   - substitutes sample values into every step;
 *   - syntax-checks bash and PowerShell commands;
 *   - reports interactive-only shells separately.
 *
 * Run from the repository root:
 *   node tabula/audit.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync, spawnSync } = require("child_process");

const root = __dirname;
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "methods.js"), "utf8"), sandbox, { filename: "methods.js" });
const methods = sandbox.window.TABULA_METHODS;

const sample = {
  lhost: "10.10.14.5",
  lport: "8000",
  file: "payload.exe",
  file_exfil: "secrets.zip",
  remote: "/tmp",
  lhostpath: "/tmp/share",
  remotefile: "/tmp/share/payload.exe",
  lhostfile: "/tmp/share/payload.exe",
  rhost: "10.10.10.10",
  rhost_user: "user",
  lhost_user: "user",
  domain: "lab.local",
  rhost_pass: "Password0@",
  ssh_port: "22",
  ssh_key: "/tmp/id_rsa",
  rhostpath: "/tmp"
};

function fill(text, windows) {
  const local = Object.assign({}, sample);
  if (windows) {
    local.remote = "C:\\Users\\Public";
    local.remotefile = "C:\\Users\\Public\\payload.exe";
    local.lhostpath = "C:\\share";
  }
  return String(text).replace(/\{(\w+)\}/g, function (match, key) {
    return Object.prototype.hasOwnProperty.call(local, key) ? local[key] : match;
  });
}

const havePwsh = spawnSync("pwsh", ["-NoProfile", "-Command", "exit 0"]).status === 0;
const errors = [];
const counts = { bash: 0, powershell: 0, skipped: 0 };

methods.forEach(function (method) {
  const steps = method.steps || [method.server, ...[].concat(method.client || [])].filter(Boolean);
  steps.forEach(function (step, index) {
    if (step.shell === "bash") {
      counts.bash += 1;
      const text = fill(step.text, false);
      try {
        execFileSync("bash", ["-n", "-c", text], { stdio: "pipe" });
      } catch (error) {
        errors.push({ id: method.id, index: index, shell: "bash", text: text, message: String(error.stderr || error.message).split("\n")[0] });
      }
      return;
    }
    if (step.shell === "powershell") {
      counts.powershell += 1;
      if (!havePwsh) return;
      const text = fill(step.text, true);
      const script = "$e=$null;[void][System.Management.Automation.Language.Parser]::ParseInput('" +
        text.replace(/'/g, "''") + "',[ref]$null,[ref]$e);if($e){$e|ForEach-Object{$_.Message};exit 1}";
      try {
        execFileSync("pwsh", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "pipe" });
      } catch (error) {
        errors.push({ id: method.id, index: index, shell: "powershell", text: text, message: String(error.stdout || error.message).split("\n")[0] });
      }
      return;
    }
    counts.skipped += 1;
  });
});

if (errors.length) {
  console.error("TABULA command audit failed:");
  errors.forEach(function (error) {
    console.error("  - " + error.id + " step " + error.index + " [" + error.shell + "]");
    console.error("    " + error.text);
    console.error("    " + error.message);
  });
  process.exit(1);
}

console.log(
  "TABULA command audit OK: " + counts.bash + " bash, " +
  counts.powershell + " PowerShell" +
  (havePwsh ? "" : " (pwsh not found, PowerShell skipped)") +
  ", " + counts.skipped + " interactive/cmd steps skipped."
);
