const DEFAULT_CONFIG = {
  sheetName: 'colmundo',
  endpointUrl: 'https://universidadabaco.org/wp-json/abaco-recursos/v1/sync-year',
  syncToken: 'abaco-recursos-sync-2026-7f4c9b2e'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Recursos Videos')
    .addItem('Sincronizar pestaña', 'syncConfiguredSheet')
    .addSeparator()
    .addItem('Configurar nombre de pestaña', 'configureSheetName')
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

  const parsed = parseSheet(sheet);
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

function parseSheet(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  const headerRowIndex = findHeaderRow(values);

  if (headerRowIndex === -1) {
    throwUiError('No se encontro la fila de encabezados. Debe incluir: Día, Mes, Año, Enlace, Tiempo, Formato, U ABACO, Invitado, Organización, Tema técnico.');
    return { year: new Date().getFullYear(), items: [] };
  }

  const headers = values[headerRowIndex].map(normalizeHeaderValue);
  const items = [];
  let detectedYear = null;

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
    if (!detectedYear && rowYear) {
      detectedYear = rowYear;
    }

    items.push(item);
  }

  return {
    year: detectedYear || new Date().getFullYear(),
    items
  };
}

function findHeaderRow(values) {
  const requiredHeaders = ['Enlace', 'Formato', 'U ABACO'];

  for (let i = 0; i < values.length; i++) {
    const rowHeaders = values[i].map(normalizeHeaderValue);
    const hasRequired = requiredHeaders.every(header => rowHeaders.includes(header));
    const hasDateParts = rowHeaders.includes('Día') || rowHeaders.includes('Dia');

    if (hasRequired && hasDateParts && rowHeaders.includes('Mes') && (rowHeaders.includes('Año') || rowHeaders.includes('Ano'))) {
      return i;
    }
  }

  return -1;
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
    `Pestaña: ${config.sheetName}\nEndpoint: ${config.endpointUrl}\nToken: ${config.syncToken}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function getConfig() {
  const props = PropertiesService.getDocumentProperties();

  return {
    sheetName: props.getProperty('sheetName') || DEFAULT_CONFIG.sheetName,
    endpointUrl: props.getProperty('endpointUrl') || DEFAULT_CONFIG.endpointUrl,
    syncToken: props.getProperty('syncToken') || DEFAULT_CONFIG.syncToken
  };
}

function throwUiError(message) {
  SpreadsheetApp.getUi().alert('Error', message, SpreadsheetApp.getUi().ButtonSet.OK);
}
