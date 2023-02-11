( function( blocks, editor, element, components ) {

    var createElement = element.createElement;
    var RichText = editor.RichText;
    var PlainText = editor.PlainText;
    var SelectControl = components.SelectControl;

    blocks.registerBlockType( 'onedicesix/table', {
        title: 'One Dice Six Generator',
        icon: 'admin-settings',
        category: 'widgets',
        supports: {
            // Removes support for an HTML mode.
            html: false,
        },
        attributes: {
            tableID: {
                type: 'string',
                default: '',
            },
        },

        edit: function( props ) {
            var tableID = props.attributes.tableID;

            function onChangeTable( id ) {
                props.setAttributes( { tableID: id } );
            }

            return [
                createElement(
                    SelectControl,
                    {
                        label: 'Random Table',
                        value: tableID,
                        onChange: onChangeTable,
                        options: onedicesix.generators
                    }
                )
            ];
        },

        save: function( props ) {
            var tableID = props.attributes.tableID;

            return createElement(
                'div',
                {
                    'class': 'onedicesix-table',
                    'data-table-id': tableID
                },
                'Generate ' + tableID
            );
        }
    } );
} )(
    window.wp.blocks,
    window.wp.editor,
    window.wp.element,
    window.wp.components
);
