import { get, set } from 'lodash-es';
import { SummarizerOptions, ParsingContext } from './types';

export const generateAssetUrl = (id: string) => `import.meta.ROLLUP_FILE_URL_${id}`;

type GenerateRef = (ref: any, lang?: string) => string;

export function serializeRefs(refs: Record<string, any>, generate: GenerateRef = generateAssetUrl) {
  const content = Object.keys(refs)
    .map((key) => `"${key}": ${generate(refs[key], key)}`)
    .join(',\n');

  return `{${content}}`;
}

export const returnTrue = () => true;

type GenId = NonNullable<SummarizerOptions<{ id: any }>['resolve']['id']>;
export const fileNameId: GenId = (_1, _2, { lang, relativePath, ext }) => {
  const index = lang.length + ext.length + 1;
  const id = relativePath.slice(0, -index);

  return id || 'default';
};

export function pick<T extends {}>(
  object: T,
  options: SummarizerOptions<T>,
  context: ParsingContext<string>,
) {
  return options.fields.reduce((partialItem, field) => {
    const resolve = options.resolve[field];
    const value = typeof resolve === 'function'
      ? resolve(object, field, context, options)
      : get(object, field);

    if (typeof value !== 'undefined') {
      set(partialItem, field, value);
    }

    return partialItem;
  }, {});
}
