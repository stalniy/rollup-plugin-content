import fs from 'node:fs/promises';

export type FileDetails = {
  path: string,
  name: string
};
type Callback = (file: FileDetails) => void | Promise<void>;

async function walkPath(path: string, callback: Callback) {
  const files = await fs.readdir(path, { encoding: 'utf8', withFileTypes: true });
  const promises = files.map(async (file) => {
    if (file.isDirectory()) {
      await walkPath(`${path}/${file.name}`, callback);
    } else {
      await callback({
        path: `${path}/${file.name}`,
        name: file.name,
      });
    }
  });

  await Promise.all(promises);
}

export default {
  walkPath,
  readFile: fs.readFile,
};
