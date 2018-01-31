/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module image/image/imageengine
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import buildModelConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildmodelconverter';
import buildViewConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildviewconverter';
import {
	viewFigureToModel,
	createImageAttributeConverter,
	srcsetAttributeConverter
} from './converters';
import { toImageWidget } from './utils';
import ModelElement from '@ckeditor/ckeditor5-engine/src/model/element';
import ViewContainerElement from '@ckeditor/ckeditor5-engine/src/view/containerelement';
import ViewEmptyElement from '@ckeditor/ckeditor5-engine/src/view/emptyelement';

/**
 * The image engine plugin.
 * Registers `<image>` as a block element in the document schema, and allows `alt`, `src` and `srcset` attributes.
 * Registers converters for editing and data pipelines.
 *
 * @extends module:core/plugin~Plugin
 */
export default class ImageEngine extends Plugin {
	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const schema = editor.model.schema;
		const data = editor.data;
		const editing = editor.editing;
		const t = editor.t;

		// Configure schema.
		schema.register( 'image', {
			isObject: true,
			isBlock: true,
			allowWhere: '$block',
			allowAttributes: [ 'alt', 'src', 'srcset' ]
		} );

		// Build converter from model to view for data pipeline.
		buildModelConverter().for( data.modelToView )
			.fromElement( 'image' )
			.toElement( () => createImageViewElement() );

		// Build converter from model to view for editing pipeline.
		buildModelConverter().for( editing.modelToView )
			.fromElement( 'image' )
			.toElement( () => toImageWidget( createImageViewElement(), t( 'image widget' ) ) );

		createImageAttributeConverter( [ editing.modelToView, data.modelToView ], 'src' );
		createImageAttributeConverter( [ editing.modelToView, data.modelToView ], 'alt' );

		// Convert `srcset` attribute changes and add or remove `sizes` attribute when necessary.
		createImageAttributeConverter( [ editing.modelToView, data.modelToView ], 'srcset', srcsetAttributeConverter );

		// Build converter for view img element to model image element.
		buildViewConverter().for( data.viewToModel )
			.from( { name: 'img', attribute: { src: true } } )
			.toElement( viewImage => new ModelElement( 'image', { src: viewImage.getAttribute( 'src' ) } ) );

		// Build converter for alt attribute.
		buildViewConverter().for( data.viewToModel )
			.from( { name: 'img', attribute: { alt: true } } )
			.consuming( { attribute: [ 'alt' ] } )
			.toAttribute( viewImage => ( { key: 'alt', value: viewImage.getAttribute( 'alt' ) } ) );

		// Build converter for srcset attribute.
		buildViewConverter().for( data.viewToModel )
			.from( { name: 'img', attribute: { srcset: true } } )
			.consuming( { attribute: [ 'srcset' ] } )
			.toAttribute( viewImage => {
				const value = {
					data: viewImage.getAttribute( 'srcset' )
				};

				if ( viewImage.hasAttribute( 'width' ) ) {
					value.width = viewImage.getAttribute( 'width' );
				}

				return {
					key: 'srcset',
					value
				};
			} );

		// Converter for figure element from view to model.
		data.viewToModel.on( 'element:figure', viewFigureToModel() );
	}
}

// Creates a view element representing the image.
//
//		<figure class="image"><img></img></figure>
//
// Note that `alt` and `src` attributes are converted separately, so they are not included.
//
// @private
// @return {module:engine/view/containerelement~ContainerElement}
export function createImageViewElement() {
	return new ViewContainerElement( 'figure', { class: 'image' }, new ViewEmptyElement( 'img' ) );
}
