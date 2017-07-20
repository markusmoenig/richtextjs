RichText = {};

/**
 * Measures the given text.
 * @param {string} text
 * @param {string} fontText - The font
 * @returns {object} metrics
 */

RichText.measureText = function( text, fontText )
{
    // Based on https://github.com/ryansturmer/em.js/blob/master/em.js

    let metrics = {};

    this.ctx.font = fontText;
    this.ctx.textBaseline = 'top';
    metrics.width = this.ctx.measureText( text ).width;

    let textSpan = document.createElement('span');
    textSpan.innerHTML = text;
    textSpan.style.font = fontText;

    let block = document.createElement("div");
    block.style.display = 'inline-block';
    block.style.width = '1px';
    block.style.height = '0px';

    let div = document.createElement('div');
    div.appendChild(textSpan);
    div.appendChild(block);

    let body = document.body;
    body.appendChild(div);

    metrics.ascent = -1;
    metrics.descent = -1;
    metrics.height = -1;

    try {
        block.style['vertical-align'] = 'baseline';
        metrics.ascent = block.offsetTop - textSpan.offsetTop;
        block.style['vertical-align'] = 'bottom';
        metrics.height = block.offsetTop - textSpan.offsetTop;
        metrics.descent = metrics.height - metrics.ascent;
    } finally {
        document.body.removeChild(div);
    }

    // if ( !text.includes('q') && !text.includes('y') && !text.includes('j') && !text.includes('g') && !text.includes('J') ) {
        // metrics.height -= metrics.descent;
        // metrics.descent = 0;
    // }

    return metrics;
};

/**
 * Manages the list of elements for the document. Each element contains text for a specific font.
 * @constructor
 */

