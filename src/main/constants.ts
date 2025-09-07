import { join } from "path";

export const PROGRAM_NAME = "passworder";
export const FILE_NAME = ".passworder";
export const FILE_PATH = join(PROGRAM_NAME, ".passworder");
export const LATEST_PASSWORD_FILE = join(PROGRAM_NAME, "latest-password" + FILE_NAME);

export const AVAILABLE_PASSWORD_SYMBOLS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$";

export const STATUSES = {
  alreadyCreated: "Already created.",
  createdNow: "Created now."
} as const;

export const TYPES = {
  PASSWORD_CREATE: "PASSWORD CREATE",
  PASSWORD_GET: "PASSWORD GET",
  PASSWORD_OVERRIDE: "PASSWORD OVERRIDE"
} as const;