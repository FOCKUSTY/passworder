import { join } from "path";

import { version } from "../../package.json";

import { downloadFile, extractFile, getDownloadUrl, LATEST_FILE_NAME, RELEASE_FILE_NAME, RELEASE_URL } from "./utils";

export class AutoUpdater {
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
    
    if (release.tag_name.slice(1) === version) {
      return false;
    }

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
