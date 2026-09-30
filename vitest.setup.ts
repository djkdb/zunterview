/** Tests read the on-demand data files from disk (the browser fetches them from /data). */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { setDataLoader } from "./shared/dataLoader";

setDataLoader(async (path) => JSON.parse(await readFile(join(process.cwd(), "public/data", path), "utf8")));
