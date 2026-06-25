# Recursos Videos (WordPress)

Plugin para integrar el buscador de videos en WordPress usando un shortcode, archivos JSON por año y sincronizacion desde Google Sheets.

- Shortcode: `[abaco_recursos]`
- Fuente legacy por defecto: `/RecursosUniversidadAbaco/Data/videos.json`
- Fuente anual recomendada: `/RecursosUniversidadAbaco/Data/videos-index.json`
- Endpoint de sincronizacion: `/wp-json/abaco-recursos/v1/sync-year`

## Instalacion

1. Copia la carpeta `abaco-recursos` dentro de `wp-content/plugins/`.
2. Activa el plugin desde el panel de WordPress.
3. Crea o edita una pagina e inserta el shortcode:

```txt
[abaco_recursos]
```

## Estructura esperada en servidor

El plugin encola assets desde esta base por defecto:

`https://TU-DOMINIO/RecursosUniversidadAbaco/`

Y espera encontrar:

- `css/videos.css`
- `js/videos.js`
- `Data/videos.json` (fallback legacy)
- `Data/videos-index.json` (indice anual)
- `Data/videos-2025.json`, `Data/videos-2026.json`, etc.

## Sincronizacion desde Google Sheets

El endpoint recibe una carga por año y escribe un archivo anual en `Data/`.

```txt
POST /wp-json/abaco-recursos/v1/sync-year
Header: X-ABACO-SYNC-TOKEN: abaco-recursos-sync-2026-7f4c9b2e
```

Payload esperado:

```json
{
  "year": 2025,
  "items": [
    {
      "Día": "15",
      "Mes": "1",
      "Año": "2025",
      "Enlace": "https://youtube.com/live/BUcubvdIavg?feature=share",
      "Tiempo": "10 m",
      "Formato": "Entrevista BA",
      "U ABACO": "SI",
      "P WEB": "SI",
      "Invitado": "Monseñor Carlos Alberto Correa",
      "Organización": "BDEA Apartadó",
      "Tema técnico": ""
    }
  ]
}
```

Reglas de importacion:

- Solo se guardan filas con `U ABACO = SI`.
- `P WEB` no filtra contenido.
- `Formato` se usa como `tipo` y `programa`.
- `Día`, `Mes`, `Año` se convierten a `fecha` (`15/1/2025`).
- El ID de YouTube se extrae automaticamente desde `Enlace`.

Respuesta esperada:

```json
{
  "ok": true,
  "year": 2025,
  "saved": 120,
  "skipped": 10,
  "file": "videos-2025.json"
}
```

Ejemplo basico de Google Apps Script:

```javascript
const payload = {
  year: 2025,
  items: rows
};

const response = UrlFetchApp.fetch('https://TU-DOMINIO/wp-json/abaco-recursos/v1/sync-year', {
  method: 'post',
  contentType: 'application/json',
  headers: {
    'X-ABACO-SYNC-TOKEN': 'abaco-recursos-sync-2026-7f4c9b2e'
  },
  payload: JSON.stringify(payload),
  muteHttpExceptions: true
});
```

## Personalizacion de rutas

Si necesitas otra ruta de assets:

```php
add_filter('abaco_recursos_asset_base_url', function () {
    return 'https://TU-DOMINIO/ruta-personalizada/';
});
```

Si necesitas otra URL del JSON:

```php
add_filter('abaco_recursos_data_url', function () {
    return 'https://TU-DOMINIO/ruta-personalizada/Data/videos.json';
});
```

Si necesitas otra carpeta fisica para escritura de `Data/`:

```php
add_filter('abaco_recursos_data_dir', function () {
    return ABSPATH . 'RecursosUniversidadAbaco/Data';
});
```

## Preview en HTML

`index.html` puede recibir configuracion opcional:

```html
<script>
  window.ABACO_CONFIG = {
    dataUrl: 'Data/videos.json',
    indexUrl: 'Data/videos-index.json'
  };
</script>
```
