<?php
/**
 * Plugin Name:     One Dice Six
 * Plugin URI:      PLUGIN SITE HERE
 * Description:     Framework for tables for random generation
 * Author:          Leon Atkinson
 * Author URI:      https://18int.com/
 * Text Domain:     onedicesix
 * Version:         1.8.1
 *
 * @package         Onedicesix
 */
namespace OneDiceSix;

class Plugin {

    public static $path;
    public static $url;

    public static function init() {
        self::$path = plugin_dir_path(__FILE__);
        self::$url = plugins_url('/', __FILE__);

        // Styles and Scripts for the front end
        add_action('wp_enqueue_scripts', function () {
            wp_enqueue_style('onedicesix', Plugin::$url . 'generator.css');
            wp_enqueue_script(
                'onedicesix',
                Plugin::$url . 'generator.js',
                ['jquery'],
                false, //filemtime(Plugin::$path . 'generator.js'),
                true
                );
            wp_localize_script( 'onedicesix', 'onedicesix', [
                'url' => Plugin::$url . 'generators/',
                ] );
        });
    }
}

Plugin::init();

require 'blocks/table.php';
