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

El script detecta automaticamente la fila de encabezados buscando columnas clave como `Día`, `Mes`, `Año`, `Enlace`, `Formato` y `U ABACO`.

Si la hoja cambia o quieres forzar una fila especifica:

1. Menu `Recursos Videos`.
2. `Configurar fila de encabezado`.
3. Escribe el numero de fila donde estan los encabezados, por ejemplo `17`.
4. Deja el campo vacio para volver al modo automatico.

Tambien puedes configurar:

   - Endpoint de la API del proyecto.
- Token de sincronizacion.
- Fila de encabezado.

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
2. Verifica que la columna `Año` tenga un solo año en toda la tabla.
3. Menu `Recursos Videos`.
4. `Sincronizar pestaña`.

El script extrae el año desde la columna `Año`.

Si encuentra mas de un año, no sube datos y muestra un mensaje para corregir la hoja. Cada archivo/pestaña debe contener datos de un solo año.

Si encuentra exactamente un año, envia todas las filas al endpoint:

```txt
https://universidadabaco.org/RecursosUniversidadAbaco/api/sync-year.php
```

La API del proyecto filtra internamente solo las filas donde `U ABACO = SI` y escribe:

```txt
/RecursosUniversidadAbaco/Data/videos-{año}.json
/RecursosUniversidadAbaco/Data/videos-index.json
```

Esta API no depende del plugin de WordPress para recibir datos.
