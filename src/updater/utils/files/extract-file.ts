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

export const extractFile = async (path: string): Promise<void> => {
  if (!existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }

  return new Promise((resolve, reject) => {
    const extract = tar.extract();
    const dirPath = parse(parse(path).dir).dir;

    let extractedCount = 0;

    extract.on("entry", (header, stream, next) => {
      const filePath = join(dirPath, header.name);

      if (LOCKED_FILES.includes(filePath)) {
        stream.resume();
        next();
        return;
      }

      if (header.name.includes("..") || header.name.startsWith("/")) {
        stream.resume();
        next();
        return;
      }

      if (header.type === "directory") {
        mkdirSync(filePath, { recursive: true });
        stream.resume();
        next();
        return;
      }

      const parentDir = dirname(filePath);
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }

      const writer = createWriteStream(filePath);

      writer.on("error", (error) => {
        stream.destroy(error);
        next(error);
      });

      writer.on("close", () => {
        extractedCount++;
        next();
      });

      stream.pipe(writer);
    });

    extract.on("error", reject);
    extract.on("finish", () => {
      console.log(`Extracted ${extractedCount} files`);
      try {
        rmSync(path, { force: true });
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    createReadStream(path)
      .on("error", reject)
      .pipe(zlib.createGunzip())
      .on("error", reject)
      .pipe(extract);
  });
};
