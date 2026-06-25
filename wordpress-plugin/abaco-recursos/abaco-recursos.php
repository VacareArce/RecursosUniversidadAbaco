<?php
/**
 * Plugin Name: Recursos Videos
 * Description: Muestra un buscador de videos con filtros, ordenamiento y visor modal dentro de WordPress mediante shortcode, consumiendo un archivo JSON externo del proyecto.
 * Version: 1.2.0
 * Author: ABACO
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Abaco_Recursos_Plugin {
    private const SHORTCODE = 'abaco_recursos';
    private const SYNC_TOKEN = 'abaco-recursos-sync-2026-7f4c9b2e';

    public static function init() {
        add_action('rest_api_init', [__CLASS__, 'register_rest_routes']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_assets']);
        add_shortcode(self::SHORTCODE, [__CLASS__, 'render_shortcode']);
    }

    public static function register_rest_routes() {
        register_rest_route('abaco-recursos/v1', '/sync-year', [
            'methods' => WP_REST_Server::CREATABLE,
            'permission_callback' => [__CLASS__, 'validate_sync_token'],
            'callback' => [__CLASS__, 'sync_year'],
        ]);
    }

    public static function enqueue_assets() {
        if (!is_singular()) {
            return;
        }

        global $post;
        if (!$post instanceof WP_Post || !has_shortcode($post->post_content, self::SHORTCODE)) {
            return;
        }

        $asset_base_url = trailingslashit((string) apply_filters(
            'abaco_recursos_asset_base_url',
            home_url('/RecursosUniversidadAbaco/')
        ));

        wp_enqueue_style(
            'abaco-recursos-style',
            $asset_base_url . 'css/videos.css',
            [],
            null
        );

        wp_enqueue_script(
            'abaco-recursos-script',
            $asset_base_url . 'js/videos.js',
            [],
            null,
            true
        );

        $data_url = (string) apply_filters(
            'abaco_recursos_data_url',
            $asset_base_url . 'Data/videos.json'
        );

        wp_localize_script('abaco-recursos-script', 'ABACO_CONFIG', [
            'dataUrl' => esc_url_raw($data_url),
            'indexUrl' => esc_url_raw($asset_base_url . 'Data/videos-index.json'),
        ]);
    }

    public static function render_shortcode() {
        ob_start();
        $template_file = plugin_dir_path(__FILE__) . 'templates/shortcode-layout.php';
        if (is_readable($template_file)) {
            include $template_file;
        }
        return ob_get_clean();
    }

    public static function validate_sync_token($request) {
        $token = (string) $request->get_header('x-abaco-sync-token');
        if ($token === '') {
            $token = (string) $request->get_param('token');
        }

        if (!hash_equals(self::SYNC_TOKEN, $token)) {
            return new WP_Error('abaco_recursos_forbidden', 'Token de sincronizacion invalido.', ['status' => 403]);
        }

        return true;
    }

    public static function sync_year($request) {
        $payload = $request->get_json_params();
        if (!is_array($payload)) {
            return new WP_Error('abaco_recursos_invalid_payload', 'El cuerpo debe ser JSON valido.', ['status' => 400]);
        }

        $year = isset($payload['year']) ? (int) $payload['year'] : 0;
        $items = isset($payload['items']) && is_array($payload['items']) ? $payload['items'] : [];

        if ($year < 2000 || $year > 2100) {
            return new WP_Error('abaco_recursos_invalid_year', 'El campo year es requerido y debe ser valido.', ['status' => 400]);
        }

        if (empty($items)) {
            return new WP_Error('abaco_recursos_empty_items', 'El campo items debe contener filas.', ['status' => 400]);
        }

        $videos = [];
        $skipped = 0;

        foreach ($items as $item) {
            if (!is_array($item)) {
                $skipped++;
                continue;
            }

            $video = self::normalize_sheet_item($item, $year);
            if ($video === null) {
                $skipped++;
                continue;
            }

            $videos[] = $video;
        }

        usort($videos, function($a, $b) {
            return self::date_sort_value($a['fecha']) <=> self::date_sort_value($b['fecha']);
        });

        $data_dir = self::data_dir();
        if (!wp_mkdir_p($data_dir)) {
            return new WP_Error('abaco_recursos_data_dir_error', 'No fue posible crear la carpeta Data.', ['status' => 500]);
        }

        $year_file = trailingslashit($data_dir) . 'videos-' . $year . '.json';
        $written = file_put_contents($year_file, wp_json_encode($videos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        if ($written === false) {
            return new WP_Error('abaco_recursos_write_error', 'No fue posible escribir el archivo anual.', ['status' => 500]);
        }

        $index = self::write_year_index($data_dir);
        if (is_wp_error($index)) {
            return $index;
        }

        return rest_ensure_response([
            'ok' => true,
            'year' => $year,
            'saved' => count($videos),
            'skipped' => $skipped,
            'file' => basename($year_file),
            'index' => $index,
        ]);
    }

    private static function normalize_sheet_item($item, $fallback_year) {
        $u_abaco = strtoupper(self::field($item, ['U ABACO', 'U_ABACO', 'Universidad ABACO', 'Universidad Abaco']));
        if ($u_abaco !== 'SI') {
            return null;
        }

        $enlace = self::field($item, ['Enlace', 'enlace', 'Link', 'URL']);
        if ($enlace === '') {
            return null;
        }

        $day = (int) self::field($item, ['Día', 'Dia', 'dia', 'day']);
        $month = (int) self::field($item, ['Mes', 'mes', 'month']);
        $year = (int) self::field($item, ['Año', 'Ano', 'anio', 'year']);
        if ($year <= 0) {
            $year = $fallback_year;
        }

        $formato = self::field($item, ['Formato', 'formato']);

        return [
            'fecha' => $day . '/' . $month . '/' . $year,
            'enlace' => $enlace,
            'youtube_id' => self::extract_youtube_id($enlace),
            'tiempo' => self::field($item, ['Tiempo', 'tiempo', 'Duración', 'Duracion']),
            'programa' => $formato,
            'entrevistado' => self::field($item, ['Invitado', 'invitado', 'Entrevistado', 'entrevistado']),
            'banco' => self::field($item, ['Organización', 'Organizacion', 'organizacion', 'Organizacion/Banco']),
            'tema' => self::field($item, ['Tema técnico', 'Tema tecnico', 'tema', 'Tema']),
            'tipo' => $formato,
            'year' => $year,
        ];
    }

    private static function field($item, $keys) {
        foreach ($keys as $key) {
            if (array_key_exists($key, $item)) {
                return self::clean_text($item[$key]);
            }
        }

        return '';
    }

    private static function clean_text($value) {
        $value = is_scalar($value) ? (string) $value : '';
        $value = sanitize_textarea_field($value);
        $value = preg_replace('/\s+/u', ' ', $value);
        return trim((string) $value);
    }

    private static function extract_youtube_id($value) {
        $value = trim((string) $value);
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

    private static function write_year_index($data_dir) {
        $files = glob(trailingslashit($data_dir) . 'videos-*.json');
        $asset_base_url = trailingslashit((string) apply_filters(
            'abaco_recursos_asset_base_url',
            home_url('/RecursosUniversidadAbaco/')
        ));

        $index_files = [];
        foreach ($files as $file) {
            if (!preg_match('/videos-(\d{4})\.json$/', basename($file), $matches)) {
                continue;
            }

            $year = (int) $matches[1];
            $index_files[] = [
                'year' => $year,
                'url' => esc_url_raw($asset_base_url . 'Data/videos-' . $year . '.json'),
            ];
        }

        usort($index_files, function($a, $b) {
            return $a['year'] <=> $b['year'];
        });

        $index = [
            'years' => array_values(array_map(function($file) {
                return $file['year'];
            }, $index_files)),
            'files' => $index_files,
        ];

        $index_file = trailingslashit($data_dir) . 'videos-index.json';
        $written = file_put_contents($index_file, wp_json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        if ($written === false) {
            return new WP_Error('abaco_recursos_index_write_error', 'No fue posible escribir videos-index.json.', ['status' => 500]);
        }

        return $index;
    }

    private static function data_dir() {
        return (string) apply_filters(
            'abaco_recursos_data_dir',
            trailingslashit(ABSPATH) . 'RecursosUniversidadAbaco/Data'
        );
    }

    private static function date_sort_value($date) {
        $parts = array_map('intval', explode('/', (string) $date));
        if (count($parts) !== 3) {
            return 0;
        }

        return mktime(0, 0, 0, $parts[1], $parts[0], $parts[2]);
    }

}

Abaco_Recursos_Plugin::init();
