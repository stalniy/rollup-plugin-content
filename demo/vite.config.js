import { defineConfig } from 'vite';
import yaml from 'js-yaml';
import { content, summary } from '../src/index.ts';

export default defineConfig({
  root: __dirname,
  plugins: [
    content({
      langs: ['en', 'uk'],
      parse: (source) => yaml.load(source),
      pageSchema: false, // Disable schema validation for demo
      plugins: [
        summary({
          fields: ['id', 'title', 'createdAt'],
          sortBy: ['-createdAt'],
        }),
      ],
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
});
