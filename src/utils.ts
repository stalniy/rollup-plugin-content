import { GetPageId } from './types';

export const generateAssetUrl = (id: string) => `import.meta.ROLLUP_ASSET_URL_${id}`;

type GenerateRef = (ref: any, lang?: string) => string;

export function serializeRefs(refs: Record<string, any>, generate: GenerateRef = generateAssetUrl) {
  const content = Object.keys(refs)
    .map((key) => `"${key}": ${generate(refs[key], key)}`)
    .join(',\n');

  return `{${content}}`;
}

export const returnTrue = () => true;

export const fileNameId: GetPageId<string> = (_, { lang, relativePath, ext }) => {
  const index = lang.length + ext.length + 1;
  const id = relativePath.slice(0, -index);

  return id || 'default';
};
