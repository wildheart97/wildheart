#!/usr/bin/env node
// Parcourt le dossier d'images et écrit manifest.json (la liste lue par la galerie).
// Usage : node tools/build-manifest.mjs   (depuis la racine du site)
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.argv[2] || "images";
const OUT = process.argv[3] || "manifest.json";
const IMG = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

if (!existsSync(ROOT)) {
  console.error(`Dossier "${ROOT}" introuvable.`);
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (IMG.test(e.name)) files.push(relative(ROOT, p).split(sep).join("/"));
  }
})(ROOT);

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
files.sort(collator.compare);

writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), count: files.length, files }, null, 1) + "\n");
console.log(`✓ ${files.length} images listées dans ${OUT}`);