RichText.ElementManager = class {

    constructor( defaultFont ) {
        this.elements = [];
        this.defaultFont = defaultFont;
    }

    /**
     * @returns {number} The length of the element array.
     */

    length() {
        return this.elements.length;
    }

    /**
     * Returns the element object at the given index.
     * @param {number} index
     * @returns {object} The elements at the given index.
     */

    at( index ) {
        return this.elements[index];
    }

   /**
     * Creates a new element;
     */

    createElement( font )
    {
        if ( !font ) font = this.defaultFont;
        let el = { text : "", font : Object.assign( {}, font ) };
        return el;
    }

    /**
     * Returns the current element.
     */

    getCurrentElement()
    {
        if ( !this.current ) {
            this.current = this.createElement();
            this.elements.push( this.current );
        }

        return this.current;
    }

    /**
     * Returns the element before the given element.
     */

    getPreviousElement( el )
    {
        let index = this.elements.indexOf( el );
        if ( index )
            return this.elements[index-1];
    }

    /**
     * Removes the given element.
     * @param {object} el - the element to remove
     */

    removeElement( el )
    {
        let index = this.elements.indexOf( el );
        if ( index !== -1 ) this.elements.splice( index, 1 );
    }

    /**
     * Splits the element at the given offset, inserts the new element and returns it.
     * @param {*} el
     * @param {*} offset
     * @returns {object} The created element.
     */

    splitElement( el, offset ) {
        let newEl = this.createElement();
        newEl.font = Object.assign( {}, el.font );

        let index = this.elements.indexOf( el );
        this.elements.splice( index + 1, 0, newEl );

        newEl.text = el.text.substr( offset );
        el.text = el.text.substr( 0, offset );

        this.rewordElement( el );
        this.rewordElement( newEl );

        return newEl;
    }

    /**
     * Inserts the element at the given location.
     * @param {*} el
     * @param {*} loc
     */

    insertElementAt( el, loc )
    {
        // console.log( loc.element.text.length, loc.offset );
        if ( loc.element.text.length === loc.offset ) {
            // --- Insert it behind the location element
            let index = this.elements.indexOf( loc.element );
            this.elements.splice( index + 1, 0, el );
        } else
        if ( loc.offset === 0 ) {
            // --- Insert it before the location element
            let index = this.elements.indexOf( loc.element );
            this.elements.splice( Math.min( index - 1, 0 ), 0, el );
        } else {
            this.splitElement( loc.element, loc.offset );
            let index = this.elements.indexOf( loc.element );
            this.elements.splice( index + 1, 0, el );
        }
    }

    /**
     *
     * @param {*} el
     * @param {*} fromElement
     * @param {*} toElement
     * @returns {bool} True if the given element is located between the from and to element, false otherwise.
     */

    isElementInsideRange( el, fromElement, toElement )
    {
        let fromIndex = this.elements.indexOf( fromElement ), toIndex = this.elements.indexOf( toElement );
        if ( fromIndex === -1 || toIndex === -1 ) return false;

        let index = this.elements.indexOf( el );

        if ( index >= fromIndex && index <= toIndex ) return true;
        else return false;
    }

    /**
     * Deletes the given range between the two locations.
     * @param {*} fromLoc
     * @param {*} toLoc
     * @returns {object} The new location.
     */

    deleteRange( fromLoc, toLoc )
    {
        let elements = [];
        let newLoc = {};
        for( let i = 0; i < this.elements.length; ++i )
        {
            let el = this.elements[i];

            if ( this.isElementInsideRange( el, fromLoc.element, toLoc.element ) )
            {
                if ( el !== fromLoc.element && el !== toLoc.element )
                    continue; // Delete if inside range
                else
                if ( el === fromLoc.element && el === toLoc.element )
                {
                    let text = fromLoc.element.text;
                    fromLoc.element.text = text.substr( 0, fromLoc.offset ) + text.substr( toLoc.offset, text.length - toLoc.offset );
                    this.rewordElement( fromLoc.element );

                    elements.push( fromLoc.element );
                    newLoc.element = fromLoc.element;
                    newLoc.offset = fromLoc.offset;
                } else
                if ( el === fromLoc.element )
                {
                    let text = fromLoc.element.text;
                    fromLoc.element.text = text.substr( 0, fromLoc.offset );
                    this.rewordElement( fromLoc.element );

                    elements.push( fromLoc.element );
                    newLoc.element = fromLoc.element;
                    newLoc.offset = fromLoc.offset;
                } else
                if ( el === toLoc.element )
                {
                    let text = toLoc.element.text;
                    toLoc.element.text = text.substr( toLoc.offset, text.length - toLoc.offset );
                    this.rewordElement( toLoc.element );

                    elements.push( toLoc.element );
                }
            } else elements.push( el );
        }
        this.elements = elements;
        return newLoc;
    }

    /**
     * Applies the font to the range between the two locations.
     * @param {*} font
     * @param {*} fromLoc
     * @param {*} toLoc
     * @returns {object} The new location.
     */

    applyFontToRange( font, fromLoc, toLoc )
    {
        let elements = [];
        let newLoc = {};

        let newFromElement, newFromOffset;
        let newToElement, newToOffset;

        for( let i = 0; i < this.elements.length; ++i )
        {
            let el = this.elements[i];

            if ( this.isElementInsideRange( el, fromLoc.element, toLoc.element ) )
            {
                if ( el !== fromLoc.element && el !== toLoc.element )
                {
                    // --- If inside the range, apply font to the whole element
                    el.font = Object.assign( {}, font );
                    this.rewordElement( el );
                    elements.push( el );
                }
                else
                if ( el === fromLoc.element && el === toLoc.element )
                {
                    if ( fromLoc.offset === 0 && toLoc.offset === el.text.length )
                    {
                        // --- The whole element is selected
                        el.font = Object.assign( {}, font );
                        this.rewordElement( el );
                        elements.push( el );

                        newLoc.element = el;
                        newLoc.offset = el.text.length;
                    } else {
                        let text = el.text;

                        if ( fromLoc.offset ) {
                            el.text = text.substr( 0, fromLoc.offset );
                            this.rewordElement( el );
                            elements.push( el );
                        }

                        let middleEl = this.createElement( font );
                        middleEl.text = text.substr( fromLoc.offset, toLoc.offset - fromLoc.offset );
                        this.rewordElement( middleEl );
                        elements.push( middleEl );

                        newFromOffset = 0;
                        newFromElement = middleEl;

                        if ( text.length - toLoc.offset ) {
                            let endEl = this.createElement( toLoc.element.font );
                            endEl.text = text.substr( toLoc.offset, text.length - toLoc.offset );
                            this.rewordElement( endEl );
                            elements.push( endEl );
                        }

                        newToOffset = middleEl.text.length;
                        newToElement = middleEl;

                        newLoc.element = middleEl;
                        newLoc.offset = middleEl.text.length;
                    }
                } else
                if ( el === fromLoc.element )
                {
                    let text = el.text;
                    if ( fromLoc.offset === 0 ) el.font = Object.assign( {}, font );
                    else if ( fromLoc.offset > 0 ) el.text = text.substr( 0, fromLoc.offset );
                    this.rewordElement( el );
                    elements.push( el );

                    if ( fromLoc.offset > 0 ) {
                        let middleEl = this.createElement( font );
                        middleEl.text = text.substr( fromLoc.offset, text.length - fromLoc.offset );
                        this.rewordElement( middleEl );
                        elements.push( middleEl );

                        newFromOffset = 0;
                        newFromElement = middleEl;
                    }
                } else
                if ( el === toLoc.element )
                {
                    let text = el.text;
                    let oldFont = Object.assign( {}, el.font );
                    el.text = text.substr( 0, toLoc.offset );
                    el.font = Object.assign( {}, font );
                    this.rewordElement( el );
                    elements.push( el );

                    newToOffset = el.text.length;
                    newToElement = el;

                    newLoc.offset = el.text.length;
                    newLoc.element = el;

                    if ( toLoc.offset < text.length ) {
                        let middleEl = this.createElement( oldFont );
                        middleEl.text = text.substr( toLoc.offset, text.length - toLoc.offset );
                        this.rewordElement( middleEl );
                        elements.push( middleEl );
                    }
                }
            } else elements.push( el );
        }
        this.elements = elements;

        // --- Adjust the selection if necessary

        if ( newFromElement ) {
            fromLoc.element = newFromElement;
            fromLoc.offset = newFromOffset;
        }

        if ( newToElement ) {
            toLoc.element = newToElement;
            toLoc.offset = newToOffset;
        }

        return newLoc;
    }

    /**
     *
     * @param {object} fromLoc
     * @param {object} toLoc
     */

    createFontForRange( fromLoc, toLoc ) {
        let font = {
            attributes : {},
        };

        let set = ( font, elFont, name ) => {
            if ( !font[name] ) font[name] = elFont[name];
            else if ( font[name] != elFont[name] ) font[name] = -1;
        };

        let setAttribute = ( font, elFont, name ) => {
            if ( font.attributes[name] === undefined ) font.attributes[name] = elFont.attributes[name];
            else if ( font.attributes[name] !== elFont.attributes[name] ) font.attributes[name] = -1;
        };

        for( let i = 0; i < this.elements.length; ++i )
        {
            let el = this.elements[i];

            if ( this.isElementInsideRange( el, fromLoc.element, toLoc.element ) )
            {
                let elFont = el.font;

                set( font, elFont, "name" );
                set( font, elFont, "text" );
                set( font, elFont, "size" );
                setAttribute( font, elFont, "bold" );
                setAttribute( font, elFont, "italic" );
            }
        }
        return font;
    }

    /**
     * Clean
     */

    clean( )
    {
        let elements = [];
        for( let i = 0; i < this.elements.length; ++i )
        {
            let el = this.elements[i];

            if ( el.words ) elements.push( el );
        }
        this.elements = elements;
    }

    /**
     * Parses the given element and creates an array of words with their prefixes from the element's text.
     */

    rewordElement( el )
    {
        el.words = [];
        el.maxWordHeight = 0;
        el.maxAscent = 0;
        el.maxDescent = 0;

        let prefix = "";
        let word = "";

        let pushWord = ( prefix, word, offset ) => {
            let obj = { prefix : prefix, word : word, lineBreak : false };

            obj.prefixMetrics = RichText.measureText( prefix, el.font.text );
            obj.wordMetrics = RichText.measureText( word, el.font.text );

            // --- Calculate offset into the elements text
            obj.offset = offset;
            if ( prefix.length ) obj.offset -= prefix.length;
            if ( word.length ) obj.offset -= word.length;
            obj.endOffset = offset;

            obj.width = obj.prefixMetrics.width + obj.wordMetrics.width;
            obj.height = Math.max( obj.prefixMetrics.height, obj.wordMetrics.height );

            el.maxAscent = Math.max( el.maxAscent, obj.wordMetrics.ascent );
            el.maxDescent = Math.max( el.maxDescent, obj.wordMetrics.descent );

            obj.text = prefix + word;

            el.words.push( obj );
        };

        let pushLineBreak = () => {
            el.words.push( { lineBreak : true } );
        };

        for ( let i = 0; i < el.text.length; ++i )
        {
            let c = el.text.charAt( i );

            if ( c === ' ' )
            {
                if ( word.length ) {
                    pushWord( prefix, word, i );
                    prefix = ""; word = "";
                }
                prefix += c;
            } else
            if ( c === '\n' )
            {
                if ( prefix.length || word.length )
                    pushWord( prefix, word, i );

                pushLineBreak();
                prefix = ""; word = "";
            }
            else word += c;
        }

        if ( prefix.length || word.length )
            pushWord( prefix, word, el.text.length );
    }
};

