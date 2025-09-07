import { readFile, mkdir, writeFile } from "fs/promises";

import { DIR_PATH, FILE_PATH } from "./constants";
import { pseudoRandomBytes } from "crypto";

(async () => {
  try {
    await mkdir(DIR_PATH, { recursive: true });
  } catch { /* empty */ }
  
  try {
    await readFile(FILE_PATH);
    return process.exit();
  } catch {
    const global = pseudoRandomBytes(1024).toString("base64url");
    await writeFile(FILE_PATH, global, "utf-8");
  }

  return process.exit();
})();