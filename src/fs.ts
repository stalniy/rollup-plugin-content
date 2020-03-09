import fs from 'fs';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);

export type FileDetails = {
  path: string,
  name: string
};
type Callback = (file: FileDetails) => void;

async function walkPath(path: string, callback: Callback) {
  const files = await readdir(path, { encoding: 'utf8', withFileTypes: true });
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
  readFile,
};
