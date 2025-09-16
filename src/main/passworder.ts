import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

import { mkdir, readFile, writeFile } from "fs/promises";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, parse } from "path";

import { Random } from "random-js";

import {
  LATEST_PASSWORD_FILE,
  PASSWORDER_RESPONSE,
  AVAILABLE_PASSWORD_SYMBOLS,
  MAIN_FILE_PATH,
  GLOBAL_FILE_PATH,
} from "../constants";

const GLOBAL_KEY = readFileSync(GLOBAL_FILE_PATH, "utf-8");
const random = new Random();

export type WatchServiceGet =
  | {
      successed: true;
      type: typeof PASSWORDER_RESPONSE.PASSWORD_GET;
      password: string;
    }
  | {
      successed: false;
      type: typeof PASSWORDER_RESPONSE.PASSWORD_GET;
      getPassword: (key: string) => string | false;
    };

export type WatchServiceCreate =
  | {
      successed: false;
      type: typeof PASSWORDER_RESPONSE.PASSWORD_CREATE;
      createPassword: (pass: string | true) => Promise<string>;
    }
  | {
      successed: true;
      type: typeof PASSWORDER_RESPONSE.PASSWORD_CREATE;
      password: string;
    };

export type WatchServiceOverride =
  | {
      successed: false;
      type: typeof PASSWORDER_RESPONSE.PASSWORD_OVERRIDE;
    }
  | {
      successed: true;
      type: typeof PASSWORDER_RESPONSE.PASSWORD_OVERRIDE;
      password: string;
    };

export type WatchServiceResponse =
  | WatchServiceGet
  | WatchServiceCreate
  | WatchServiceOverride;

