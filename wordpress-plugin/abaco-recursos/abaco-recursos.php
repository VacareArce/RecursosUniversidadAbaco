<?php
/**
 * Plugin Name: ABACO Recursos Audiovisuales
 * Description: Integra el buscador de recursos audiovisuales de ABACO en WordPress mediante shortcode y API REST.
 * Version: 1.0.0
 * Author: ABACO
 */

if (!defined('ABSPATH')) {
    exit;
}

final class Abaco_Recursos_Plugin {
    private const SHORTCODE = 'abaco_recursos';
    private const CPT = 'abaco_video';
    private const TAX_TIPO = 'abaco_tipo';
    private const TAX_BANCO = 'abaco_banco';
    private const TAX_PROGRAMA = 'abaco_programa';

    public static function init() {
        add_action('init', [__CLASS__, 'register_content_model']);
        add_action('rest_api_init', [__CLASS__, 'register_rest_routes']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_assets']);
        add_shortcode(self::SHORTCODE, [__CLASS__, 'render_shortcode']);
    }

    public static function register_content_model() {
        register_post_type(
            self::CPT,
            [
                'labels' => [
                    'name' => 'Videos ABACO',
                    'singular_name' => 'Video ABACO',
                    'add_new_item' => 'Agregar video ABACO',
                    'edit_item' => 'Editar video ABACO',
                ],
                'public' => true,
                'show_ui' => true,
                'show_in_rest' => true,
                'menu_position' => 25,
                'menu_icon' => 'dashicons-video-alt3',
                'supports' => ['title'],
                'has_archive' => false,
                'rewrite' => ['slug' => 'recursos-abaco'],
            ]
        );

        $taxonomy_args = [
            'public' => true,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true,
            'hierarchical' => false,
        ];

        register_taxonomy(self::TAX_TIPO, [self::CPT], array_merge($taxonomy_args, [
            'labels' => [
                'name' => 'Tipos de contenido',
                'singular_name' => 'Tipo de contenido',
            ],
        ]));

        register_taxonomy(self::TAX_BANCO, [self::CPT], array_merge($taxonomy_args, [
            'labels' => [
                'name' => 'Bancos de alimentos',
                'singular_name' => 'Banco de alimentos',
            ],
        ]));

        register_taxonomy(self::TAX_PROGRAMA, [self::CPT], array_merge($taxonomy_args, [
            'labels' => [
                'name' => 'Programas',
                'singular_name' => 'Programa',
            ],
        ]));

        self::register_meta('abaco_fecha', 'string');
        self::register_meta('abaco_duracion', 'string');
        self::register_meta('abaco_youtube_id', 'string');
        self::register_meta('abaco_enlace', 'string');
        self::register_meta('abaco_entrevistado', 'string');
        self::register_meta('abaco_tema', 'string');
    }

    private static function register_meta($key, $type) {
        register_post_meta(self::CPT, $key, [
            'show_in_rest' => true,
            'single' => true,
            'type' => $type,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback' => function() {
                return current_user_can('edit_posts');
            },
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

        wp_localize_script('abaco-recursos-script', 'ABACO_CONFIG', [
            'apiUrl' => esc_url_raw(rest_url('abaco/v1/videos')),
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

    public static function register_rest_routes() {
        register_rest_route('abaco/v1', '/videos', [
            'methods' => WP_REST_Server::READABLE,
            'permission_callback' => '__return_true',
            'callback' => [__CLASS__, 'get_videos'],
        ]);
    }

    public static function get_videos() {
        $query = new WP_Query([
            'post_type' => self::CPT,
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'orderby' => 'date',
            'order' => 'DESC',
            'no_found_rows' => true,
        ]);

        $videos = [];

        foreach ($query->posts as $post) {
            $post_id = (int) $post->ID;

            $videos[] = [
                'fecha' => self::resolve_fecha($post_id, $post),
                'enlace' => self::meta($post_id, 'abaco_enlace'),
                'youtube_id' => self::meta($post_id, 'abaco_youtube_id'),
                'tiempo' => self::meta($post_id, 'abaco_duracion'),
                'programa' => self::term_or_empty($post_id, self::TAX_PROGRAMA),
                'entrevistado' => self::meta($post_id, 'abaco_entrevistado'),
                'banco' => self::term_or_empty($post_id, self::TAX_BANCO),
                'tema' => self::resolve_tema($post_id, $post),
                'tipo' => self::term_or_empty($post_id, self::TAX_TIPO),
            ];
        }

        return rest_ensure_response([
            'videos' => $videos,
            'total' => count($videos),
        ]);
    }

    private static function resolve_fecha($post_id, $post) {
        $fecha = self::meta($post_id, 'abaco_fecha');
        if ($fecha !== '') {
            return $fecha;
        }
        return mysql2date('j/n/Y', $post->post_date);
    }

    private static function resolve_tema($post_id, $post) {
        $tema = self::meta($post_id, 'abaco_tema');
        if ($tema !== '') {
            return $tema;
        }
        return get_the_title($post);
    }

    private static function meta($post_id, $key) {
        return trim((string) get_post_meta($post_id, $key, true));
    }

    private static function term_or_empty($post_id, $taxonomy) {
        $terms = get_the_terms($post_id, $taxonomy);
        if (is_wp_error($terms) || empty($terms)) {
            return '';
        }

        return (string) $terms[0]->name;
    }
}

Abaco_Recursos_Plugin::init();
