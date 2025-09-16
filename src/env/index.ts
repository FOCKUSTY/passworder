import { readFile, mkdir, writeFile } from "fs/promises";

import { DIR_PATH, GLOBAL_FILE_PATH } from "../constants";
import { pseudoRandomBytes } from "crypto";

(async () => {
  try {
    await mkdir(DIR_PATH, { recursive: true });
  } catch {
    /* empty */
  }

  try {
    await readFile(GLOBAL_FILE_PATH);
    return process.exit();
  } catch {
    const global = pseudoRandomBytes(6 ** 6).toString("ascii");
    await writeFile(GLOBAL_FILE_PATH, global, "utf-8");
  }

  return process.exit();
})();
