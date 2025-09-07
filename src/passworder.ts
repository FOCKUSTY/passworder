import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync
} from "crypto";

import { readFile, writeFile } from "fs/promises";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

import { Random } from "random-js";

import { FILE_NAME, LATEST_PASSWORD_FILE, STATUSES, TYPES } from "./constants";

const random = new Random();

type WatchServiceResponse = ({
  successed: true,
  type: typeof TYPES.PASSWORD_GET,
  password: string
} | {
  successed: false,
  type: typeof TYPES.PASSWORD_CREATE,
  execute: (pass: string|true) => Promise<string>
} | {
  successed: false,
  type: typeof TYPES.PASSWORD_OVERRIDE
} | {
  successed: true,
  type: typeof TYPES.PASSWORD_OVERRIDE
  password: string,
} | {
  successed: true,
  type: typeof TYPES.PASSWORD_CREATE,
  password: string,
})

const AVAILABLE_PASSWORD_SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$";

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

  public static decryptGlobal(global: string) {
    return this.decrypt("GLOBAL_KEY", "GLOBAL_KEY", global);
  }

  public static generatePassword(length: number = 15) {
    let output = "";

    for (let i = 0; i < length; i++) {
      output += AVAILABLE_PASSWORD_SYMBOLS[random.integer(0, AVAILABLE_PASSWORD_SYMBOLS.length-1)];
    };

    return output;
  }

  public static async readFile() {
    return readFile(join(".", FILE_NAME), "utf-8");
  }

  public static async createFile(global: string|null = null) {
    return writeFile(join(".", FILE_NAME), JSON.stringify({
      global: global,
      passwords: {}
    }, undefined, 2));
  }

  public static writePassword(password: string) {
    return writeFile(join(".", LATEST_PASSWORD_FILE), password);
  }

  private _file: {
    global: string|null,
    passwords: Record<string, Record<string, string>>
  };

  public constructor(public readonly login: string) {
    try {
      this._file = JSON.parse(readFileSync(join(".", FILE_NAME), "utf-8"));
    } catch {
      writeFileSync(join(".", FILE_NAME), JSON.stringify({
        global: null,
        passwords: {}
      }));

      this._file = JSON.parse(readFileSync(join(".", FILE_NAME), "utf-8"));
    }

    if (!this._file.passwords[login]) {
      this._file.passwords[login] = {};
    }
  }

  public async validateGlobalKey(key: string) {
    if (!this._file.global) {      
      return true;
    }

    const decrypted = Passworder.decryptGlobal(this._file.global);
    
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

  public async addService(service: string, password: string|true) {
    if (!this._file.global) throw new Error("Global key is null.");

    const encrypted = password !== true
      ? Passworder.encrypt(Passworder.decryptGlobal(this._file.global), this.login, password)
      : Passworder.encrypt(Passworder.decryptGlobal(this._file.global), this.login, Passworder.generatePassword());

    this._file.passwords[this.login][service] = encrypted;

    await this.writeFile(this._file);

    return encrypted;
  }

  public async watchService(service: string, password?: string): Promise<WatchServiceResponse> {
    if (!this._file.global) throw new Error("Global key is null.");
    
    if (!password) {
      const servicePassword = this._file.passwords[this.login][service];
      if (servicePassword) {
        if (!await this.validateGlobalKey(Passworder.decryptGlobal(this._file.global))) throw new Error("Bad global key.");

        return {
          successed: true,
          type: TYPES.PASSWORD_GET,
          password: Passworder.decrypt(Passworder.decryptGlobal(this._file.global), this.login, servicePassword)
        }
      };

      return {
        successed: false,
        type: TYPES.PASSWORD_CREATE,
        execute: async (pass: string|true) => {
          if (!this._file.global) throw new Error("Global key is null.");

          const encrypted = await this.addService(service, pass);
          
          return Passworder.decrypt(Passworder.decryptGlobal(this._file.global), this.login, encrypted);
        }
      };
    }

    const servicePassword = this._file.passwords[this.login][service];
    if (servicePassword) {
      const decryptedServicePassword = Passworder.decrypt(Passworder.decryptGlobal(this._file.global), this.login, servicePassword);
      
      if (decryptedServicePassword !== password) {
        return {
          successed: false,
          type: TYPES.PASSWORD_OVERRIDE
        }
      };

      await this.addService(service, password);
      
      return {
        successed: true,
        type: TYPES.PASSWORD_OVERRIDE,
        password: password
      }
    }

    await this.addService(service, password);
    
    return {
      successed: true,
      type: TYPES.PASSWORD_CREATE,
      password: password
    }
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
    return writeFile(join(".", FILE_NAME), JSON.stringify(file, undefined, 2))
  }
}

export default Passworder;
