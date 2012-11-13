(function(window, $, Raphael, undefined) {
"use strict";
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
            type: "none"
        };

        // This stores Raphael sets of elements of each type (lines, points, arcs).
        this.elements = {};
    };

// We need to make sure that Arrays have an indexOf method. *sigh*, IE.
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
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
    };
}

// Lets setup the CAD prototype.
CAD.prototype = {
    constructor: CAD,
    mode: "select",
    drawingStatus: "none",

    // Create our own bind function for switching delegation on different modes.
    // FIXME: make this able to bind multiple things at once?
    bind: function(event, fn, mode) {
        if (this.events[event] === undefined) {
            // Create the event object and bind ourselves to handle it.
            this.events[event] = {};
            // key events require element focus, so we have to do some sort of hack :/
            if (event === "keyup" || event === "keydown" || event === "keypress") {
                $(document).bind(event+".CAD", this.getHandler());
            }
            else {
                this._jqObject.bind(event+".CAD", this.getHandler());
            }
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

    // Trigger an event on this object.
    trigger: function(event) {
        this._jqObject.trigger(event+".CAD");
    },

    // Get the event handler for this CAD object,
    getHandler: function() {
        // We bind the current CAD object to a local variable to make it 
        // accessible in the handler.
        var localCAD = this;

        // FIXME: Add some logic to add canvasX and canvasY to the event?

        return function(event) {
            // This might break everything jQuery... I hope not.
            event.CAD = localCAD;

            // Let's get a list of all of the event handlers for this event and mode.
            var fns = ((localCAD.events[event.type] === undefined || 
                        localCAD.events[event.type][localCAD.mode] === undefined) ? [] : 
                            localCAD.events[event.type][localCAD.mode]);

            // These handlers will be executed for this event, no matter the mode.
            var always_fns = ((localCAD.events[event.type] === undefined || 
                                localCAD.events[event.type][undefined] === undefined) ? [] : 
                                    localCAD.events[event.type][undefined]);

            var allF = always_fns.concat(fns);

            // FIXME: Debug
            if (allF.length) console.log(event.type, localCAD.mode);

            var fn;
            for (fn in allF) {
                // If any of our events want to stop immediately, do so.
                if (event.isImmediatePropagationStopped()) break;
                // Call the actual event handler, normalizing it to refer to
                // the containing div
                allF[fn].call(localCAD._jqObject[0], event);
            }
        };
    },

    // Return the type of an element
    elementType: function(element) {
        var cls = $(element).attr("class");
        if (cls === undefined) {
            return undefined;
        }

        return cls.split("-")[0];
    },

    // Change the global mode, and send the necessary signals
    changeMode: function(mode) {
        this.trigger("leaveMode");
        this.mode = mode;
        this.trigger("enterMode");
    },

    // Change the drawing status, and send the necessary signals
    changeDrawingStatus: function(status) {
        this.trigger("leaveDrawingStatus");
        this.drawingStatus = status;
        this.trigger("enterDrawingStatus");
    },

    // Generic remove element
    removeElement: function(elm) {
        var type = this.elementType(elm);

        if (this.elements[type] === undefined) {
            elm.remove();
            return false;
        }

        var index = this.elements[type].items.indexOf(elm);
        if (index < 0) {
            elm.remove();
            return false;
        }

        this.elements[type].items.splice(index, 1);
        elm.remove();
        return 1;
    },

    // This puts a point down at the given position.
    addPoint: function (x,y) {
        var c = this.paper.circle(x, y, 3);
        $(c.node).removeAttr('fill').removeAttr('stroke').attr("class","point").attr("data-r-id", c.id);
        
        if (this.elements.point === undefined) this.elements.point = this.paper.set();
        this.elements.point.push(c);

        // FIXME: Do I want to use this for chaining? If so, change to returning `this`.
        return c;
    },

    // This creates a line from point1 to point2
    addLine: function (point1, point2) {
        // We shouldn't create lines that have no length.
        if (point1 === point2) {
            return undefined;
        }

        var start = point1.attr(["cx", "cy"]);
        var end = point2.attr(["cx", "cy"]);

        var line = this.paper.path("M"+start.cx+","+start.cy+"L"+end.cx+","+end.cy).toBack();
        $(line.node).removeAttr('stroke').attr("class","line");
        $(line.node).attr("data-r-id", line.id);

        if (this.elements.line === undefined) this.elements.line = this.paper.set();
        this.elements.line.push(line);

        // FIXME: Do I want to use this for chaining? If so, change to returning `this`.
        return line;
    },

    // Take in a DOM Element, return the corresponding Raphael Element
    getElement: function (element) {
        return this.paper.getById($(element).attr("data-r-id"));
    }
}

// Put CAD into the global namespace
window.CAD = CAD;

})(window, jQuery, Raphael);


// LETS JUST MAKE THIS GLOBAL FOR NOW
// FIXME: Maybe make this not global?
var cad, target_div;

