(function(window, undefined) {
var 
    // Sandboxing, because lets steal all of jQuery's ideas bceause why not
    document = window.document,
    navigator= window.navigator,

    // The CAD constructor/object.
    CAD = function(id) {
        // The object that we're drawing into
        this._jq_object = jQuery("#"+id);
        
        // The raphael paper to draw onto.
        this.paper = new Raphael(id, this._jq_object.width(), this._jq_object.height());

        // The events object is used when dispatching events for specific types of svg objects.
        // It's our way of dealing with the fact that Raphael doesn't have event delegation.
        this.events = {};
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
    mode: "",
    drawingMode: "",

    // Get the event handler for this CAD object,
    getHandler: function() {
        // We bind the current CAD object to a local variable to make it 
        // accessible in the handler.
        var localCAD = this;

        return function(event) {
            event.CAD = localCAD;
            // Let's get a list of all of the event handlers and execute them all.
            fns = (localCAD.events[event.type] === undefined || 
                    localCAD.events[event.type][localCAD.mode] === undefined) ? [] : 
                        localCAD.events[event.type][localCAD.mode];
            for (fn in fns) {
                // If any of our events want to stop immediately, do so.
                if (event.isImmediatePropagationStopped()) break;
                // Call the actual event handler.
                fn.call(this, event);
            }
        }
    },

    // Create our own bind function for switching delegation on different modes.
    bind: function(mode, event, fn) {
        if (this.events[event] === undefined) {
            // Create the event object and bind ourselves to handle it.
            this.events[event] = {};
            // We nind ourselves in the CAD namespace, to make removing things easier if necessary
            this._jq_object.bind(event+".CAD", this.getHandler());
        }
        if (this.events[event][mode] === undefined) {
            this.events[event][mode] = [];
        }
        if (!(this.events[event][mode].indexOf(fn) > 0)) {
            this.events[event][mode].push(fn);
        }
    }
}

// Put CAD into the global namespace
window.CAD = CAD;

})(window);

$(function() {
    var target_div = $("#main-drawing-area");
    var paper = new Raphael("main-drawing-area", target_div.width(), target_div.height());
    var now_drawing = false;
    var current_line = false;
    var current_line_path = [];

    function add_point(position) {
        var c = paper.circle(position.x, position.y, 3);
        $(c.node).removeAttr('fill').removeAttr('stroke').attr("class","point").attr("data-r-id", c.id);
    }

    function start_line(position) {
        now_drawing = true;
        current_line_path = ["M" + position.x + "," + position.y, ""];
        current_line = paper.path(current_line_path.join("")).toBack();
        $(current_line.node).removeAttr('stroke').attr("class","line").attr("data-r-id", current_line.id);
    }

    function point_click(event) {
        var elm = $(this);
        var position = {
            x: elm.attr("cx"),
            y: elm.attr("cy")
        };

        if (!now_drawing) {
            start_line.call(elm.parents(".drawing-area")[0], position);
        }
        else {
            now_drawing = false;
            current_line_path[1] = "L"+position.x+","+position.y;
            current_line.attr("path", current_line_path.join(""));
        }
        event.stopImmediatePropagation();
    };

    target_div.on("click.blank", function(event) {
        if ($(event.target).attr("class") == 'point') {
            return point_click.call(event.target, event);
        }
        var offset = $(this).offset();
        var position = {
            x: (event.pageX - offset.left),
            y: (event.pageY - offset.top)
        };

        if (!now_drawing) {
            start_line.call(this, position);
        }
        else {
            now_drawing = false;
            current_line.toFront();
        }
        add_point.call(this, position);
    });

    target_div.mousemove(function(event){
        if (!now_drawing) return;
        var offset = $(this).offset();
        var position = {
            x: (event.pageX - offset.left),
            y: (event.pageY - offset.top)
        };
        current_line_path[1] = "L"+position.x+","+position.y;
        current_line.attr("path", current_line_path.join(""));
    });

});