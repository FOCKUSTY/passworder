import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

import Loggers from "./logger";

const UPDATER_FILE = join(process.cwd(), "updater.exe");
const SECURITY_FILE = join(process.cwd(), "security.exe");
const INDEX_FILE = join(process.cwd(), "latest", "index.exe");

const { Updater, Env, Main } = new Loggers();

(async () => {
  if (!existsSync(UPDATER_FILE)) {
    throw Env.execute(
      [new Error("Файл обновления не был найден: " + UPDATER_FILE)],
      { level: "err" },
    );
  }

  Env.execute("Начало обнолвения с " + UPDATER_FILE, { level: "info" });

  try {
    await new Promise((resolve, reject) => {
      Updater.execute("Запуск " + UPDATER_FILE, {
        level: "debug",
        write: true,
      });

      const updater = spawn(UPDATER_FILE, [], {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      updater.on("close", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          Env.execute([new Error(`Программа завершена с кодом ${code}`)], {
            level: "err",
          });
          reject(false);
        }
      });

      updater.on("error", (error) => {
        Env.execute(["Spawn-ошибка", { error }], { level: "err" });
        reject(false);
      });
    });

    Env.execute("Автообнолвение заверешного, запуск главного файла...", {
      level: "debug",
    });

    console.clear();

    Env.execute("Поиск файла-защитника " + SECURITY_FILE, { level: "debug" });
    if (existsSync(SECURITY_FILE)) {
      spawn(SECURITY_FILE, [], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } else {
      throw Env.execute(
        [new Error("security файла не существует: " + SECURITY_FILE)],
        { level: "err" },
      );
    }

    Env.execute("Поиск главного файла " + INDEX_FILE);
    if (existsSync(INDEX_FILE)) {
      spawn(INDEX_FILE, [], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } else {
      throw Env.execute(
        [new Error("index файла не существует: " + INDEX_FILE)],
        { level: "err" },
      );
    }
  } catch (error) {
    Env.execute([{ error }], { level: "err" });
    process.exit();
  }
})();
