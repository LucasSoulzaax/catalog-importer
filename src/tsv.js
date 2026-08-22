const HEADER = [
  'TIPO',
  'NOME',
  'DESCRIÇÃO',
  'VALOR',
  'VALOR DE CUSTO',
  'VALOR PROMOCIONAL',
  'IMAGEM',
  'CODIGO PDV',
  'DISPONIBILIDADE DO ITEM',
  'TIPO COMPLEMENTO',
  'QTDE MINIMA',
  'QTDE MAXIMA',
  'CALCULO DOS COMPLEMENTOS',
  'REAPROVEITAR'
];

function clean(value = '') {
  return String(value)
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function price(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  return Number(value)
    .toFixed(2)
    .replace('.', ',');
}

function row(values = {}) {
  return HEADER.map(column => clean(values[column] ?? '')).join('\t');
}

export function catalogToTsv(catalog) {
  const rows = [HEADER.join('\t')];

  for (const category of catalog.categories) {
    rows.push(
      row({
        TIPO: 'Categoria',
        NOME: category.name
      })
    );

    for (const product of category.products) {
      rows.push(
        row({
          TIPO: 'Produto',
          NOME: product.name,
          'DESCRIÇÃO': product.description,
          VALOR: price(product.price),
          IMAGEM: product.image,
          'CODIGO PDV': product.sourceId || ''
        })
      );

      for (const group of product.complements || []) {
        rows.push(
          row({
            TIPO: 'Complemento',
            NOME: group.name,
            'TIPO COMPLEMENTO': group.type,
            'QTDE MINIMA': group.min || '',
            'QTDE MAXIMA': group.max || '',
            'CALCULO DOS COMPLEMENTOS': group.calculation || 'Soma'
          })
        );

        for (const option of group.options || []) {
          rows.push(
            row({
              TIPO: 'Opcao',
              NOME: option.name,
              'DESCRIÇÃO': option.description,
              VALOR: price(option.price),
              IMAGEM: option.image,
              'CODIGO PDV': option.sourceId || ''
            })
          );
        }
      }
    }
  }

  return '\uFEFF' + rows.join('\n') + '\n';
}
