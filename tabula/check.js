#!/usr/bin/env node
/*
 * Schema guard for the TABULA catalogue. Run from the repository root:
 *   node tabula/check.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "methods.js"), "utf8"), sandbox, { filename: "methods.js" });
vm.runInNewContext(fs.readFileSync(path.join(root, "tools.js"), "utf8"), sandbox, { filename: "tools.js" });

const methods = sandbox.window.TABULA_METHODS;
const tools = sandbox.window.TABULA_TOOLS;
const groups = sandbox.window.TABULA_CHANNEL_GROUPS;
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!Array.isArray(methods)) {
  fail("TABULA_METHODS is not an array");
} else {
  const ids = new Set();
  const profiles = new Set(["all", "core", "exotic", "lolbins"]);
  const directions = new Set(["deliver", "exfil"]);
  const systems = new Set(["windows", "linux"]);

  methods.forEach(function (method, index) {
    const label = method.id || "#" + index;
    if (!method.id) fail(label + ": missing id");
    if (ids.has(method.id)) fail(label + ": duplicate id");
    ids.add(method.id);

    if (!method.title) fail(label + ": missing title");
    if (!method.channel) fail(label + ": missing channel");
    if (!tools[method.channel]) fail(label + ": unknown channel " + method.channel);
    if (!method.family) fail(label + ": missing family");
    if (tools[method.channel] && tools[method.channel].families.indexOf(method.family) === -1) {
      fail(label + ": family " + method.family + " is not declared for channel " + method.channel);
    }
    if (typeof method.priority !== "number") fail(label + ": priority must be a number");
    if (!Array.isArray(method.profiles) || !method.profiles.length) fail(label + ": missing profiles");
    (method.profiles || []).forEach(function (profile) {
      if (!profiles.has(profile)) fail(label + ": unknown profile " + profile);
    });
    if (!directions.has(method.direction)) fail(label + ": unknown direction " + method.direction);
    [].concat(method.os).forEach(function (os) {
      if (!systems.has(os)) fail(label + ": unknown os " + os);
    });
    if (!method.docs) fail(label + ": missing docs path");
    if (method.docs && !fs.existsSync(path.resolve(root, "..", method.docs))) {
      fail(label + ": docs file not found: " + method.docs);
    }
    if (method.fileExt && !/^[a-z0-9]+$/i.test(method.fileExt)) {
      fail(label + ": fileExt must be a bare extension such as ps1 or sct");
    }
    if (method.helpers !== undefined) {
      if (!Array.isArray(method.helpers) || !method.helpers.length) {
        fail(label + ": helpers must be a non-empty array");
      } else {
        method.helpers.forEach(function (helper, helperIndex) {
          if (!helper.name) fail(label + ": helper " + helperIndex + " has no name");
          if (!helper.text) fail(label + ": helper " + helperIndex + " has no text");
          if (helper.side && ["lhost", "rhost"].indexOf(helper.side) === -1) {
            fail(label + ": helper " + helperIndex + " has an invalid side");
          }
        });
      }
    }
    if (method.warning !== undefined) {
      if (!method.warning || !method.warning.en || !method.warning.ru) {
        fail(label + ": warning must contain en and ru text");
      }
    }

    const steps = method.steps || [
      method.server,
      ...[].concat(method.client || [])
    ].filter(Boolean);
    if (!steps.length) fail(label + ": no steps");

    steps.forEach(function (step, stepIndex) {
      const side = step.side || (method.steps ? undefined : stepIndex === 0 ? "lhost" : "rhost");
      if (!step.shell || !step.text) fail(label + ": step " + stepIndex + " is incomplete");
      if (side === "rhost" && step.text.indexOf("{lhostpath}") !== -1) {
        const allowed = ["scp-reverse-deliver", "scp-reverse-exfil", "iodine"];
        if (allowed.indexOf(method.id) === -1) {
          fail(label + ": target-side step uses {lhostpath}");
        }
      }
    });
  });
}

Object.keys(tools).forEach(function (channel) {
  const tool = tools[channel];
  if (!tool.group || !groups[tool.group]) fail("channel " + channel + ": unknown group");
  if (typeof tool.order !== "number") fail("channel " + channel + ": missing order");
  if (!Array.isArray(tool.families) || !tool.families.length) fail("channel " + channel + ": missing families");
  if (!methods.some(function (method) { return method.channel === channel; })) {
    fail("channel " + channel + ": no methods");
  }
});

if (errors.length) {
  console.error("TABULA catalogue check failed:");
  errors.forEach(function (error) { console.error("  - " + error); });
  process.exit(1);
}

console.log("TABULA catalogue OK: " + methods.length + " methods, " + Object.keys(tools).length + " channels.");
