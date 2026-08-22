import { importMenuDino } from './menudino.js';
import { importAnotaAi } from './anota-ai.js';
import { importIFood } from './ifood.js';

export function detectPlatform(url) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('menudino')) {
    return 'MENUDINO';
  }

  if (
    hostname.includes('anota.ai') ||
    hostname.includes('anotaai')
  ) {
    return 'ANOTA_AI';
  }

  if (
    hostname.includes('ifood.com.br') ||
    hostname.includes('ifood')
  ) {
    return 'IFOOD';
  }

  if (hostname.includes('multipedidos')) {
    return 'MULTIPEDIDOS';
  }

  if (hostname.includes('goomer')) {
    return 'GOOMER';
  }

  return 'UNKNOWN';
}

export async function importCatalog({ url, page }) {
  const platform = detectPlatform(url);

  switch (platform) {
    case 'MENUDINO':
      return importMenuDino({ url, page });

    case 'ANOTA_AI':
      return importAnotaAi({ url, page });

    case 'IFOOD':
      return importIFood({ url, page });

    default:
      throw new Error(
        `Plataforma não suportada neste momento: ${platform}`
      );
  }
}
