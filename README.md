# Welcome to RichTextJS
A standalone rich text editor with no external dependencies and based entirely on the HTML5 canvas. You can test the current status at [richtextjs.com](http://richtextjs.com).

# Why ?
I could not have imagined developing a rich text editor some time ago ... but I do need a full featured rich text editor for my VisualGraphics.tv application framework. And nothing I found fits the bill.

RichTextJS is inspired by (but does not share any code with) [Carota](https://github.com/danielearwicker/carota).

# Features

* Customizable fonts (and font attributes)
* Ordered and unordered lists
* Links (activated via callbacks)
* Vertical scrollbar with customizable drawing
* HTML / text export

# Missing features
We are at the start of the development cycle, so there are quite a few missing features.

* HTML import, Markdown export
* Text align
* Multiple columns
* Bugfixes and more

# Using RichTextJS
When using outside of npm, just include the richtext.js source file. Sorry, no .min version yet. The following code segments are taken from the example (index.html).

## Getting started

To create the basic rich text editor.

```javascript
let defaultFont = {
    name : "open sans",
    size : 24,
    attributes : { bold : false, italic : false },
    style : 'black',
    text : "24pt open sans"
};

let tagList = [
    { name : "h1", size : 30 },
    { name : "h2", size : 20 },
    { name : "h3", size : 18 },
    { name : "h4", size : 16 },
    { name : "p", size : 14 },
];

let canvas = document.getElementById( 'editorCanvas' );
let richText = new RichText.Editor( { canvas : canvas, defaultFont : defaultFont, tagList : tagList } );
```
The default font is, well, the default font used by the editor. The tag list is used for exporting HTML. During export the size of the font is matched to the taglist. Importing HTML is not yet supported but should be added soon.

The canvas element is the 2d canvas you want to use for the editor.

## Feeding text and keyboard events

As RichTextJS is not part of the DOM, you will need to feed text and mouse events per hand.

```javascript
// --- Handle text input
document.onkeypress = ( event ) => {
    if ( richText.hasFocus() ) {
        let code = window.event ? window.event.keyCode : event.which;

        // --- No Backspace, enter or tab
        if ( code !== 8 && code !== 13 && code != 9 )
        {
            let text = String.fromCharCode( code );
            richText.textInput( text );
            update(); // Have to call manually after textInput()
        }
        event.preventDefault();
    }
};

// --- Handle key down
document.onkeydown = ( event ) => {
    if ( richText.hasFocus() ) {
        let keyCode = event.keyCode;

        let keyText = "";
        if ( keyCode === 13 ) keyText = "Enter";
        else if ( keyCode === 8 ) keyText = "Backspace";
        else if ( keyCode === 37 ) keyText = "ArrowLeft";
        else if ( keyCode === 38 ) keyText = "ArrowUp";
        else if ( keyCode === 39 ) keyText = "ArrowRight";
        else if ( keyCode === 40 ) keyText = "ArrowDown";

        if ( keyText ) {
            richText.keyDown( keyText );
            event.preventDefault();
        }
    }
};

// --- Handle mouse events
let getMousePos = ( canvas, event ) => {
    let rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

document.onmousedown = ( event ) => {
    let mousePos = getMousePos( canvas, event );
    if ( mousePos.x >= 0 && mousePos.y >= 0 && mousePos.x <= richText.width &&
            mousePos.y <= richText.height ) {
        richText.mouseDown( mousePos );
    }
};

document.onmousemove = ( event ) => {
    if ( richText.hasFocus() ) {
        richText.mouseMove( getMousePos( canvas, event ) );
        event.preventDefault();
    }
};

document.onmouseup = ( event ) => {
    if ( richText.hasFocus() ) {
        richText.mouseUp( getMousePos( canvas, event ) );
        event.preventDefault();
    }
};
```

## Resizing the editor

If the canvas resizes, you have to call the layout() function to notify the editor to relayout the lines.

```javascript
// --- Resize
window.addEventListener( 'resize', () => {
    let canvas = document.getElementById( 'editorCanvas' );
    canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    richText.layout( canvas.width, canvas.height );
} );
```

## Notifications

The editor sends some notification callbacks.

```javascript
richText.gotoUrl( ( url ) => {
    let element = document.querySelector( '#links' );
    if ( element.checked ) window.open( url )
} );

richText.contentChanged( ( editor ) => textArea.value = editor.export( "html" ) );
```

The gotoUrl() callback is called when a link is clicked inside the editor and contentChanged() whenever the content of the editor changes. If you need to implement undo / redo in your application, you can do that using contentChanged() and the load() / save() functions.

## Scrollbar

By default RichTextJS does not draw a vertical scrollbar, for that you have to set the width and the function to draw the scrollbar.

```javascript
richText.setScrollBar( 12, ( ctx, rect ) => {
    ctx.fillStyle = 'darkGray';
    ctx.fillRect( rect.x, rect.y, rect.width, rect.height );
} );
```

The callback is passed the context and the rectangle of the scrollbar handle to draw. In this example we just draw a solid dark gray scrollbar. You can adjust the scrollbar drawing code to fit the style of your application.

## Import / Export

Loading and saving is supported via the load() / save() functions which load or save to JSON. You can tell save() to include the cursor position for undo / redo implementations.

You can export to text and html using the export function, like

```javascript
let exportSelection = false;
richText.export( "html", exportSelection );
```

If exportSelection is enabled, only the current selection is exported (if any.)

HTML import will be added soon.

---

If you have any problems or questions feel free to open an issue or contact me at markus@moenig.tv.