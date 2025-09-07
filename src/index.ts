import { exec, spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const UPDATER_FILE = join(process.cwd(), "updater.exe");
const INDEX_FILE = join(process.cwd(), "latest", "index.exe");

(async () => {
  if (!existsSync(UPDATER_FILE)) {
    throw new Error("Updater file not found: " + UPDATER_FILE);
  }

  console.log("Starting updater from:", UPDATER_FILE);
  
  try {
    await new Promise((resolve, reject) => {
      const updater = spawn(UPDATER_FILE, [], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      updater.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Updater exited with code ${code}`));
        }
      });

      updater.on('error', (error) => {
        console.error("Spawn error:", error);
        reject(error);
      });
    });

    console.log("Updater completed, starting index...");
    console.clear();

    if (existsSync(INDEX_FILE)) {
      spawn(INDEX_FILE, [], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } else {
      console.error("Index file not found:", INDEX_FILE);
    }
  } catch (error) {
    console.error("Error:", error);
  }
})();