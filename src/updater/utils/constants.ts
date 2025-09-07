export const RELEASE_FILE_NAME = "release.tar.gz";
export const LATEST_FILE_NAME = "latest";

export const RELEASE_URL =
  "https://api.github.com/repos/FOCKUSTY/passworder/releases/latest";

export const getDownloadUrl = (version: string): string =>
  `https://github.com/FOCKUSTY/passworder/releases/download/${version}/${RELEASE_FILE_NAME}`;
