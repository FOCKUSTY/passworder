import { join } from "path";

export const PROGRAM_NAME = "passworder";
export const FILE_NAME = ".passworder";
export const FILE_PATH = join(PROGRAM_NAME, ".passworder");
export const LATEST_PASSWORD_FILE = join(PROGRAM_NAME, "latest-password" + FILE_NAME);
export const VERSION_FILE_PATH = join(".", ".version");

export const DIR_PATH = join(process.env.APPDATA||".", PROGRAM_NAME);
export const GLOBAL_FILE_NAME = "global.passworder"
export const GLOBAL_FILE_PATH = join(DIR_PATH, GLOBAL_FILE_NAME);

export const AVAILABLE_PASSWORD_SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$";

export const YES_ANSWERS = [
  "y",
  "yes",
  "н",
  "нуы",
  "да",
  "д"
];

export const STATUSES = {
  alreadyCreated: "Already created.",
  createdNow: "Created now."
} as const;

export const TYPES = {
  PASSWORD_CREATE: "PASSWORD CREATE",
  PASSWORD_GET: "PASSWORD GET",
  PASSWORD_OVERRIDE: "PASSWORD OVERRIDE"
} as const;