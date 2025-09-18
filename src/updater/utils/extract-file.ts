import tar from "tar-stream";
import zlib from "zlib";
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  rmSync,
  existsSync,
} from "fs";
import { join, parse, dirname } from "path";

const LOCKED_FILES = ["updater.exe", "index.exe"];

import Loggers from "../../logger";

const { Updater } = new Loggers();

export const extractFile = async (path: string): Promise<void> => {
  if (!existsSync(path)) {
    throw Updater.execute([new Error(`Файл не был найден: ${path}`)], {
      level: "err",
    });
  }

  return new Promise((resolve, reject) => {
    Updater.execute("Распаковка начата...", { level: "debug" });
    const extract = tar.extract();
    const dirPath = parse(parse(path).dir).dir;

    let extractedCount = 0;

    extract.on("entry", (header, stream, next) => {
      const filePath = join(dirPath, header.name);
      Updater.execute(`Разрешение файла ${header.name} (${filePath})`, {
        level: "debug",
      });

      if (LOCKED_FILES.includes(filePath)) {
        Updater.execute("Файл закрыт, изменение невозможно", {
          level: "debug",
        });
        stream.resume();
        next();
        return;
      }

      if (header.name.includes("..") || header.name.startsWith("/")) {
        Updater.execute(`Проблема с именем файла ${header.name}`, {
          level: "warn",
        });
        stream.resume();
        next();
        return;
      }

      if (header.type === "directory") {
        Updater.execute("Файл оказался папкой, создание путей...", {
          level: "debug",
        });
        mkdirSync(filePath, { recursive: true });
        stream.resume();
        next();
        return;
      }

      Updater.execute("Поиск родительских путей...", { level: "debug" });
      const parentDir = dirname(filePath);
      if (!existsSync(parentDir)) {
        Updater.execute(
          "Родительский путь найден... создание родительских путей...",
          { level: "debug" },
        );
        mkdirSync(parentDir, { recursive: true });
      }

      Updater.execute("Создание записи файлов...", { level: "debug" });
      const writer = createWriteStream(filePath);

      writer.on("error", (error) => {
        Updater.execute(
          [`Произошла проблема с файлом ${filePath}`, { error }],
          { level: "err" },
        );
        stream.destroy(error);
        next(error);
      });

      writer.on("close", () => {
        Updater.execute(`Файл ${filePath} был создан`, { level: "debug" });
        extractedCount++;
        next();
      });

      stream.pipe(writer);
    });

    extract.on("error", (error) => {
      Updater.execute([`Произошла ошибка при распаковке`, { error }], {
        level: "err",
      });
      reject(error);
    });

    extract.on("finish", () => {
      Updater.execute(
        `Обновление завершено, файлов распаковано: ${extractedCount}`,
      );

      try {
        Updater.execute(`Удаление путя ${path}`);
        rmSync(path, { force: true });
        resolve();
      } catch (error) {
        Updater.execute(
          [`Произошла ошибка при удалении путя ${path}`, { error }],
          { level: "err" },
        );
        reject(error);
      }
    });

    createReadStream(path)
      .on("error", (error) => {
        Updater.execute(["Произошла ошибки при стриминге файлов", { error }], {
          level: "err",
        });
        reject(error);
      })
      .pipe(zlib.createGunzip())
      .on("error", (error) => {
        Updater.execute(["Произошла ошибки при стриминге файлов", { error }], {
          level: "err",
        });
        reject(error);
      })
      .pipe(extract);
  });
};
