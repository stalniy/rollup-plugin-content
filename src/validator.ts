import Ajv from 'ajv';
import { defaultSchema } from './schema';

export default function validator(schema: object | undefined | false) {
  if (schema === false) {
    return () => null;
  }

  const ajv = new Ajv();
  const validate = ajv.compile(schema || defaultSchema);

  return (page: unknown) => (validate(page) ? null : ajv.errorsText(validate.errors, {
    dataVar: 'page'
  }));
}
