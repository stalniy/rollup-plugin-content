# Changelog

## [0.8.0](https://github.com/stalniy/rollup-plugin-content/compare/v0.7.1...v0.8.0) (2026-01-07)


### Features

* adds vite compatibility ([5551c04](https://github.com/stalniy/rollup-plugin-content/commit/5551c048180ecd54d5ca067a6688dd6f32b5f571))
* **lib:** adds support to pass `pageSchema` = `false` ([71d7b2e](https://github.com/stalniy/rollup-plugin-content/commit/71d7b2eb11040ba6844a0d0eee4b4995bb783cb7))
* **parse:** adds parsing context to `parse` function ([7133ab3](https://github.com/stalniy/rollup-plugin-content/commit/7133ab3668a8f49ebd3da799297bb5ad493c9cdc))
* **plugin:** adds `files` option to restrict processed files, renames `matches` to `entry` ([e95bfc5](https://github.com/stalniy/rollup-plugin-content/commit/e95bfc58913cae1073509ce3c55c27187858200c))
* **plugin:** adds page `id` field ([0ae255b](https://github.com/stalniy/rollup-plugin-content/commit/0ae255b44e6a215effcf3408e0091bc2e38260e1))
* **plugin:** adds plugin and all required infra ([1cb7727](https://github.com/stalniy/rollup-plugin-content/commit/1cb7727991974c449b1fad4cd54af011ca0252e7))
* **plugin:** adds possibility to restrict fields in the end main file ([fdd2643](https://github.com/stalniy/rollup-plugin-content/commit/fdd264342debe60c6212afac3cb718bdaee3b4cd))
* **plugin:** adds support for plugins ;) ([9c26860](https://github.com/stalniy/rollup-plugin-content/commit/9c268606d811c9bfb67b84c3bb116ab7bdb3a95f))
* **plugin:** replaces deprecated ROLLUP_ASSET_URL_ with ROLLUP_FILE_URL_ ([5e0f8be](https://github.com/stalniy/rollup-plugin-content/commit/5e0f8be1c33377de1ce42d8caebe9fa909e73b10))
* **summarizer:** makes summarizer to be configurable via options ([ae213c7](https://github.com/stalniy/rollup-plugin-content/commit/ae213c76883f44d924e75a9c65c3f3c0fd45dd8c))


### Bug Fixes

* fixes eslint errors ([cf42fdc](https://github.com/stalniy/rollup-plugin-content/commit/cf42fdc95a0e50fcef6ee72583167dbe18736af5))
* **package:** adds content.d.ts file to package ([d4afb9c](https://github.com/stalniy/rollup-plugin-content/commit/d4afb9c0dd1a58a4b700c6574f60ec5f1ae28339))
* **plugin:** makes sure fields are specified before trying to pick them from page ([357e163](https://github.com/stalniy/rollup-plugin-content/commit/357e163579cfc4b9c0d7d2ab0f045ebd68f370ae))
* **plugin:** makes sure generics are correctly propagated ([df5206e](https://github.com/stalniy/rollup-plugin-content/commit/df5206e2b505372b5b5112eff0bfe4baa61dd501))
* **summarizer:** makes sure summarizedItem has fields for sorting ([19e6ead](https://github.com/stalniy/rollup-plugin-content/commit/19e6ead185a1f522dd7fbb613bbeb5feff2032b2))
* **summarizer:** makes sure summarizer is recreated in watch mode ([5e5b5d4](https://github.com/stalniy/rollup-plugin-content/commit/5e5b5d4d1f90f09d7a359915f5c82f145ae105fe))
* **validator:** makes sure validation works properly for `pageSchema: false` case ([e9af086](https://github.com/stalniy/rollup-plugin-content/commit/e9af086113ba15c225cb819a353903ef67bc6c87))
* **watch:** adds each file to be watched by rollup ([c20ab68](https://github.com/stalniy/rollup-plugin-content/commit/c20ab68c26fc30aaf1890b6245b6b8d592ad5540))
