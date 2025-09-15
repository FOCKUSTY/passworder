import { join } from "path";

import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";

import {
  downloadFile,
  extractFile,
  getDownloadUrl,
  LATEST_FILE_NAME,
  RELEASE_FILE_NAME,
  RELEASE_URL,
  VERSION_FILE_NAME,
} from "./utils";

import Loggers from "../logger";

const { Updater } = new Loggers();

export class AutoUpdater {
  private readonly versionFilePath = join(".", VERSION_FILE_NAME);

  public async execute() {
    const folderPath = join(".", LATEST_FILE_NAME);
    const filePath = join(folderPath, RELEASE_FILE_NAME);
    
    Updater.execute("Проверка начилия обновлений...", { level: "info" });
    Updater.execute("Поиск релиза...", { level: "info" });
    
    const url = await this.fetchRelease();
    if (!url) {
      Updater.execute("Релиз не был найден", { level: "info" });
      Updater.execute([
        "Ошибка, релиз не был найден", {
        url
      }], { level: "err" });    
      
      return;
    };

    try {
      await this.downloadRelease(url, filePath);
      await this.extractFile(filePath);
    } catch (error) {
      Updater.execute(["Произошла ошибки при установке или распаковки файлов", error], { level: "err" });
      throw Updater.execute("Произошла какая-то ошибка, подробнее в логах", { level: "err" });
    }

    return process.exit();
  }

  private async fetchRelease(): Promise<string | false> {
    const response = await fetch(RELEASE_URL, {
      method: "GET",
    });

    const release = await response.json();
    const { url } = await fetch(getDownloadUrl(release.tag_name));

    if (
      existsSync(this.versionFilePath) &&
      release.tag_name.slice(1) ===
        (await readFile(this.versionFilePath, "utf-8"))
    ) {
      return false;
    }

    await writeFile(this.versionFilePath, release.tag_name.slice(1), "utf-8");

    return url;
  }

  private async extractFile(path: string): Promise<true> {
    return new Promise<true>((resolve) => {
      Updater.execute("Распаковка файлов...", { level: "info" });
      extractFile(path);

      setTimeout(() => {
        Updater.execute("Распаковка завершена", { level: "info" });
        resolve(true);
      }, 1000);
    });
  }

  private async downloadRelease(
    url: string,
    path: string,
  ): Promise<boolean | unknown> {
    return new Promise<boolean | unknown>((resolve, reject) => {
      Updater.execute("Установка релиза...", { level: "info" });
      downloadFile(url, path)
        .then(() => {
          setTimeout(() => {
            Updater.execute("Установка завершена", { level: "info" });
            resolve(true);
          }, 1000);
        })
        .catch(err => {
          Updater.execute(["Произошла какая-то ошибка", {err}], { level: "err" });
          reject(err);
        });
    });
  }
}

new AutoUpdater().execute();

export default AutoUpdater;
