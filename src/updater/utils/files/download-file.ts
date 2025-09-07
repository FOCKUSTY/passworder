import https from "https";

import { rm } from "node:fs/promises";
import { existsSync, createWriteStream, mkdirSync } from "node:fs";

import { parse } from "path";

const createDir = (path: string): string[] => {
  const dirs: string[] = [];

  const create = (filePath: string = path) => {
    if (!filePath) {
      dirs.shift();
      return dirs;
    };

    const path = parse(filePath).dir;

    if (existsSync(path)) return dirs;

    dirs.unshift(path);
    return create(path);
  };

  return create(path);
};

export const downloadFile = async (
  url: string,
  path: string,
): Promise<boolean | unknown> => {
  const dirPath = parse(path).dir;

  return new Promise<boolean | unknown>((resolve, reject) => {
    rm(dirPath, { force: true, recursive: true })
      .then(() => {
        createDir(path).forEach((path) => {
          mkdirSync(path);
        });

        const file = createWriteStream(path);

        https.get(url, (response) => {
          console.log(`downloading into ${path}...`);
          response.pipe(file);

          file.on("finish", () => {
            console.log("downloaded!");
            file.close();
            resolve(true);
          });

          file.on("error", reject);
        });
      })
      .catch(reject);
  });
};
