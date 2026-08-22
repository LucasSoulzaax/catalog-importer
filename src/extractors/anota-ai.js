const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function scrollUntilStable(page) {
  let previousHeight = 0;
  let stableCount = 0;

  for (let attempt = 0; attempt < 25; attempt++) {
    const height = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.documentElement.scrollHeight;
    });

    await sleep(500);

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

export async function importAnotaAi({ url, page }) {
  await page.waitForLoadState('domcontentloaded');

  await scrollUntilStable(page);

  const catalog = await page.evaluate(() => {
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

    const categoryCandidates = [
      ...document.querySelectorAll(
        '[class*="category"], [class*="Category"], section'
      )
    ];

    const categories = [];

    for (const categoryElement of categoryCandidates) {
      const categoryName = clean(
        categoryElement.querySelector('h1, h2, h3, h4')?.textContent
      );

      const productElements = [
        ...categoryElement.querySelectorAll(
          '[class*="product"], [class*="Product"], article, li'
        )
      ];

      const products = productElements
        .map(productElement => {
          const fullText = clean(productElement.textContent);

          const productName = clean(
            productElement.querySelector(
              'h2, h3, h4, h5, strong, [class*="title"], [class*="name"]'
            )?.textContent
          );

          const productPrice = parsePrice(fullText);

          const description = clean(
            productElement.querySelector(
              'p, [class*="description"], [class*="Description"]'
            )?.textContent
          );

          const image =
            productElement.querySelector('img')?.src || '';

          return {
            name: productName,
            description,
            price: productPrice,
            image,
            complements: []
          };
        })
        .filter(product =>
          product.name &&
          product.price !== null
        );

      if (categoryName && products.length) {
        categories.push({
          name: categoryName,
          products
        });
      }
    }

    const uniqueCategories = [];
    const seen = new Set();

    for (const category of categories) {
      const key = category.name;

      if (seen.has(key)) continue;

      seen.add(key);
      uniqueCategories.push(category);
    }

    return {
      storeName: clean(
        document.querySelector('h1')?.textContent
      ),
      categories: uniqueCategories
    };
  });

  if (!catalog.categories.length) {
    throw new Error(
      'Não foram encontrados produtos no DOM do Anota Aí. ' +
      'Esse cardápio pode exigir um adaptador específico.'
    );
  }

  return {
    platform: 'ANOTA_AI',
    sourceUrl: url,
    storeName: catalog.storeName,
    categories: catalog.categories
  };
}
