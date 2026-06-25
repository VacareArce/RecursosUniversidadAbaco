# API personalizada de sincronizacion

Endpoint independiente del plugin WordPress para recibir datos desde Google Sheets.

## URL

```txt
POST https://universidadabaco.org/RecursosUniversidadAbaco/api/sync-year.php
```

## Seguridad

Enviar el token fijo en el header:

```txt
X-ABACO-SYNC-TOKEN: abaco-recursos-sync-2026-7f4c9b2e
```

## Payload

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
      "Invitado": "Monseñor Carlos Alberto Correa",
      "Organización": "BDEA Apartadó",
      "Tema técnico": ""
    }
  ]
}
```

## Resultado

La API sobrescribe el archivo anual correspondiente:

```txt
Data/videos-2025.json
```

Y actualiza el indice:

```txt
Data/videos-index.json
```

## Despliegue

Subir la carpeta `api/` dentro de:

```txt
/RecursosUniversidadAbaco/api/
```

Debe quedar accesible publicamente como:

```txt
https://universidadabaco.org/RecursosUniversidadAbaco/api/sync-year.php
```
