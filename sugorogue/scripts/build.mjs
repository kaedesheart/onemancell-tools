import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = fileURLToPath(new URL("../../dist/", import.meta.url));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const path of ["index.html", "style.css", "manifest.json", "src"])
  await cp(join(root, path), join(out, path), { recursive: true });
console.log("Built standalone Sugorogue in dist/");
