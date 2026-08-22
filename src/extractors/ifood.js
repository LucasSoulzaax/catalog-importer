const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function scrollUntilStable(page) {
  let previousHeight = 0;
  let stableCount = 0;

  for (let attempt = 0; attempt < 30; attempt++) {
    const height = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.documentElement.scrollHeight;
    });

    await sleep(700);

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

export async function importIFood({ url, page }) {
  await page.waitForLoadState('domcontentloaded');

  await page.waitForSelector(
    '[data-container-name="market-page-container"], main',
    {
      timeout: 20000
    }
  );

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
        '.market-catalog-aisle .product-card-wrapper'
      )
    ];

    const products = cards
      .map(card => ({
        name: clean(
          card.querySelector('.product-card__description')?.textContent
        ),

        description: clean(
          card.querySelector('.product-card__details')?.textContent
        ),

        price: parsePrice(
          card.querySelector('.product-card__price')?.textContent
        ),

        image:
          card.querySelector(
            'img.product-card-image__content'
          )?.src || '',

        complements: []
      }))
      .filter(product =>
        product.name &&
        product.price !== null
      );

    const activeCategory = clean(
      document.querySelector(
        '.aisle-menu__item--active .aisle-menu__item__link__name'
      )?.textContent
    ) || 'Categoria atual';

    const storeName = clean(
      document.querySelector(
        '.market-header__title, h1'
      )?.textContent
    );

    return {
      storeName,
      categoryName: activeCategory,
      products
    };
  });

  if (!result.products.length) {
    throw new Error(
      'O iFood não carregou produtos para este link. ' +
      'Teste uma URL de categoria específica ou verifique se a loja está disponível.'
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
