# ABACO Recursos Audiovisuales (WordPress)

Plugin para integrar el buscador de recursos audiovisuales en WordPress con:

- Shortcode: `[abaco_recursos]`
- API REST: `/wp-json/abaco/v1/videos`
- Modelo de contenido nativo: CPT + taxonomias + metacampos

## Instalacion

1. Copia la carpeta `abaco-recursos` dentro de `wp-content/plugins/`.
2. Activa el plugin desde el panel de WordPress.
3. Crea o edita una pagina e inserta el shortcode:

```txt
[abaco_recursos]
```

## Datos y estructura

El plugin crea:

- CPT: `abaco_video`
- Taxonomias:
  - `abaco_tipo`
  - `abaco_banco`
  - `abaco_programa`
- Metacampos:
  - `abaco_fecha`
  - `abaco_duracion`
  - `abaco_youtube_id`
  - `abaco_enlace`
  - `abaco_entrevistado`
  - `abaco_tema`

## Assets (CSS/JS)

Por defecto el plugin encola los assets desde:

`https://TU-DOMINIO/RecursosUniversidadAbaco/`

Es decir, espera encontrar:

- `css/videos.css`
- `js/videos.js`

Si necesitas otra ruta, puedes sobrescribirla con el filtro:

```php
add_filter('abaco_recursos_asset_base_url', function () {
    return 'https://TU-DOMINIO/ruta-personalizada/';
});
```

## Preview en HTML (fuera de WordPress)

`index.html` ya soporta dos modos:

1. Sin configuracion: usa `Data/videos.json`.
2. Con configuracion: usa WordPress REST.

Ejemplo en `index.html`:

```html
<script>
  window.ABACO_CONFIG = {
    apiUrl: 'https://tu-dominio.com/wp-json/abaco/v1/videos'
  };
</script>
```
