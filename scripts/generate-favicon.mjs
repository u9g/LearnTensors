import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(resolve(root, "public/logo.svg"));

await sharp(svg, { density: 300 })
  .resize(64, 64)
  .png()
  .toFile(resolve(root, "public/favicon.png"));

console.log("Generated public/favicon.png from logo.svg");