export class Passworder {
  public static encrypt(key: string, salt: string, text: string) {
    const k = scryptSync(key, salt, 32);
    const iv = randomBytes(16);

    const cipher = createCipheriv("aes-256-cbc", k, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${encrypted}:${iv.toString("hex")}`;
  }

  public static decrypt(key: string, salt: string, encrypted: string) {
    try {
      if (!encrypted.includes(":")) throw new Error("Bad encrypted text.");

      const k = scryptSync(key, salt, 32);
      const [text, iv] = encrypted.split(":");

      const decipher = createDecipheriv(
        "aes-256-cbc",
        k,
        Buffer.from(iv, "hex"),
      );
      let decrypted = decipher.update(text, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  public static decryptGlobal(global: string) {
    return this.decrypt(GLOBAL_KEY, GLOBAL_KEY, global);
  }

  public static generatePassword(length: number = 15) {
    let output = "";

    for (let i = 0; i < length; i++) {
      output +=
        AVAILABLE_PASSWORD_SYMBOLS[
          random.integer(0, AVAILABLE_PASSWORD_SYMBOLS.length - 1)
        ];
    }

    return output;
  }

  public static async readFile() {
    return readFile(MAIN_FILE_PATH, "utf-8");
  }

  public static async createFile(global: string | null = null) {
    await mkdir(parse(MAIN_FILE_PATH).dir, { recursive: true });

    return writeFile(
      MAIN_FILE_PATH,
      JSON.stringify(
        {
          global: global,
          passwords: {},
        },
        undefined,
        2,
      ),
    );
  }

  public static writePassword(password: string) {
    return writeFile(join(".", LATEST_PASSWORD_FILE), password);
  }

  private _file: {
    global: string | null;
    passwords: Record<
      string,
      Record<
        string,
        {
          password: string;
          key: string;
        }
      >
    >;
  };

  public constructor(public readonly login: string) {
    mkdirSync(parse(MAIN_FILE_PATH).dir, { recursive: true });

    try {
      this._file = JSON.parse(readFileSync(MAIN_FILE_PATH, "utf-8"));
    } catch {
      writeFileSync(
        MAIN_FILE_PATH,
        JSON.stringify({
          global: null,
          passwords: {},
        }),
      );

      this._file = JSON.parse(readFileSync(MAIN_FILE_PATH, "utf-8"));
    }

    if (!this._file.passwords[login]) {
      this._file.passwords[login] = {};
    }
  }

  public list() {
    return Object.keys(this._file.passwords[this.login]);
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
    if (!(await this.validateGlobalKey(key)))
      throw new Error("Global key is not valided.");

    this._file.global = Passworder.encrypt(GLOBAL_KEY, GLOBAL_KEY, key);
    await this.writeFile(this._file);
  }

  public async addService(
    service: string,
    password: string | true,
    key?: string,
  ) {
    if (!this._file.global) throw new Error("Global key is null.");

    const hashKey = key
      ? Passworder.decryptGlobal(key)
      : Passworder.decryptGlobal(this._file.global);

    if (!hashKey) {
      throw new Error("Bad global key.");
    }

    const encrypted =
      password !== true
        ? Passworder.encrypt(hashKey, this.login, password)
        : Passworder.encrypt(
            hashKey,
            this.login,
            Passworder.generatePassword(),
          );

    this._file.passwords[this.login][service] = {
      password: encrypted,
      key: key
        ? Passworder.encrypt(GLOBAL_KEY, GLOBAL_KEY, hashKey)
        : this._file.global,
    };

    await this.writeFile(this._file);

    return encrypted;
  }

  public async deleteService(service: string) {
    const exists = this._file.passwords[this.login][service];

    if (!exists) {
      return false;
    }

    delete this._file.passwords[this.login][service];

    await this.writeFile(this._file);

    return true;
  }

  public async watchService(
    service: string,
    password?: string,
  ): Promise<WatchServiceResponse> {
    if (!this._file.global) throw new Error("Global key is null.");

    if (!password) {
      const servicePassword = this._file.passwords[this.login][service];
      if (servicePassword) {
        const global = Passworder.decryptGlobal(this._file.global);

        if (!global) {
          throw new Error("Bad global key.");
        }

        if (!(await this.validateGlobalKey(global)))
          throw new Error("Bad global key.");

        const key = Passworder.decryptGlobal(servicePassword.key);

        if (!key) {
          throw new Error("Bad key.");
        }

        const decrypted = Passworder.decrypt(
          key,
          this.login,
          servicePassword.password,
        );

        if (!decrypted) {
          return {
            successed: false,
            type: PASSWORDER_RESPONSE.PASSWORD_GET,
            getPassword: (key: string): string | false => {
              const decryptedSecondAttempt = Passworder.decrypt(
                key,
                this.login,
                servicePassword.password,
              );

              if (!decryptedSecondAttempt) {
                return false;
              }

              return decryptedSecondAttempt;
            },
          };
        }

        return {
          successed: true,
          type: PASSWORDER_RESPONSE.PASSWORD_GET,
          password: decrypted,
        };
      }

      return {
        successed: false,
        type: PASSWORDER_RESPONSE.PASSWORD_CREATE,
        createPassword: async (pass: string | true) => {
          if (!this._file.global) throw new Error("Global key is null.");

          const encrypted = await this.addService(service, pass);

          const global = Passworder.decryptGlobal(this._file.global);

          if (!global) {
            throw new Error("Bad global key.");
          }

          const decrypted = Passworder.decrypt(global, this.login, encrypted);

          if (!decrypted) {
            throw new Error("Decryption failded.");
          }

          return decrypted;
        },
      };
    }

    const servicePassword = this._file.passwords[this.login][service];
    if (servicePassword) {
      const global = Passworder.decryptGlobal(this._file.global);

      if (!global) {
        throw new Error("Bad global key.");
      }

      const key = Passworder.decryptGlobal(servicePassword.key);

      if (!key) {
        throw new Error("Bad key.");
      }

      const decryptedServicePassword = Passworder.decrypt(
        key,
        this.login,
        servicePassword.password,
      );

      if (decryptedServicePassword !== password) {
        return {
          successed: false,
          type: PASSWORDER_RESPONSE.PASSWORD_OVERRIDE,
        };
      }

      await this.addService(service, password);

      return {
        successed: true,
        type: PASSWORDER_RESPONSE.PASSWORD_OVERRIDE,
        password: password,
      };
    }

    await this.addService(service, password);

    return {
      successed: true,
      type: PASSWORDER_RESPONSE.PASSWORD_CREATE,
      password: password,
    };
  }

  public async init() {
    try {
      await Passworder.readFile();
    } catch {
      await Passworder.createFile();
    }

    return this;
  }

  private writeFile(file: typeof this._file) {
    return writeFile(MAIN_FILE_PATH, JSON.stringify(file, undefined, 2));
  }
}

export default Passworder;
