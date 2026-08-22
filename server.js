import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

import { importCatalog } from './src/extractors/index.js';
import { catalogToTsv } from './src/tsv.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/import', async (req, res) => {
  const { url } = req.body;

  try {
    const parsedUrl = new URL(url);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Informe uma URL HTTP ou HTTPS válida.');
    }

    const browser = await chromium.launch({
      headless: true
    });

    try {
      const page = await browser.newPage({
        viewport: {
          width: 1440,
          height: 1000
        }
      });

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const catalog = await importCatalog({
        url,
        page
      });

      const tsv = catalogToTsv(catalog);

      res.json({
        ok: true,
        platform: catalog.platform,
        catalog,
        tsv
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error(error);

    res.status(400).json({
      ok: false,
      error: error.message || 'Não foi possível importar o catálogo.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
