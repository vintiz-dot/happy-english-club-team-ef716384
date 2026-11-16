#!/usr/bin/env node
// Thin launcher so `hec-docs` works as an installed bin on Windows and Linux.
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "src", "cli.ts")).href);
