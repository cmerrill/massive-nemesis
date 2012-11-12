(function(window, $, undefined) {
var 
    // Sandboxing, because lets steal all of jQuery's ideas bceause why not
    document = window.document,
    navigator= window.navigator,

    // The CAD constructor/object.
    CAD = function(id) {
        // The object that we're drawing into
        this._jqObject = $("#"+id);
        
        // The raphael paper to draw onto.
        this.paper = new Raphael(id, this._jqObject.width(), this._jqObject.height());

        // The events object is used when dispatching events for specific types of svg objects.
        // It's our way of dealing with the fact that Raphael doesn't have event delegation.
        this.events = {};

        // This is a object that represents the active element;  either the one that is selected,
        // the one that is being moved, or the one that is controlling the creation prameters.
        this.activeElement = {
            type: "none",
        };

        // This stores Raphael sets of elements of each type (lines, points, arcs).
        this.elements = {};
    };

// We need to make sure that Arrays have an indexOf method. *sigh*, IE.
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
        "use strict";
        if (this == null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 1) {
            n = Number(arguments[1]);
            if (n != n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n != 0 && n != Infinity && n != -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    }
}

// Lets setup the CAD prototype.
CAD.prototype = {
    constructor: CAD,
    mode: "none",
    drawingStatus: "none",

    // Create our own bind function for switching delegation on different modes.
    bind: function(event, fn, mode) {
        if (this.events[event] === undefined) {
            // Create the event object and bind ourselves to handle it.
            this.events[event] = {};
            // We bind ourselves in the CAD namespace, to make removing things easier if necessary
            this._jqObject.bind(event+".CAD", this.getHandler());
        }
        if (this.events[event][mode] === undefined) {
            this.events[event][mode] = [];
        }
        if (!(this.events[event][mode].indexOf(fn) > 0)) {
            this.events[event][mode].push(fn);
        }

        // Allow for chaining
        return this;
    },

    // Get the event handler for this CAD object,
    getHandler: function() {
        // We bind the current CAD object to a local variable to make it 
        // accessible in the handler.
        var localCAD = this;

        return function(event) {
            // This might break everything jQuery... I hope not.
            event.CAD = localCAD;

            // Let's get a list of all of the event handlers for this event and mode.
            fns = ((localCAD.events[event.type] === undefined || 
                        localCAD.events[event.type][localCAD.mode] === undefined) ? [] : 
                            localCAD.events[event.type][localCAD.mode]);

            // These handlers will be executed for this event, no matter the mode.
            always_fns = ((localCAD.events[event.type] === undefined || 
                                localCAD.events[event.type][undefined] === undefined) ? [] : 
                                    localCAD.events[event.type][undefined]);

            var allF = always_fns.concat(fns);

            for (fn in allF) {
                // If any of our events want to stop immediately, do so.
                if (event.isImmediatePropagationStopped()) break;
                // Call the actual event handler.
                allF[fn].call(this, event);
            }
        }
    },

    changeMode: function(mode) {
        this.mode = mode;
        $("#mode-span").text(mode);
    },

    changeDrawingStatus: function(status) {
        this.drawingStatus = status;
    },

    // This puts a point down at the given position.
    addPoint: function (x,y) {
        var c = this.paper.circle(x, y, 3);
        $(c.node).removeAttr('fill').removeAttr('stroke').attr("class","point").attr("data-r-id", c.id);
        
        if (this.elements.points === undefined) this.elements.points = [];
        this.elements.points.push(c);

        // FIXME: Do I want to use this for chaining?
        return c;
    }
}

// Put CAD into the global namespace
window.CAD = CAD;

})(window, jQuery);

$(function() {
    var target_div = $("#main-drawing-area");
    var cad = new CAD("main-drawing-area");

    // function start_line(position) {
    //     now_drawing = true;
    //     current_line_path = ["M" + position.x + "," + position.y, ""];
    //     current_line = paper.path(current_line_path.join("")).toBack();
    //     $(current_line.node).removeAttr('stroke').attr("class","line").attr("data-r-id", current_line.id);
    // }

    cad.bind("click", function(event) {
        //FIXME: Deal with selection here.
        if ($(event.target).attr("class") == 'point') {
            return;
        }

        var offset = $(this).offset();
        event.CAD.addPoint((event.pageX - offset.left), (event.pageY - offset.top));
    }, "draw.point");

    cad.changeMode("draw.point");

    // target_div.mousemove(function(event){
    //     if (!now_drawing) return;
    //     var offset = $(this).offset();
    //     var position = {
    //         x: (event.pageX - offset.left),
    //         y: (event.pageY - offset.top)
    //     };
    //     current_line_path[1] = "L"+position.x+","+position.y;
    //     current_line.attr("path", current_line_path.join(""));
    // });

});