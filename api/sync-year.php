<?php

declare(strict_types=1);

const SYNC_TOKEN = 'abaco-recursos-sync-2026-7f4c9b2e';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-ABACO-SYNC-TOKEN');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['ok' => false, 'error' => 'Metodo no permitido. Use POST.'], 405);
}

$token = $_SERVER['HTTP_X_ABACO_SYNC_TOKEN'] ?? ($_GET['token'] ?? '');
if (!hash_equals(SYNC_TOKEN, (string) $token)) {
    respond(['ok' => false, 'error' => 'Token de sincronizacion invalido.'], 403);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode((string) $rawBody, true);

if (!is_array($payload)) {
    respond(['ok' => false, 'error' => 'El cuerpo debe ser JSON valido.'], 400);
}

$year = isset($payload['year']) ? (int) $payload['year'] : 0;
$items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : [];

if ($year < 2000 || $year > 2100) {
    respond(['ok' => false, 'error' => 'El campo year es requerido y debe ser valido.'], 400);
}

if ($items === []) {
    respond(['ok' => false, 'error' => 'El campo items debe contener filas.'], 400);
}

$videos = [];
$skipped = 0;

foreach ($items as $item) {
    if (!is_array($item)) {
        $skipped++;
        continue;
    }

    $video = normalize_sheet_item($item, $year);
    if ($video === null) {
        $skipped++;
        continue;
    }

    $videos[] = $video;
}

usort($videos, static function (array $a, array $b): int {
    return date_sort_value($a['fecha']) <=> date_sort_value($b['fecha']);
});

$dataDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'Data';
if (!is_dir($dataDir) && !mkdir($dataDir, 0755, true)) {
    respond(['ok' => false, 'error' => 'No fue posible crear la carpeta Data.'], 500);
}

$yearFile = $dataDir . DIRECTORY_SEPARATOR . 'videos-' . $year . '.json';
$json = json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents($yearFile, $json) === false) {
    respond(['ok' => false, 'error' => 'No fue posible escribir el archivo anual.'], 500);
}

$index = write_year_index($dataDir);
if ($index === null) {
    respond(['ok' => false, 'error' => 'No fue posible escribir videos-index.json.'], 500);
}

respond([
    'ok' => true,
    'year' => $year,
    'saved' => count($videos),
    'skipped' => $skipped,
    'file' => basename($yearFile),
    'index' => $index,
]);

function normalize_sheet_item(array $item, int $fallbackYear): ?array
{
    $uAbaco = strtoupper(field($item, ['U ABACO', 'U_ABACO', 'Universidad ABACO', 'Universidad Abaco']));
    if ($uAbaco !== 'SI') {
        return null;
    }

    $enlace = field($item, ['Enlace', 'enlace', 'Link', 'URL']);
    if ($enlace === '') {
        return null;
    }

    $day = (int) field($item, ['Día', 'Dia', 'dia', 'day']);
    $month = (int) field($item, ['Mes', 'mes', 'month']);
    $year = (int) field($item, ['Año', 'Ano', 'anio', 'year']);
    if ($year <= 0) {
        $year = $fallbackYear;
    }

    $formato = field($item, ['Formato', 'formato']);

    return [
        'fecha' => $day . '/' . $month . '/' . $year,
        'enlace' => $enlace,
        'youtube_id' => extract_youtube_id($enlace),
        'tiempo' => field($item, ['Tiempo', 'tiempo', 'Duración', 'Duracion']),
        'programa' => $formato,
        'entrevistado' => field($item, ['Invitado', 'invitado', 'Entrevistado', 'entrevistado']),
        'banco' => field($item, ['Organización', 'Organizacion', 'organizacion', 'Organizacion/Banco']),
        'tema' => field($item, ['Tema técnico', 'Tema tecnico', 'tema', 'Tema']),
        'tipo' => $formato,
        'year' => $year,
    ];
}

function field(array $item, array $keys): string
{
    foreach ($keys as $key) {
        if (array_key_exists($key, $item)) {
            return clean_text($item[$key]);
        }
    }

    return '';
}

function clean_text(mixed $value): string
{
    $value = is_scalar($value) ? (string) $value : '';
    $value = preg_replace('/\s+/u', ' ', $value) ?? '';
    return trim(strip_tags($value));
}

function extract_youtube_id(string $value): string
{
    $patterns = [
        '/youtu\.be\/([A-Za-z0-9_-]{6,})/i',
        '/youtube\.com\/live\/([A-Za-z0-9_-]{6,})/i',
        '/youtube\.com\/watch\?[^\s]*v=([A-Za-z0-9_-]{6,})/i',
        '/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i',
    ];

    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $value, $matches)) {
            return $matches[1];
        }
    }

    return '';
}

function write_year_index(string $dataDir): ?array
{
    $files = glob($dataDir . DIRECTORY_SEPARATOR . 'videos-*.json') ?: [];
    $baseUrl = public_base_url();
    $indexFiles = [];

    foreach ($files as $file) {
        if (!preg_match('/videos-(\d{4})\.json$/', basename($file), $matches)) {
            continue;
        }

        $year = (int) $matches[1];
        $indexFiles[] = [
            'year' => $year,
            'url' => $baseUrl . '/Data/videos-' . $year . '.json',
        ];
    }

    usort($indexFiles, static function (array $a, array $b): int {
        return $a['year'] <=> $b['year'];
    });

    $index = [
        'years' => array_map(static fn (array $file): int => $file['year'], $indexFiles),
        'files' => $indexFiles,
    ];

    $json = json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || file_put_contents($dataDir . DIRECTORY_SEPARATOR . 'videos-index.json', $json) === false) {
        return null;
    }

    return $index;
}

function public_base_url(): string
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/RecursosUniversidadAbaco/api'));
    $baseDir = preg_replace('#/api$#', '', $scriptDir) ?: '';

    return rtrim($scheme . '://' . $host . $baseDir, '/');
}

function date_sort_value(string $date): int
{
    $parts = array_map('intval', explode('/', $date));
    if (count($parts) !== 3) {
        return 0;
    }

    return mktime(0, 0, 0, $parts[1], $parts[0], $parts[2]);
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
