export async function importCatalog({ url, page }) {
  const platform = detectPlatform(url);

  switch (platform) {
    case 'MENUDINO':
      return importMenuDino({ url, page });

    case 'ANOTA_AI':
      return importAnotaAi({ url, page });

    // iFood desativado temporariamente por bloqueio de datacenter
    // case 'IFOOD':
    //   return importIFood({ url, page });

    default:
      throw new Error(
        `Plataforma não suportada neste momento: ${platform}`
      );
  }
}
