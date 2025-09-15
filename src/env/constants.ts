import { join } from "path";

export const PROGRAM_NAME = "passworder";
export const DIR_PATH = join(process.env.APPDATA || ".", PROGRAM_NAME);
export const FILE_NAME = "global.passworder";
export const FILE_PATH = join(DIR_PATH, FILE_NAME);