$(function() {
    target_div = $("#main-drawing-area");
    cad = new CAD("main-drawing-area");

    // function start_line(position) {
    //     now_drawing = true;
    //     current_line_path = ["M" + position.x + "," + position.y, ""];
    //     current_line = paper.path(current_line_path.join("")).toBack();
    //     $(current_line.node).removeAttr('stroke').attr("class","line").attr("data-r-id", current_line.id);
    // }

    cad.bind("enterMode", function(event) {
        $("#mode-span").text(event.CAD.mode);
    });

    cad.bind("enterDrawingStatus", function(event) {
        $("#draw-span").text(event.CAD.drawingStatus);
    });


    // Setup things for the draw.point mode
    cad.bind(
        "click", function(event) {
            //FIXME: Deal with selection here.
            if (event.CAD.elementType(event.target) === 'point') {
                return;
            }

            var offset = $(this).offset();
            event.CAD.addPoint((event.pageX - offset.left), (event.pageY - offset.top));
        }, "draw.point"
    ).bind(
        "mousemove", function(event) {
            var c = event.CAD;
            var offset = $(this).offset();
            
            if (c.activeElement.type != "point") {
                c.activeElement.type = "point";
                c.activeElement.target = c.paper.circle(0, 0, 3);
                $(c.activeElement.target.node).removeAttr('fill').removeAttr('stroke');
                $(c.activeElement.target.node).attr("class","point-drag").attr("data-r-id", c.id);
            }

            c.activeElement.target.attr({
                cx: (event.pageX - offset.left),
                cy: (event.pageY - offset.top)
            });
        },
        "draw.point"
    ).bind(
        "mouseleave", function(event) {
            var c = event.CAD;
            
            if (c.activeElement.type === "point") {
                c.activeElement.type = "none";
                c.activeElement.target.remove();
                delete c.activeElement.target;
            }
        },
        "draw.point"
    ).bind(
        "leaveMode", function(event) {
            var c = event.CAD;
            
            if (c.activeElement.type === "point") {
                c.activeElement.type = "none";
                c.activeElement.target.remove();
                delete c.activeElement.target;
            }
        },
        "draw.point"
    );


    // Let's setup things for the draw.line mode
    cad.bind(
        "click", function(event) {
            var c = event.CAD;
            //FIXME: Deal with element selection?

            var offset = $(this).offset();
            var x = (event.pageX - offset.left);
            var y = (event.pageY - offset.top);

            var target = event.target;

            // If we are placing our second point
            if (c.drawingStatus.split(".")[0] === "drawing") {
                c.changeDrawingStatus("none");

                if (c.elementType(target) === 'point') {
                    c.activeElement.end = c.getElement(target);
                } else {
                    c.activeElement.end = c.addPoint(x, y);
                }

                c.activeElement.line.remove();
                c.addLine(c.activeElement.start, c.activeElement.end);
                
                // Don't chain if we end on an already existing point.
                if (c.elementType(target) === 'point') return;

                // This is for chaining the drawing of lines.
                target = c.activeElement.end.node;
            }
            // Time to start a new line! :D
            c.activeElement.type = "line";

            if (c.elementType(target) === 'point') {
                c.changeDrawingStatus("drawing.connected");
                c.activeElement.start = c.getElement(target);
            } else {
                c.changeDrawingStatus("drawing");
                c.activeElement.start = c.addPoint(x,y);
            }

            c.activeElement.line = c.paper.path("M"+x+","+y).toBack();
            $(c.activeElement.line.node).removeAttr('stroke').attr("class","line-drag");
            $(c.activeElement.line.node).attr("data-r-id", c.activeElement.line.id);
        }, "draw.line"
    ).bind(
    // FIXME: Consider throwing `move-target` events instead of repeating this code per-mode.
        "mousemove", function(event) {
            var c = event.CAD;

            if (c.drawingStatus.split(".")[0] === "drawing") {
                var offset = $(this).offset();
                var x = (event.pageX - offset.left);
                var y = (event.pageY - offset.top);
                var start = c.activeElement.start.attr(["cx", "cy"]);

                c.activeElement.line.attr({
                    path: "M"+start.cx+","+start.cy+"L"+x+","+y
                });
            }
        },
        "draw.line"
    ).bind(
        "leaveMode", function(event) {
            var c = event.CAD;
            if (c.activeElement.type === "line") {
                c.activeElement.type = "none";
                if (c.drawingStatus === "drawing") {
                    c.activeElement.start.remove();
                }
                c.activeElement.line.remove();
                delete c.activeElement.line;
                delete c.activeElement.start;
                delete c.activeElement.end;
            }
        },
        "draw.line"
    );


    // We should always reset the drawing status when changing modes.
    cad.bind("leaveMode", function(event) {
        event.CAD.changeDrawingStatus("none");
    });


    // The escape key should always send you to mode "select"
    cad.bind(
        "keydown", function(event) {
            // If it's the escape key, go to mode "select"
            if (event.which === 27) {
                event.CAD.changeMode("select");
            }

            console.log(event.CAD.activeElement);
        });


    // Let's get started.
    cad.changeDrawingStatus("none");
    cad.changeMode("select");

});