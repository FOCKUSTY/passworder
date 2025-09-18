import { mkdirSync } from "fs";
import { join } from "path";

import Configurator from "fock-logger/config";
import { Colors } from "fock-logger/colors";

export const PROGRAM_NAME = "passworder";
export const DIR_PATH = join(process.env.APPDATA || ".", PROGRAM_NAME);
export const FOCK_LOGGER__DIR = join(DIR_PATH, "fock-logger");

(() => {
  mkdirSync(FOCK_LOGGER__DIR, { recursive: true });

  new Configurator({
    dir: FOCK_LOGGER__DIR,
    create_file: true,
    overwrite_file: true,
    date: false,
    logging: true,
    levels: {
      debug: 0,
      warn: 1,
      info: 2,
      error: 3,
    },
    level: "info",
    colors: [Colors.cyan, Colors.green],
  });
})();

import Logger from "fock-logger";

export class Loggers {
  public readonly Updater = new Logger("Updater", {
    colors: [Colors.cyan, Colors.magenta],
    prefix: "updater",
    write: true,
    dir: FOCK_LOGGER__DIR,
  });

  public readonly Main = new Logger("Passworder", {
    colors: [Colors.red, Colors.magenta],
    prefix: "passworder",
    write: true,
    dir: FOCK_LOGGER__DIR,
  });

  public readonly Env = new Logger("Env", {
    prefix: "env",
    write: true,
    dir: FOCK_LOGGER__DIR,
  });
}

Object.values(new Loggers()).forEach((logger) =>
  logger.execute("Приветствуем!"),
);

export default Loggers;
