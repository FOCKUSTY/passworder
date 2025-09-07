import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync
} from "crypto";

import { readFile, writeFile } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";

import { FILE_NAME, STATUSES } from "./constants";

export class Passworder {
  public static encrypt(key: string, salt: string, text: string) {
    const k = scryptSync(key, salt, 32)
    const iv = randomBytes(16)

    const cipher = createCipheriv('aes-256-cbc', k, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${encrypted}:${iv.toString('hex')}`;
  }

  public static decrypt(key: string, salt: string, encrypted: string) {
    if (!encrypted.includes(":")) throw new Error("Bad encrypted text.");

    const k = scryptSync(key, salt, 32);
    const [ text, iv ] = encrypted.split(":");

    const decipher = createDecipheriv('aes-256-cbc', k, Buffer.from(iv, "hex"));
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  public static async readFile() {
    return readFile(join(".", FILE_NAME), "utf-8");
  }

  public static async createFile(global: string|null = null) {
    return writeFile(join(".", FILE_NAME), JSON.stringify({
      global: global,
      passwords: {}
    }));
  }

  private _file: {
    global: string|null,
    passwords: Record<string, Record<string, string>>
  };

  public constructor(public readonly login: string) {
    this._file = JSON.parse(readFileSync(join(".", FILE_NAME), "utf-8"));
  }

  public async validateGlobalKey(key: string) {
    if (!this._file.global) {      
      return true;
    }

    const decrypted = Passworder.decrypt("GLOBAL_KEY", "GLOBAL_KEY", this._file.global);
    
    if (key === decrypted) {
      return true;
    }

    return false;
  }

  public async writeGlobalKey(key: string) {
    if (!await this.validateGlobalKey(key)) throw new Error("Global key is not valided.");

    this._file.global = Passworder.encrypt("GLOBAL_KEY", "GLOBAL_KEY", key);
    await this.writeFile(this._file);
  }

  public async addService(service: string, password: string) {
    if (!this._file.global) throw new Error("Global key is null");

    const encrypted = Passworder.encrypt(this._file.global, this.login, password);

    this._file.passwords[this.login][service] = encrypted;

    await this.writeFile(this._file);

    return this._file;
  }

  public async getFileStatus() {
    try {
      await Passworder.readFile();
      return STATUSES.alreadyCreated;
    } catch {
      await Passworder.createFile();
      return STATUSES.createdNow;
    }
  }

  private writeFile(file: typeof this._file) {
    return writeFile(join(".", FILE_NAME), JSON.stringify(file))
  }
}

export default Passworder;
