const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function scrollUntilStable(page) {
  let previousHeight = 0;
  let stableCount = 0;

  for (let attempt = 0; attempt < 18; attempt++) {
    const height = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);

      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
    });

    await sleep(600);

    if (height === previousHeight) {
      stableCount++;
    } else {
      stableCount = 0;
    }

    previousHeight = height;

    if (stableCount >= 2) {
      break;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
}

async function getPageDiagnostics(page) {
  return page.evaluate(() => ({
    title: document.title,
    url: location.href,
    bodyText: document.body.innerText
      .replace(/\s+/g, ' ')
      .slice(0, 1200),

    hasCaptcha: Boolean(
      document.querySelector(
        'iframe[src*="captcha"], [class*="captcha"], [id*="captcha"]'
      )
    ),

    hasIfoodText: /ifood/i.test(document.body.innerText),

    elementCount: document.querySelectorAll('*').length
  }));
}

export async function importIFood({ url, page }) {
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
  });

  await page.setViewportSize({
    width: 1440,
    height: 1000
  });

  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 45000
  });

  await sleep(4000);

  const pageLooksReady = await page
    .waitForFunction(() => {
      const text = document.body.innerText || '';

      return (
        document.querySelector(
          '.market-catalog-aisle .product-card-wrapper'
        ) ||
        document.querySelector('.product-card-wrapper') ||
        document.querySelector('[class*="product-card"]') ||
        /R\$\s*[\d.,]+/.test(text)
      );
    }, {
      timeout: 15000
    })
    .then(() => true)
    .catch(() => false);

  if (!pageLooksReady) {
    const info = await getPageDiagnostics(page);

    throw new Error(
      'O iFood não disponibilizou os cards de produtos para o servidor. ' +
      `Título: "${info.title}". ` +
      `URL final: ${info.url}. ` +
      `Possível captcha: ${info.hasCaptcha ? 'sim' : 'não'}. ` +
      `Trecho da página: "${info.bodyText}".`
    );
  }

  await scrollUntilStable(page);

  const result = await page.evaluate(() => {
    const clean = value =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    const parsePrice = value => {
      const match = String(value || '').match(
        /R\$\s*([\d.]+,\d{2})/i
      );

      return match
        ? Number(match[1].replace(/\./g, '').replace(',', '.'))
        : null;
    };

    const cards = [
      ...document.querySelectorAll(
        '.market-catalog-aisle .product-card-wrapper, ' +
        '.product-card-wrapper, ' +
        '[class*="product-card"]'
      )
    ];

    const products = cards
      .map(card => {
        const name = clean(
          card.querySelector(
            '.product-card__description, ' +
            '[class*="product-card__description"], ' +
            '[class*="product-name"], ' +
            '[class*="product-title"]'
          )?.textContent
        );

        const description = clean(
          card.querySelector(
            '.product-card__details, ' +
            '[class*="product-card__details"], ' +
            '[class*="description"]'
          )?.textContent
        );

        const priceText = clean(
          card.querySelector(
            '.product-card__price, ' +
            '[class*="product-card__price"], ' +
            '[class*="price"]'
          )?.textContent
        );

        const image =
          card.querySelector(
            'img.product-card-image__content, img'
          )?.src || '';

        return {
          name,
          description,
          price: parsePrice(priceText),
          image,
          complements: []
        };
      })
      .filter(product =>
        product.name &&
        product.price !== null
      );

    const categoryName = clean(
      document.querySelector(
        '.aisle-menu__item--active .aisle-menu__item__link__name, ' +
        '[class*="aisle-menu__item--active"] [class*="link__name"]'
      )?.textContent
    ) || 'Categoria atual';

    const storeName = clean(
      document.querySelector(
        '.market-header__title, [class*="market-header__title"], h1'
      )?.textContent
    );

    return {
      storeName,
      categoryName,
      products,
      cardCount: cards.length
    };
  });

  if (!result.products.length) {
    const info = await getPageDiagnostics(page);

    throw new Error(
      'Foram encontrados cards, mas nenhum produto válido foi extraído. ' +
      `Cards encontrados: ${result.cardCount}. ` +
      `Título: "${info.title}". ` +
      `Trecho da página: "${info.bodyText}".`
    );
  }

  return {
    platform: 'IFOOD',
    sourceUrl: url,
    storeName: result.storeName,
    categories: [
      {
        name: result.categoryName,
        products: result.products
      }
    ]
  };
}