/**
 * The editor class.
 * @constructor
 */

RichText.Editor = class {

    constructor( { canvas, defaultFont, tagList } = {} ) {

        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        RichText.ctx = this.ctx;

        this.defaultFont = defaultFont;
        this.tagList = tagList;

        this.wordWrap = true;

        this.blinkStateChanged = 0;

        this.cursorLocation = {
            x : 0,
            y : 0,
            offset : 0,
        };

        this.elements = new RichText.ElementManager( defaultFont );

        this._redraw = () => {};
        this._fontChanged = () => {};
        this._contentChanged = () => {};

        this.focus = true;

        this.defaultFontHeight = RichText.measureText( "h", defaultFont.text ).height;
    }

    /**
     * Sets the focus state of the editor. When the editor does not have focus, the cursor will not be animated.
     * @param {boolean} focus
     */

    setFocus( focus ) {
        this.focus = focus;
        this.mouseIsDown = false;
        if ( focus ) {
            this.resetBlinkState();
            this.updateBlinkState();
            this._redraw();
        } else {
            this.blinkState = false;
            this._redraw();
        }
    }

    /**
     * @returns {boolean} The focus state of the editor.
     */

    hasFocus() {
        return this.focus;
    }

    /**
     * Sets the redraw callback function. When the editor needs to be redrawn, it calls this function. The callback mostly just calls the draw() function.
     * @param {function} func
     */

    needsRedraw( func ) {
        this._redraw = func;
    }

    /**
     * Sets the callback for the content changed event.
     * @param {function} func - Called when the editor content changes.
     */

    contentChanged( func ) {
        this._contentChanged = func;
    }

    /**
     * Sets the callback for the font changed event.
     * @param {function} func - Called when the font under the cursor changes.
     */

    fontChanged( func ) {
        this._fontChanged = func;
    }

    /**
     * Sets the given font.
     * @param {object} font - The font to apply to the editor.
     */

    setFont( font )
    {
        if ( this.selection ) {
            this.cursorLocation = this.elements.applyFontToRange( font, this.selectionStart, this.selectionEnd );
            this.linalyze();
            this.elements.current = this.cursorLocation.element;

            this.getPositionForElementOffset( this.selectionEnd.element, this.selectionEnd.offset, this.selectionEnd );
            this.getPositionForElementOffset( this.cursorLocation.element, this.cursorLocation.offset, this.cursorLocation );
            this.resetBlinkState();
            this._contentChanged( this );
        } else {
            if ( this.elements.current && !this.elements.current.words ) {
                this.elements.current.font = Object.assign( {}, font );
            } else {
                let el = this.elements.createElement( font );

                if ( !this.cursorLocation.element )
                    this.cursorLocation.element = el;

                this.elements.insertElementAt( el, this.cursorLocation );
                this.elements.current = el;

                this.cursorLocation.offset = 0;
            }
        }
    }

    /**
     * Marks the cursor as visible, called after mouse or text events.
     */

    resetBlinkState()
    {
        this.blinkState = true;
        this.blinkStateChanged = Date.now();
    }

    /**
     * Updates the blink state. Calls setTimeout() for blink state animation.
     */

    updateBlinkState()
    {
        this.redrawAt = Date.now();
        setTimeout( function() {
            let time = Date.now();
            if ( this.focus && time - this.blinkStateChanged >= 600 ) {
                this.blinkState = !this.blinkState;
                this.blinkStateChanged = time;
                this._redraw();
            }
        }.bind( this ), 600 );
    }

    /**
     * Finds the x, y position for the text offset inside the given element and writes the position into the given object.
     * @param {object} el - The element.
     * @param {number} offset - The text offset inside the element.
     * @param {object} object - The object to write the x, y coordinates into.
     */

    getPositionForElementOffset( el, offset, object )
    {
        let x, y = 0;
        let off = 0;
        let lastOffset;

        object.x = 0;

        for( let l = 0; l < this.lines.length; ++l )
        {
            let line = this.lines[l];
            x = line.offset;

            for ( let w = 0; w < line.words.length; ++w )
            {
                let lWord = line.words[w];

                if ( lWord.element === el )
                {
                    let text = lWord.text;

                    if ( lWord.wrapped ) x -= lWord.prefixMetrics.width;

                    if ( lWord.offset <= offset && lWord.offset + text.length >= offset )
                    {
                        // --- Offset is in this word

                        this.ctx.font = lWord.element.font.text;

                        // --- Find the character
                        for ( let i = 0; i < text.length; ++i )
                        {
                            let c = text.charAt( i );
                            x += this.ctx.measureText( c ).width;

                            if ( lWord.offset + i + 1 === offset ) {
                                object.x = x;
                                object.y = y;
                                object.line = line;
                                return;
                            }
                        }
                    }
                    lastOffset = lWord.endOffset;
                }

                // if ( lWord.wrapped ) x += lWord.wordMetrics.width;
                // else x += lWord.width;
                x += lWord.width;
            }

            y += line.maxHeight;

            // --- As linefeeds are not part of the words but new lines, need to check for them separately
            if ( lastOffset ) ++lastOffset;
            if ( lastOffset === offset ) {
                object.x = line.offset;
                object.y = y;
                object.line = line;
            }

            // --- When no word at all is present, make sure object is initialized correctly
            if ( lastOffset === undefined ) {
                object.x = line.offset;
                object.y = y - line.maxHeight;
                object.line = line;
            }
        }
    }

    /**
     * Finds the text location for the given x, y coordinate.
     * @param {object} pos
     * @returns {object} The location for the given coordinates
     */

    getLocationForMousePos( pos )
    {
        let x = 0, y = 0;

        for( let l = 0; l < this.lines.length; ++l )
        {
            let line = this.lines[l];
            x = line.offset;

            if ( pos.y >= y && pos.y <= ( y + line.maxHeight ) || ( l === this.lines.length - 1 ) )
            {
                // --- Mouse click was on this line
                let rc = {};
                rc.line = line;
                rc.y = y;

                for ( let w = 0; w < line.words.length; ++w )
                {
                    let lWord = line.words[w];
                    let d;

                    if ( lWord.wrapped ) {
                        // --- First word per line, only print word
                        d = lWord.wordMetrics.width;
                    } else {
                        d = lWord.width;
                    }

                    if ( pos.x >= x && pos.x <= ( x + d ) )
                    {
                        // --- Hit inside this word
                        rc.element = lWord.element;
                        rc.offset = lWord.offset;

                        let text = lWord.text;
                        if ( lWord.wrapped ) x -= lWord.prefixMetrics.width;

                        this.ctx.font = lWord.element.font.text;

                        // --- Find the character
                        for ( let i = 0; i < text.length; ++i )
                        {
                            let c = text.charAt( i );
                            let cw = this.ctx.measureText( c ).width;

                            if ( pos.x <= x + cw / 2 ) {
                                rc.x = x;
                                break;
                            } else {
                                x += cw;
                                rc.offset++;
                                if ( i === text.length - 1 )
                                    rc.x = x;
                            }
                        }
                    }

                    x += d;
                }

                if ( !rc.element ) {
                    // --- Not found, put the cursor at the end of the line

                    if ( !line.words.length )
                    {
                        // --- This line is empty, go backward to search for the last word to get element and offset

                        let prev = l - 1;
                        let lastWord;
                        let lineOffset = 1;

                        while( prev >= 0 )
                        {
                            let prevLine = this.lines[prev];
                            if ( prevLine.words.length ) {
                                lastWord = prevLine.words[prevLine.words.length-1];
                                break;
                            }
                            lineOffset += 1; --prev;
                        }

                        if ( lastWord ) {
                            rc.element = lastWord.element;
                            rc.offset = lastWord.endOffset + lineOffset;
                        } else {
                            rc.element = undefined;
                            rc.offset = 0;
                        }
                    } else
                    if ( line.words.length ) {
                        let lastWord = line.words[line.words.length-1];
                        rc.element = lastWord.element;
                        rc.offset = lastWord.endOffset;
                    }

                    rc.x = line.offset + line.maxWidth;
                }

                return rc;
            }

            if ( l < this.lines.length - 1 ) {
                x = 0;
                y += line.maxHeight;
            }
        }
    }

    /**
     * Breaks the elements into lines.
     */

    linalyze() {
        this.lines = [];

        function createLine() {
            let line = {
                words : [],
                maxHeight : 0,
                maxAscent : 0,
                maxDescent : 0,
                maxWidth : 0, // For non word-wrap cases
                offset : 0,
                symbol : "",
            };
            return line;
        }

        let pushLine = ( el, line ) => {
            if ( !line.maxAscent ) line.maxAscent = el.maxAscent;
            if ( !line.maxDescent ) line.maxDescent = el.maxDescent;

            if ( !line.maxHeight )
                line.maxHeight =  el.maxWordHeight ? el.maxWordHeight : el.maxAscent;

            if ( !line.maxAscent ) line.maxAscent = this.defaultFontHeight;
            if ( !line.maxHeight ) line.maxHeight = this.defaultFontHeight;

            this.lines.push( line );
        };

        let remaining = this.width;
        let line = createLine();
        let lastEL;

        let formatTag;

        this.elements.clean();
        for( let i = 0; i < this.elements.length(); ++i ) {
            let el = this.elements.at( i );
            lastEL = el;

            // --- Formatting
            if ( el.font.formatting && formatTag !== el.font.formatting.tag ) {
                let formatting = el.font.formatting;
                formatTag =  formatting.tag;

                pushLine( el, line );
                line = createLine();

                remaining = this.width - formatting.margin[0] - formatting.margin[2];

                line.offset = formatting.margin[0];
                line.symbol = "circle";
            }

            // --- Close formatting
            if ( !el.font.formatting && formatTag ) {
                formatTag = undefined;

                pushLine( el, line );
                line = createLine();
                pushLine( el, line );
                line = createLine();

                remaining = this.width;
            }

            // --- Parse the words
            for ( let w = 0; w < el.words.length; ++w ) {
                let word = el.words[w];
                word.wrapped = false;

                // --- line break
                if ( word.lineBreak ) {
                    pushLine( el, line );
                    line = createLine();
                    remaining = this.width;

                    if ( el.font.formatting ) {
                        line.offset = el.font.formatting.margin[0];
                        remaining -= line.offset - el.font.formatting.margin[2];
                        line.symbol = "circle";
                    }
                    continue;
                }

                // --- Word wrap
                if ( this.wordWrap && word.width > remaining  ) {
                    this.lines.push( line );
                    line = createLine();
                    remaining = this.width;
                    word.wrapped = true;
                    if ( el.font.formatting ) {
                        line.offset = el.font.formatting.margin[0];
                        remaining -= line.offset - el.font.formatting.margin[2];
                    }
                }

                // --- Insert word
                if ( word.width <= remaining ) {
                    // --- Insert the original element for reference
                    Object.defineProperty( word, "element", { enumerable: false, writable: true } );
                    word.element = el;
                    // ---
                    line.words.push( word );

                    line.maxHeight = Math.max( line.maxHeight, word.height );
                    line.maxAscent = Math.max( line.maxAscent, el.maxAscent );
                    line.maxDescent = Math.max( line.maxDescent, el.maxDescent );

                    if ( word.wrapped ) {
                        // --- Word was wrapped, no prefix
                        remaining -= word.wordMetrics.width;
                        line.maxWidth += word.wordMetrics.width;
                    } else {
                        remaining -= word.width;
                        line.maxWidth += word.width;
                    }
                }
            }
        }

        if ( lastEL ) {
            if ( !line.maxAscent ) line.maxAscent = lastEL.maxAscent;
            if ( !line.maxDescent ) line.maxDescent = lastEL.maxDescent;

            if ( !line.maxHeight )
                line.maxHeight =  lastEL.maxWordHeight ? lastEL.maxWordHeight : lastEL.maxAscent;
        }

        // --- If no element with words, get the line height from the default font
        if ( !line.maxAscent ) line.maxAscent = this.defaultFontHeight;
        if ( !line.maxHeight ) line.maxHeight = this.defaultFontHeight;

        this.lines.push( line );
    }

    /**
     * Receives plain text input.
     * @param {string} text
     */

    textInput( text )
    {
        if ( this.selection ) {
            this.cursorLocation = this.elements.deleteRange( this.selectionStart, this.selectionEnd );
            this.linalyze();
            this.selection = false;
            this.elements.current = this.cursorLocation.element;
        }
        let el = this.elements.getCurrentElement();

        let insert = ( str, index, value ) => {
            return str.substr(0, index) + value + str.substr(index);
        };

        el.text = insert( el.text, this.cursorLocation.offset, text );

        this.elements.rewordElement( el );
        this.linalyze();
        this.resetBlinkState();

        this.cursorLocation.offset += text.length;
        this.cursorLocation.element = el;
        this.getPositionForElementOffset( el, this.cursorLocation.offset, this.cursorLocation );

        // this.ctx.font = el.font.text;
        // this.cursorLocation.x += this.measureText( text ).width;

        this._contentChanged( this );
    }

    /**
     * Processes a keyDown event. The key is in a human readable string format like "Enter".
     * @param {string} key
     */

    keyDown( key )
    {
        if ( this.selection ) {
            this.cursorLocation = this.elements.deleteRange( this.selectionStart, this.selectionEnd );
            this.linalyze();
            this.selection = false;
            this.elements.current = this.cursorLocation.element;
            if ( key === "Backspace" ) {
                this.getPositionForElementOffset( this.cursorLocation.element, this.cursorLocation.offset, this.cursorLocation );
                this.resetBlinkState();
                this._contentChanged( this );
                return;
            }
        }
        let el = this.elements.getCurrentElement();

        let insert = ( str, index, value ) => {
            return str.substr(0, index) + value + str.substr(index);
        };

        if ( key === "Enter" )
        {
            el.text = insert( el.text, this.cursorLocation.offset, "\n" );

            this.elements.rewordElement( el );
            this.linalyze();

            this.cursorLocation.offset += 1;
            this.cursorLocation.element = el;
            this.getPositionForElementOffset( el, this.cursorLocation.offset, this.cursorLocation );
            this._contentChanged( this );
        } else
        if ( key === "Backspace" )
        {
            let checkPrevious = () => {
                // --- If at the front of the element, go to previous one.
                if ( !this.cursorLocation.offset ) {
                    let previous = this.elements.getPreviousElement( el );
                    if ( !el.text.length && this.elements.length() > 1 ) this.elements.removeElement( el );
                    if ( previous ) {
                        this.cursorLocation.offset = previous.text.length;
                        this.cursorLocation.element = previous;
                        this.elements.current = previous;

                        el = previous;
                        this.getPositionForElementOffset( el, this.cursorLocation.offset, this.cursorLocation );
                    }
                }
            };

            checkPrevious();

            if ( this.cursorLocation.offset ) {
                el.text = el.text.slice(0, this.cursorLocation.offset - 1 ) + el.text.slice( this.cursorLocation.offset );

                this.elements.rewordElement( el );
                this.linalyze();

                this.cursorLocation.offset -= 1;
                this.cursorLocation.element = el;
                this.getPositionForElementOffset( el, this.cursorLocation.offset, this.cursorLocation );

                this._contentChanged( this );
            }

            checkPrevious();
        }
        this.resetBlinkState();
    }

    /**
     * Processes a mouseDown event.
     * @param {object} pos
     */

    mouseDown( pos )
    {
        if ( pos.x < 0 || pos.y < 0 ) return;
        let rc = this.getLocationForMousePos( pos );

        if ( rc ) {
            this.cursorLocation = rc;
            this.elements.current = rc.element;

            if ( rc.element ) {
                if ( !this.selection ) this._fontChanged( rc.element.font );
                else this._fontChanged( this.elements.createFontForRange( this.selectionStart, this.selectionEnd ) );
            }
        }

        this.resetBlinkState();

        this.mouseIsDown = true;
        this.selection = false;
    }

    /**
     * Processes a mouseMove event.
     * @param {object} pos
     */

    mouseMove( pos )
    {
        if ( !this.mouseIsDown ) return;

        pos.x = Math.max( pos.x, 0 );
        pos.y = Math.max( pos.y, 0 );

        let rc = this.getLocationForMousePos( pos );

        if ( rc ) {
            this.selection = true;

            if ( rc.y < this.cursorLocation.y ) {
                this.selectionStart = rc;
                this.selectionEnd = this.cursorLocation;
            } else
            if ( rc.y === this.cursorLocation.y )
            {
                if ( rc.x <= this.cursorLocation.x ) {
                    this.selectionStart = rc;
                    this.selectionEnd = this.cursorLocation;
                } else {
                    this.selectionStart = this.cursorLocation;
                    this.selectionEnd = rc;
                }

                if ( rc.x === this.cursorLocation.x )
                    this.selection = false;
            } else {
                this.selectionStart = this.cursorLocation;
                this.selectionEnd = rc;
            }
        }

        this._fontChanged( this.elements.createFontForRange( this.selectionStart, this.selectionEnd ) );
    }

    /**
     * Processes a mouseDown event.
     * @param {object} pos
     */

    mouseUp( pos )
    {
        this.mouseIsDown = false;
    }

    /**
     * Layouts the rich text area for the given width, height
     * @param {number} width - The width of the canvas.
     * @param {number} height - The height of the canvas.
     */

    layout( width, height ) {
        this.width = width; this.height = height;
        this.ctx.width = this.width; this.ctx.height = this.height;
        this.linalyze();
        if ( this.cursorLocation.element )
            this.getPositionForElementOffset( this.cursorLocation.element, this.cursorLocation.offset, this.cursorLocation );
    }

    /**
     * Export to the given format.
     * @param {*} type
     */

    export( format )
    {
        let getTagForSize = ( size ) => {
            let tags = this.tagList, diff = 10000, rc;

            tags.forEach( function( tag ) {
                let d = tag.size - size;
                if ( Math.abs( d ) < diff ) {
                    rc = tag.name;
                    diff = Math.abs( d );
                }
            } );
            return rc;
        };

        let transformTextForTag = ( tag, formattingTag, text, attributes ) => {
            let out="";
            // --- Line breaks
            if ( formattingTag === "ul" || formattingTag === "ol" ) {
                out = text.replace(/(\r\n|\n|\r)/gm, "</li><li>" );
            } else
            if ( tag === 'p' ) {
                out = text.replace(/(\r\n|\n|\r)/gm, "</p><p>" );
            } else
            {
                if ( tag[0] === 'h' )
                    out = text.replace(/(\r\n|\n|\r)/gm, "" );
                else
                    out = text.replace(/(\r\n|\n|\r)/gm, "</br>" );
            }
            // --- Attributes
            let open = "", close = "";
            if ( attributes.bold ) { open += "<strong>"; close += "</strong>"; }
            if ( attributes.italic ) { open += "<i>"; close += "</i>"; }
            out = open + out + close;
            return out;
        };

        let rc = "";
        let openTag = "", openFormattingTag = "";
        for( let i = 0; i < this.elements.length(); ++i ) {
            let el = this.elements.at( i );

            if ( el.font.formatting ) {

                let formatting = el.font.formatting;
                openFormattingTag = formatting.tag;

                rc += "<" + openFormattingTag + ">";
                if ( openFormattingTag === "ul" || openFormattingTag === "ol" )
                    rc += "<li>";
            }

            if ( !el.font.formatting && openFormattingTag ) {
                if ( openFormattingTag === "ul" || openFormattingTag === "ol" )
                    rc += "</li>";
                rc += "</" + openFormattingTag + ">";
                openFormattingTag = undefined;
            }

            if ( format === "text") rc += el.text;
            else
            if ( format === "html" )
            {
                let tag = getTagForSize( el.font.size );
                let text = transformTextForTag( tag, openFormattingTag, el.text, el.font.attributes );

                if ( !openTag ) {
                    rc += `<${tag}>${text}`;
                    openTag = tag;
                } else {
                    if ( tag === openTag ) {
                        rc += text;
                    } else {
                        rc += `</${openTag}><${tag}>${text}`;
                        openTag = tag;
                    }
                }
            }
        }

        if ( format === "html" && openTag )
            rc += `</${openTag}>`;

        return rc;
    }

    /**
     * Draws the text at the given screen coordinates. The screen coordinates are only necessary if you don't want to draw the text at 0, 0
     * of your 2D canvas.
     * @param {*} screenX The X offset inside the 2D canvas. 0 by default.
     * @param {*} screenY The Y offset inside the 2D canvas. 0 by default.
     */

    draw( screenX = 0, screenY = 0 )
    {
        let startX = screenX, startY = screenY;
        let ctx = this.ctx;

        let x = 0, y = 0;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect( startX, startY, this.width, this.height );

        ctx.fillStyle = '#000000';
        ctx.textBaseline = 'alphabetic';

        let formatTag;
        for( let l = 0; l < this.lines.length; ++l ) {
            let line = this.lines[l];

            x += line.offset;
            screenX += line.offset;

            if ( line.symbol ) {
                if ( line.symbol === "circle" ) {
                    ctx.beginPath();
                    let radius = Math.min( line.maxHeight, 4.5 );
                    let centerX = line.offset - 4 - radius;
                    let centerY = Math.ceil( line.maxHeight / 2 );

                    ctx.beginPath();
                    ctx.arc( screenX - 14 - radius, screenY + centerY, radius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = 'black';
                    ctx.fill();
                    ctx.closePath();
                }
            }

            if ( !line.words.length && this.selection && ( y >= this.selectionStart.y && y <= this.selectionEnd.y ) ) {
                // --- If empty line, draw a selection rectangle
                ctx.fillStyle = '#b2d0ee';
                ctx.fillRect( startX + x, startY + y, 5, line.maxHeight );
            }

            for ( let w = 0; w < line.words.length; ++w ) {
                let lWord = line.words[w];

                ctx.font = lWord.element.font.text;

                // --- Get the text and width to draw

                let textToDraw, textToDrawWidth;

                if ( lWord.wrapped ) {
                    // --- Word wrap, only print word
                    textToDraw = lWord.word;
                    textToDrawWidth = lWord.wordMetrics.width;
                } else {
                    textToDraw = lWord.text;
                    textToDrawWidth = lWord.width;
                }

                // --- Draw selection background if necessary

                if ( this.selection )
                {
                    // console.log( y, this.selectionStart.x, this.selectionStart.y, this.selectionEnd.x, this.selectionEnd.y );

                    if ( y >= this.selectionStart.y && y <= this.selectionEnd.y )
                    {
                        ctx.fillStyle = '#b2d0ee';

                        let drawWholeText = false;

                        if ( y > this.selectionStart.y && y < this.selectionEnd.y )
                        {
                            // --- This line is in the middle of the vertical selection somewhere, select everything
                            ctx.fillRect( startX + x, startY + y, textToDrawWidth, line.maxHeight );
                        } else
                        if ( y === this.selectionStart.y && y === this.selectionEnd.y )
                        {
                            // --- This line is the start and end line of the selection
                            let rx = startX + x, rw = textToDrawWidth;

                            if ( this.selectionStart.x > x ) {
                                let diff = x - this.selectionStart.x;
                                rx -= diff; rw += diff;
                            }

                            if ( this.selectionEnd.x <= rx + rw ) {
                                let diff = rx + rw - this.selectionEnd.x;
                                rw -= diff;
                            }

                            if ( rw > 1 ) ctx.fillRect( rx, startY + y, rw, line.maxHeight );
                        } else
                        if ( y === this.selectionStart.y )
                        {
                            // --- This line is the start line
                            let rx = startX + x, rw = textToDrawWidth;

                            if ( this.selectionStart.x > x ) {
                                let diff = x - this.selectionStart.x;
                                rx -= diff; rw += diff;
                            }

                            if ( rw > 1 ) ctx.fillRect( rx, startY + y, rw, line.maxHeight );
                        } else
                        if ( y === this.selectionEnd.y )
                        {
                            // --- This line is end line
                            let rx = startX + x, rw = textToDrawWidth;

                            if ( this.selectionEnd.x <= rx + rw ) {
                                let diff = rx + rw - this.selectionEnd.x;
                                rw -= diff;
                            }

                            if ( rw > 1 ) ctx.fillRect( rx, startY + y, rw, line.maxHeight );
                        }
                    }
                }

                // --- Draw the text

                ctx.fillStyle = 'black';
                ctx.fillText( textToDraw, screenX, screenY + line.maxAscent );
                x += textToDrawWidth; screenX += textToDrawWidth;
            }

            if ( l < this.lines.length - 1 ) {
                x = 0;
                y += line.maxHeight;

                screenX = startX;
                screenY += line.maxHeight;
            }
        }

        // --- Cursor / Blink State
        if ( !this.selection ) {
            if ( this.blinkState && this.cursorLocation ) {
                let height = this.defaultFont.size;

                if ( this.cursorLocation.line )
                    height = this.cursorLocation.line.maxAscent;// - this.cursorLocation.line.maxDescent;

                ctx.fillStyle = 'black';
                ctx.fillRect( startX + this.cursorLocation.x, startY + this.cursorLocation.y, 1, height );
            }

            this.updateBlinkState();
        }
    }
};

if ( typeof module !== 'undefined' && module.exports )
    module.exports = RichText;

