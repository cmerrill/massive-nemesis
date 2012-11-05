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