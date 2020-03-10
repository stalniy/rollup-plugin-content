import Ajv from 'ajv';
import { defaultSchema } from './schema';

export default function validator(schema: object | undefined | false) {
  const ajv = new Ajv();
  const validate = schema === false
    ? () => null
    : ajv.compile(schema || defaultSchema);

  return (page: unknown) => {
    if (!validate(page)) {
      const errors = (validate as Ajv.ValidateFunction).errors;
      return ajv.errorsText(errors);
    }

    return null;
  }
}
