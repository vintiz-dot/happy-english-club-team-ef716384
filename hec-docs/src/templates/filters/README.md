Each `*.ts` file here exports `filters: Record<string, (...args) => unknown>`;
every entry is registered on the shared Nunjucks environment at start-up.

Use this for exact ports of the app's formatting helpers (for example
`src/lib/invoice/formatter.ts`), so printed text stays byte-identical. Keep
filters pure: no I/O, no network, no clock (use `doc.generatedAt`).
