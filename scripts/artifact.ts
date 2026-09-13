/* oxlint-disable no-console */
import fs from "node:fs";
import { finished } from "node:stream/promises";

import { ZipArchive } from "archiver";
import { join, resolve } from "pathe";

const ARCHIVE_DIRECTORY = resolve("dist");
const OUTPUT_PATH = resolve("coloor.zip");

const artifact = async () => {
  console.log("Artifact creation started.");

  const fileNames = await fs.promises.readdir(ARCHIVE_DIRECTORY, { recursive: true });
  const files = await Promise.all(
    fileNames.map(async (fileName) => {
      const absolutePath = join(ARCHIVE_DIRECTORY, fileName);
      const stat = await fs.promises.stat(absolutePath);
      return { absolutePath, directory: stat.isDirectory(), relativePath: fileName };
    }),
  );
  const output = fs.createWriteStream(OUTPUT_PATH);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.pipe(output);

  const artifactFiles = files.filter(
    (file) =>
      !file.directory &&
      !file.relativePath.includes(".DS_Store") &&
      !file.relativePath.endsWith(".zip"),
  );
  for (const file of artifactFiles) {
    archive.file(file.absolutePath, { name: file.relativePath });
  }

  const completion = finished(output);
  await archive.finalize();
  await completion;

  console.log(
    `Artifact created: ${OUTPUT_PATH} (${artifactFiles.length} files, ${archive.pointer()} bytes)`,
  );
};

try {
  await artifact();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
