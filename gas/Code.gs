const DEFAULT_CONFIG = {
  sheetName: 'colmundo',
  endpointUrl: 'https://universidadabaco.org/wp-json/abaco-recursos/v1/sync-year',
  syncToken: 'abaco-recursos-sync-2026-7f4c9b2e',
  headerRow: ''
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Recursos Videos')
    .addItem('Sincronizar pestaña', 'syncConfiguredSheet')
    .addSeparator()
    .addItem('Configurar nombre de pestaña', 'configureSheetName')
    .addItem('Configurar fila de encabezado', 'configureHeaderRow')
    .addItem('Configurar endpoint', 'configureEndpointUrl')
    .addItem('Configurar token', 'configureSyncToken')
    .addSeparator()
    .addItem('Ver configuracion', 'showConfig')
    .addToUi();
}

function syncConfiguredSheet() {
  const config = getConfig();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    throwUiError(`No existe la pestaña "${config.sheetName}". Configura el nombre desde Recursos Videos > Configurar nombre de pestaña.`);
    return;
  }

  const parsed = parseSheet(sheet, config);
  if (parsed.items.length === 0) {
    throwUiError('No se encontraron filas validas para enviar. Verifica encabezados y datos.');
    return;
  }

  const payload = {
    year: parsed.year,
    items: parsed.items
  };

  const response = UrlFetchApp.fetch(config.endpointUrl, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'X-ABACO-SYNC-TOKEN': config.syncToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    throwUiError(`Error del endpoint (${status}): ${body}`);
    return;
  }

  SpreadsheetApp.getUi().alert(
    'Sincronizacion completada',
    `Año: ${parsed.year}\nFilas enviadas: ${parsed.items.length}\nRespuesta: ${body}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function parseSheet(sheet, config) {
  const values = sheet.getDataRange().getDisplayValues();
  const headerRowIndex = getHeaderRowIndex(values, config.headerRow);

  if (headerRowIndex === -1) {
    throwUiError('No se encontro la fila de encabezados. Debe incluir: Día, Mes, Año, Enlace, Tiempo, Formato, U ABACO, Invitado, Organización, Tema técnico.');
    return { year: null, items: [] };
  }

  const headers = values[headerRowIndex].map(normalizeHeaderValue);
  const items = [];
  const detectedYears = new Set();

  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i];
    const item = {};

    headers.forEach((header, index) => {
      if (header) {
        item[header] = row[index] || '';
      }
    });

    if (!item['Enlace'] && !item['Día'] && !item['Dia']) {
      continue;
    }

    const rowYear = Number(item['Año'] || item['Ano'] || item['year']);
    if (rowYear) {
      detectedYears.add(rowYear);
    }

    items.push(item);
  }

  if (detectedYears.size === 0) {
    throwUiError('No se encontro ningun año valido en la columna Año. Corrige la hoja antes de sincronizar.');
    return { year: null, items: [] };
  }

  if (detectedYears.size > 1) {
    throwUiError(`Se encontraron varios años en la pestaña: ${Array.from(detectedYears).sort().join(', ')}. Este archivo debe contener datos de un solo año. Corrige la hoja antes de sincronizar.`);
    return { year: null, items: [] };
  }

  return {
    year: Array.from(detectedYears)[0],
    items
  };
}

function getHeaderRowIndex(values, configuredHeaderRow) {
  const rowNumber = Number(configuredHeaderRow);
  if (Number.isInteger(rowNumber) && rowNumber > 0) {
    const index = rowNumber - 1;
    if (index >= values.length) {
      throwUiError(`La fila de encabezado configurada (${rowNumber}) esta fuera del rango de la hoja.`);
      return -1;
    }

    const rowHeaders = values[index].map(normalizeHeaderValue);
    if (!isHeaderRow(rowHeaders)) {
      throwUiError(`La fila ${rowNumber} no parece ser un encabezado valido. Debe incluir Día, Mes, Año, Enlace, Formato y U ABACO.`);
      return -1;
    }

    return index;
  }

  return findHeaderRow(values);
}

function findHeaderRow(values) {
  for (let i = 0; i < values.length; i++) {
    const rowHeaders = values[i].map(normalizeHeaderValue);
    if (isHeaderRow(rowHeaders)) {
      return i;
    }
  }

  return -1;
}

function isHeaderRow(rowHeaders) {
  const requiredHeaders = ['Enlace', 'Formato', 'U ABACO'];
  const hasRequired = requiredHeaders.every(header => rowHeaders.includes(header));
  const hasDateParts = rowHeaders.includes('Día') || rowHeaders.includes('Dia');

  return hasRequired && hasDateParts && rowHeaders.includes('Mes') && (rowHeaders.includes('Año') || rowHeaders.includes('Ano'));
}

function normalizeHeaderValue(value) {
  return String(value || '').trim();
}

function configureSheetName() {
  promptAndSaveConfigValue(
    'Nombre de pestaña',
    'Escribe el nombre de la pestaña a sincronizar.',
    'sheetName',
    DEFAULT_CONFIG.sheetName
  );
}

function configureHeaderRow() {
  const ui = SpreadsheetApp.getUi();
  const currentValue = getConfig().headerRow || 'Automatico';
  const response = ui.prompt(
    'Fila de encabezado',
    `Escribe el numero de fila donde estan los encabezados. Deja vacio para autodetectar.\n\nValor actual: ${currentValue}`,
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const value = response.getResponseText().trim();
  const props = PropertiesService.getDocumentProperties();

  if (!value) {
    props.deleteProperty('headerRow');
    ui.alert('Configuracion guardada. El encabezado se detectara automaticamente.');
    return;
  }

  const rowNumber = Number(value);
  if (!Number.isInteger(rowNumber) || rowNumber <= 0) {
    ui.alert('La fila de encabezado debe ser un numero entero mayor que 0.');
    return;
  }

  props.setProperty('headerRow', String(rowNumber));
  ui.alert('Configuracion guardada.');
}

function configureEndpointUrl() {
  promptAndSaveConfigValue(
    'Endpoint',
    'Escribe la URL del endpoint de WordPress.',
    'endpointUrl',
    DEFAULT_CONFIG.endpointUrl
  );
}

function configureSyncToken() {
  promptAndSaveConfigValue(
    'Token',
    'Escribe el token de sincronizacion.',
    'syncToken',
    DEFAULT_CONFIG.syncToken
  );
}

function promptAndSaveConfigValue(title, message, key, fallbackValue) {
  const ui = SpreadsheetApp.getUi();
  const currentValue = getConfig()[key] || fallbackValue;
  const response = ui.prompt(title, `${message}\n\nValor actual: ${currentValue}`, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const value = response.getResponseText().trim();
  if (!value) {
    ui.alert('El valor no puede estar vacio.');
    return;
  }

  PropertiesService.getDocumentProperties().setProperty(key, value);
  ui.alert('Configuracion guardada.');
}

function showConfig() {
  const config = getConfig();
  SpreadsheetApp.getUi().alert(
    'Configuracion actual',
    `Pestaña: ${config.sheetName}\nFila de encabezado: ${config.headerRow || 'Automatico'}\nEndpoint: ${config.endpointUrl}\nToken: ${config.syncToken}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getConfig() {
  const props = PropertiesService.getDocumentProperties();

  return {
    sheetName: props.getProperty('sheetName') || DEFAULT_CONFIG.sheetName,
    endpointUrl: props.getProperty('endpointUrl') || DEFAULT_CONFIG.endpointUrl,
    syncToken: props.getProperty('syncToken') || DEFAULT_CONFIG.syncToken,
    headerRow: props.getProperty('headerRow') || DEFAULT_CONFIG.headerRow
  };
}

function throwUiError(message) {
  SpreadsheetApp.getUi().alert('Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
}
