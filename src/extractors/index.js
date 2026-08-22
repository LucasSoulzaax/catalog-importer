import { importMenuDino } from './menudino.js';

export function detectPlatform(url) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (
    hostname.includes('menudino.com') ||
    hostname.includes('menudino')
  ) {
    return 'MENUDINO';
  }

  if (hostname.includes('multipedidos')) {
    return 'MULTIPEDIDOS';
  }

  if (hostname.includes('goomer')) {
    return 'GOOMER';
  }

  if (hostname.includes('anota')) {
    return 'ANOTA_AI';
  }

  if (hostname.includes('ifood')) {
    return 'IFOOD';
  }

  return 'UNKNOWN';
}

export async function importCatalog({ url, page }) {
  const platform = detectPlatform(url);

  if (platform === 'MENUDINO') {
    return importMenuDino({ url, page });
  }

  throw new Error(
    `Plataforma não suportada neste MVP: ${platform}. ` +
    `Teste inicialmente com um link MenuDino.`
  );
}
