const urlInput = document.querySelector('#url');
const importButton = document.querySelector('#importButton');
const statusBox = document.querySelector('#status');
const summary = document.querySelector('#summary');
const preview = document.querySelector('#preview');
const catalogBody = document.querySelector('#catalogBody');
const downloadButton = document.querySelector('#downloadButton');

let importedTsv = '';

function setStatus(message, type = '') {
  statusBox.className = `status ${type}`;
  statusBox.textContent = message;
}

function formatPrice(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return `R$ ${Number(value)
    .toFixed(2)
    .replace('.', ',')}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderCatalog(catalog) {
  const categories = catalog.categories.length;

  const products = catalog.categories.reduce(
    (total, category) => total + category.products.length,
    0
  );

  document.querySelector('#platform').textContent = catalog.platform;
  document.querySelector('#categoryCount').textContent = categories;
  document.querySelector('#productCount').textContent = products;
  document.querySelector('#storeName').textContent =
    catalog.storeName || catalog.sourceUrl;

  const rows = [];

  for (const category of catalog.categories) {
    for (const product of category.products) {
      rows.push(`
        <tr>
          <td>${escapeHtml(category.name)}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${escapeHtml(product.description)}</td>
          <td>${formatPrice(product.price)}</td>
          <td>${product.image ? 'Sim' : '—'}</td>
        </tr>
      `);
    }
  }

  catalogBody.innerHTML = rows.join('');

  summary.classList.remove('hidden');
  preview.classList.remove('hidden');
}

async function importCatalog() {
  const url = urlInput.value.trim();

  if (!url) {
    setStatus('Cole a URL de um cardápio.', 'error');
    return;
  }

  importButton.disabled = true;
  setStatus('Importando catálogo. Isso pode levar alguns segundos...');

  try {
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Falha ao importar o catálogo.');
    }

    importedTsv = data.tsv;

    renderCatalog(data.catalog);

    setStatus(
      `Importação concluída: ${data.catalog.categories.length} categorias encontradas.`,
      'ok'
    );
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    importButton.disabled = false;
  }
}

function downloadTsv() {
  if (!importedTsv) return;

  const blob = new Blob([importedTsv], {
    type: 'text/tab-separated-values;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'catalogo.tsv';

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

importButton.addEventListener('click', importCatalog);

urlInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    importCatalog();
  }
});

downloadButton.addEventListener('click', downloadTsv);
