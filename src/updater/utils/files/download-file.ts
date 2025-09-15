import https from "https";

import { rm } from "node:fs/promises";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";

import { parse } from "path";

import Loggers from "../../../logger";

const { Updater } = new Loggers();

export const downloadFile = async (
  url: string,
  path: string,
): Promise<boolean | unknown> => {
  const dirPath = parse(path).dir;

  return new Promise<boolean | unknown>((resolve, reject) => {
    rm(dirPath, { force: true, recursive: true })
      .then(() => {
        Updater.execute(`Проверка пути ${path}`, { level: "debug" });
        if (!existsSync(path)) {
          Updater.execute(`Создание пути ${path}`, { level: "debug" });
          mkdirSync(path, { recursive: true });
        }

        Updater.execute("Создание стриминга файла", { level: "debug" });
        const file = createWriteStream(path);

        https.get(url, (response) => {
          Updater.execute(`Установка файла в ${path}`, { level: "info" });
          response.pipe(file);

          file.on("finish", () => {
            Updater.execute("Файл был успешно установлен", { level: "info" });
            console.log("downloaded!");
            file.close();
            resolve(true);
          });

          file.on("error", (error) => {
            Updater.execute([
              "Произошла ошибка при установке файла",
              {error}
            ], { level: "err" });
            reject(error);
          });
        });
      })
      .catch(reject);
  });
};
