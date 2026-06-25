# Google Apps Script - Recursos Videos

Este script se pega en el editor de Apps Script del Google Sheet que contiene la pestaña anual de seguimiento.

## Instalacion

1. Abre el Google Sheet.
2. Ve a `Extensiones > Apps Script`.
3. Crea o reemplaza el archivo `Code.gs` con el contenido de `gas/Code.gs`.
4. Guarda el proyecto.
5. Recarga el Google Sheet.
6. Aparecera el menu `Recursos Videos`.

## Configuracion

El nombre de pestaña por defecto es:

```txt
colmundo
```

Para cambiarlo:

1. Menu `Recursos Videos`.
2. `Configurar nombre de pestaña`.
3. Escribe el nombre exacto de la pestaña.

Tambien puedes configurar:

- Endpoint WordPress.
- Token de sincronizacion.

## Uso

1. Verifica que la pestaña tenga los encabezados esperados:
   - `Día`
   - `Mes`
   - `Año`
   - `Enlace`
   - `Tiempo`
   - `Formato`
   - `U ABACO`
   - `Invitado`
   - `Organización`
   - `Tema técnico`
2. Menu `Recursos Videos`.
3. `Sincronizar pestaña`.

El script detecta el año desde la columna `Año` y envia todas las filas al endpoint:

```txt
/wp-json/abaco-recursos/v1/sync-year
```

El plugin de WordPress filtra internamente solo las filas donde `U ABACO = SI`.
