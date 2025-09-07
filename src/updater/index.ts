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
  VERSION_FILE_NAME
} from "./utils";

export class AutoUpdater {
  private readonly versionFilePath = join(".", VERSION_FILE_NAME);

  public async execute() {
    const folderPath = join(".", LATEST_FILE_NAME);
    const filePath = join(folderPath, RELEASE_FILE_NAME);
  
    const url = await this.fetchRelease();
  
    if (!url) return;

    await this.downloadRelease(url, filePath);
    await this.extractFile(filePath);

    return process.exit();
  }
  
  private async fetchRelease(): Promise<string | false> {
    const response = await fetch(RELEASE_URL, {
      method: "GET",
    });
    
    const release = await response.json();
    const { url } = await fetch(getDownloadUrl(release.tag_name));
    
    if (existsSync(this.versionFilePath) && release.tag_name.slice(1) === await readFile(this.versionFilePath, "utf-8")) {
      return false;
    }

    await writeFile(this.versionFilePath, release.tag_name.slice(1), "utf-8");

    return url;
  }
  
  private async extractFile(path: string): Promise<true> {
    return new Promise<true>((resolve) => {
      extractFile(path);
  
      setTimeout(() => resolve(true), 1000);
    });
  }
  
  private async downloadRelease(url: string, path: string): Promise<boolean|unknown> {
    return new Promise<boolean|unknown>((resolve, reject) => {
      downloadFile(url, path)
        .then(() => {
          setTimeout(() => {
            resolve(true);
          }, 1000);
        })
        .catch(reject);
    });
  }
}

new AutoUpdater().execute();

export default AutoUpdater;
