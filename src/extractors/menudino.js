const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

export async function importMenuDino({ url, page }) {
  await page.waitForSelector('.content-categories', {
    timeout: 15000
  });

  // Rola para disparar lazy-loading de itens/categorias.
  let stableRounds = 0;
  let previousHeight = 0;

  for (let round = 0; round < 20; round++) {
    const height = await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
      return document.body.scrollHeight;
    });

    await sleep(700);

    if (height === previousHeight) {
      stableRounds++;
    } else {
      stableRounds = 0;
    }

    previousHeight = height;

    if (stableRounds >= 2) {
      break;
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  const categories = await page.evaluate(() => {
    const clean = value =>
      String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    const price = value => {
      const match = String(value || '').match(
        /R\$\s*([\d.]+,\d{2})/i
      );

      return match
        ? Number(match[1].replace(/\./g, '').replace(',', '.'))
        : null;
    };

    return [...document.querySelectorAll('.content-categories')]
      .map(categoryElement => {
        const name = clean(
          categoryElement.querySelector('h2')?.textContent
        );

        const products = [
          ...categoryElement.querySelectorAll(
            '.styles_card__iwSUA, .styles_cardNoPhoto__ZVXkY'
          )
        ]
          .map(card => {
            const name = clean(
              card.querySelector(
                '[data-testid="product-card-title"]'
              )?.textContent
            );

            const description = clean(
              card.querySelector('p')?.textContent
            );

            const priceText = clean(
              card.querySelector('.styles_price__kLKzD')?.textContent
            );

            const image =
              card.querySelector('img')?.src || '';

            return {
              name,
              description,
              price: price(priceText),
              image,
              complements: []
            };
          })
          .filter(product => product.name && product.price !== null);

        return {
          name,
          products
        };
      })
      .filter(category => category.name && category.products.length);
  });

  return {
    platform: 'MENUDINO',
    sourceUrl: url,
    storeName: await page
      .locator('h1')
      .first()
      .textContent()
      .catch(() => ''),
    categories
  };
}
