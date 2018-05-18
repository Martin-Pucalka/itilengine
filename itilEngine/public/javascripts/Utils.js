var Utils = Utils || {};

// Returns true if number is valid and in interval min - max, false otherwise
Utils.validateNumber = function (number, min, max) {
    if (!isNaN(parseFloat(number) && isFinite(number))) {
        if (number < min || number > max) {
            return false;
        }
    } else {
        return false;
    }
    return true;
}

// Pad number to two letters
Utils.pad2 = function (n) {
    return n > 9 ? "" + n : "0" + n;
}

// Format time in seconds to readable time format
Utils.getFormatedTime = function (timeInSeconds) {
    var timeInSecondsTrunc = Math.trunc(timeInSeconds);
    var duration = moment.duration(timeInSecondsTrunc, 'seconds');
    var formatted = duration.format("M [mon] d [days] h [hrs] m [min] s [sec]");
    return formatted;
}

// Get unique ID
Utils.uuidv4 = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

Utils.setGraphScrollable = function (container, g) {
    mxEvent.disableContextMenu(container);

    g.setPanning(true);

    /**
     * Specifies the size of the size for "tiles" to be used for a graph with
     * scrollbars but no visible background page. A good value is large
     * enough to reduce the number of repaints that is caused for auto-
     * translation, which depends on this value, and small enough to give
     * a small empty buffer around the graph. Default is 400x400.
     */
    g.scrollTileSize = new mxRectangle(0, 0, 400, 400);

    /**
     * Returns the padding for pages in page view with scrollbars.
     */
    g.getPagePadding = function () {
        return new mxPoint(Math.max(0, Math.round(g.container.offsetWidth - 34)),
            Math.max(0, Math.round(g.container.offsetHeight - 34)));
    };

    /**
     * Returns the size of the page format scaled with the page size.
     */
    g.getPageSize = function () {
        return (this.pageVisible) ? new mxRectangle(0, 0, this.pageFormat.width * this.pageScale,
            this.pageFormat.height * this.pageScale) : this.scrollTileSize;
    };

    /**
     * Returns a rectangle describing the position and count of the
     * background pages, where x and y are the position of the top,
     * left page and width and height are the vertical and horizontal
     * page count.
     */
    g.getPageLayout = function () {
        var size = (this.pageVisible) ? this.getPageSize() : this.scrollTileSize;
        var bounds = this.getGraphBounds();

        if (bounds.width == 0 || bounds.height == 0) {
            return new mxRectangle(0, 0, 1, 1);
        }
        else {
            // Computes untransformed graph bounds
            var x = Math.ceil(bounds.x / this.view.scale - this.view.translate.x);
            var y = Math.ceil(bounds.y / this.view.scale - this.view.translate.y);
            var w = Math.floor(bounds.width / this.view.scale);
            var h = Math.floor(bounds.height / this.view.scale);

            var x0 = Math.floor(x / size.width);
            var y0 = Math.floor(y / size.height);
            var w0 = Math.ceil((x + w) / size.width) - x0;
            var h0 = Math.ceil((y + h) / size.height) - y0;

            return new mxRectangle(x0, y0, w0, h0);
        }
    };

    // Fits the number of background pages to the graph
    g.view.getBackgroundPageBounds = function () {
        var layout = this.graph.getPageLayout();
        var page = this.graph.getPageSize();

        return new mxRectangle(this.scale * (this.translate.x + layout.x * page.width),
            this.scale * (this.translate.y + layout.y * page.height),
            this.scale * layout.width * page.width,
            this.scale * layout.height * page.height);
    };

    g.getPreferredPageSize = function (bounds, width, height) {
        var pages = this.getPageLayout();
        var size = this.getPageSize();

        return new mxRectangle(0, 0, pages.width * size.width, pages.height * size.height);
    };

    /**
     * Guesses autoTranslate to avoid another repaint (see below).
     * Works if only the scale of the graph changes or if pages
     * are visible and the visible pages do not change.
     */
    var graphViewValidate = g.view.validate;
    g.view.validate = function () {
        if (this.graph.container != null && mxUtils.hasScrollbars(this.graph.container)) {
            var pad = this.graph.getPagePadding();
            var size = this.graph.getPageSize();

            // Updating scrollbars here causes flickering in quirks and is not needed
            // if zoom method is always used to set the current scale on the graph.
            var tx = this.translate.x;
            var ty = this.translate.y;
            this.translate.x = pad.x / this.scale - (this.x0 || 0) * size.width;
            this.translate.y = pad.y / this.scale - (this.y0 || 0) * size.height;
        }

        graphViewValidate.apply(this, arguments);
    };

    var graphSizeDidChange = g.sizeDidChange;
    g.sizeDidChange = function () {
        if (this.container != null && mxUtils.hasScrollbars(this.container)) {
            var pages = this.getPageLayout();
            var pad = this.getPagePadding();
            var size = this.getPageSize();

            // Updates the minimum graph size
            var minw = Math.ceil(2 * pad.x / this.view.scale + pages.width * size.width);
            var minh = Math.ceil(2 * pad.y / this.view.scale + pages.height * size.height);

            var min = g.minimumGraphSize;

            // LATER: Fix flicker of scrollbar size in IE quirks mode
            // after delayed call in window.resize event handler
            if (min == null || min.width != minw || min.height != minh) {
                g.minimumGraphSize = new mxRectangle(0, 0, minw, minh);
            }

            // Updates auto-translate to include padding and graph size
            var dx = pad.x / this.view.scale - pages.x * size.width;
            var dy = pad.y / this.view.scale - pages.y * size.height;

            if (!this.autoTranslate && (this.view.translate.x != dx || this.view.translate.y != dy)) {
                this.autoTranslate = true;
                this.view.x0 = pages.x;
                this.view.y0 = pages.y;

                // NOTE: THIS INVOKES THIS METHOD AGAIN. UNFORTUNATELY THERE IS NO WAY AROUND THIS SINCE THE
                // BOUNDS ARE KNOWN AFTER THE VALIDATION AND SETTING THE TRANSLATE TRIGGERS A REVALIDATION.
                // SHOULD MOVE TRANSLATE/SCALE TO VIEW.
                var tx = g.view.translate.x;
                var ty = g.view.translate.y;

                g.view.setTranslate(dx, dy);
                g.container.scrollLeft += (dx - tx) * g.view.scale;
                g.container.scrollTop += (dy - ty) * g.view.scale;

                this.autoTranslate = false;
                return;
            }

            graphSizeDidChange.apply(this, arguments);
        }
    };

    window.setTimeout(function () {
        var bounds = g.getGraphBounds();
        var width = Math.max(bounds.width, g.scrollTileSize.width * g.view.scale);
        var height = Math.max(bounds.height, g.scrollTileSize.height * g.view.scale);
        g.container.scrollTop = Math.floor(Math.max(0, bounds.y - Math.max(20, (g.container.clientHeight - height) / 4)));
        g.container.scrollLeft = Math.floor(Math.max(0, bounds.x - Math.max(0, (g.container.clientWidth - width) / 2)));
    }, 0);
}

// Replace all occurents if "find" by "replace" in "str" and return result
Utils.replaceAll = function (str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

/* SETTINGS FOR DRAG N DROP */

// Varialbe for keeping dragged value
Utils.draggedValue;

Utils.allowDrop = function (event) {
    event.preventDefault();
}

drag = function (event) {
    Utils.draggedValue = event.target.innerHTML;
    event.dataTransfer.setData("Text", event.target.innerHTML);
}

Utils.drop = function (event) {
    event.preventDefault();
    event.target.value += "'" + Utils.draggedValue + "'"; // wrap dropped value with "'"
}