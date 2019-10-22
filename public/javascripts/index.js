let root = {"children": [{"name": "flare", "size": 10, "growth": 2},
            {"name": "test", "size": 15, "growth": 1}]};
let index = 0,
    format = d3.format(",d");

const width = 600,
      height = 400;

let diameter = 300;

// let svg = { min: 10, max: 80 },
//       circles = { min: 10, max: 80 },
//       circleSize = { min: 10, max: 80 };

var color = d3.scale.ordinal()
    .domain(["Sqoop", "Pig", "Apache", "a", "b", "c", "d", "e", "f", "g"])
    .range(["steelblue", "pink", "lightgreen", "violet", "orangered", "green", "orange", "skyblue", "gray", "aqua"]);

    var bubble = d3.layout.pack()
        .sort(null)
        .size([height, height])
        .padding(5);

let svg = d3.select("#bubble-chart")
  .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "bubble");

// let nodes = d3.hierarchy(root)
//     .sum(function(d) { return d.size; });

var node = svg.selectAll(".node")
    .data(bubble.nodes(classes(root))
    .filter(function (d) {
    return !d.children;
}))
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", function (d) {
    return "translate(" + d.x + "," + d.y + ")";
});

node.append("title")
    .text(function (d) {
    return d.className + ": " + format(d.value);
});

node.append("circle")
    .attr("r", function (d) {
    return d.r;
})
    .style("fill", function (d, i) {
    return color(i);
});

node.append("text")
  .attr("dy", ".3px")
  .style("text-anchor", "middle")
  .text(function(d) {
    return d.className;
  });

function classes(root) {
    var classes = [];

    function recurse(name, node) {
        if (node.children) node.children.forEach(function (child) {
            recurse(node.name, child);
        });
        else classes.push({
            packageName: name,
            className: node.name,
            value: node.size
        });
    }

    recurse(null, root);
    return {
        children: classes
    };
}

function updateBubbles(root) {
    var node = svg.selectAll(".node")
        .data(
            bubble.nodes(classes(root)).filter(function (d){return !d.children;}),
            function(d) {return d.className} // key data based on className to keep object constancy
        );

    // capture the enter selection
    var nodeEnter = node.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    // re-use enter selection for circles
    nodeEnter
        .append("circle")
        .attr("r", function (d) {return d.r;})
        .style("fill", function (d, i) {return color(i);})

    // re-use enter selection for titles
    nodeEnter
        .append("title")
        .text(function (d) {
            return d.className + ": " + format(d.value);
        });

    node.select("circle")
        .transition().duration(1000)
        .attr("r", function (d) {
            return d.r;
        })
        .style("fill", function (d, i) {
            return color(i);
        });

    node.append("text")
      .attr("dy", ".3px")
      .style("text-anchor", "middle")
      .text(function(d) {
        return d.className;
      });

    node.transition().attr("class", "node")
        .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });

    node.exit().remove();

    // Returns a flattened hierarchy containing all leaf nodes under the root.
    function classes(root) {
        var classes = [];

        function recurse(name, node) {
            if (node.children) node.children.forEach(function (child) {
                recurse(node.name, child);
            });
            else classes.push({
                packageName: name,
                className: node.name,
                value: node.size
            });
        }

        recurse(null, root);
        return {
            children: classes
        };
    }

    //d3.select(self.frameElement).style("height", diameter + "px");
}

function createCircle() {
  let name = document.getElementById("inp_name").value;
  let size = document.getElementById("inp_number").value;
  let growth = document.getElementById("inp_growth").value;

  document.getElementById("inp_name").value = "";
  document.getElementById("inp_number").value = 10;
  document.getElementById("inp_growth").value = 1;

  root.children.push({"name": name, "size": Number(size), "growth": Number(growth)});

  updateBubbles(root);
}

let counter;
counter = setInterval(function() {
  let length = root.children.length;
  for (let i = 0; i < length; i++) {
    root.children[i].size += root.children[i].growth;
  }
  updateBubbles(root);
}, 100);
