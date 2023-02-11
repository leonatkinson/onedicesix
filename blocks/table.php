<?php
/**
 * Functions to register client-side assets (scripts and stylesheets) for the
 * Gutenberg block.
 *
 * @package onedicesix
 */
namespace OneDiceSix;

/**
 * Registers all block assets so that they can be enqueued through Gutenberg in
 * the corresponding context.
 *
 * @see https://wordpress.org/gutenberg/handbook/blocks/writing-your-first-block-type/#enqueuing-block-scripts
 */
function table_block_init() {
    $dir = dirname( __FILE__ );

    $block_js = 'table/block.js';
    wp_register_script(
        'table-block-editor',
        plugins_url( $block_js, __FILE__ ),
        array(
            'wp-blocks',
            'wp-editor',
            'wp-element',
            'wp-components',
        ),
        false //filemtime( "$dir/$block_js" )
    );

    $editor_css = 'table/editor.css';
    wp_register_style(
        'table-block-editor',
        plugins_url( $editor_css, __FILE__ ),
        array(
            'wp-blocks',
        ),
        false //filemtime( "$dir/$block_js" )
    );

    $style_css = 'table/style.css';
    wp_register_style(
        'table-block',
        plugins_url( $style_css, __FILE__ ),
        array(
            'wp-blocks',
        ),
        false //filemtime( "$dir/$block_js" )
    );

    register_block_type( 'onedicesix/table', array(
        'editor_script' => 'table-block-editor',
        'editor_style'  => 'table-block-editor',
        'style'         => 'table-block',
    ) );

    // Add list of generators to a javascript variable
    $generators = [];
    foreach (glob(Plugin::$path . '/generators/*.txt') as $path) {
        $g = file_get_contents($path);
        preg_match('/^name:(.*)/', $g, $label);
        $generators[] = [ 'value' => basename($path), 'label' => trim($label[1]) ];
    }
    wp_localize_script( 'table-block-editor', 'onedicesix', [
        'generators' => $generators,
        ] );

}
add_action( 'init', 'OneDiceSix\table_block_init' );
