let root = {"children": []};
let index = 0,
    format = d3.format(",d");

const width = 600,
      height = 400;

let diameter = 300;
let relevancyTotal = 0;

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

function updateBubbles(root) {
  if (root.children.length > 1) {
    for(let i = 0; i < root.children.length; i++) {
      root.children[i].size = Math.round((root.children[i].relevancy / relevancyTotal) * 10000) / 100;

      console.log(root.children[i].name + ": " + Math.round((root.children[i].relevancy / relevancyTotal) * 10000) / 100 + "%");


    }
  }

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
      return d.className + ": " + d.value;
  });

  node.select("circle")
    .transition().duration(1000)
    .attr("r", function (d) {
      if (d.r < 10) {
        return 10;
      }
      else return d.r;
  })
    .style("fill", function (d, i) {
      return color(i);
  });

  nodeEnter
    .append("text")
    .attr("dy", ".3px")
    .style("text-anchor", "middle")
    .text(function(d) {
      return d.className;
  });

  console.log(node);

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

function createCircle(name, size, relevancy) {
  root.children.push({"name": name, "size": Number(size), "growth": 0, "relevancy": Number(relevancy) });
  document.getElementById("inp_search").value = "";
  updateBubbles(root);
}

function sendRequest() {
  $.ajax({
    url: '/api/twitter',
    method: 'post',
    data: { query: document.getElementById("inp_search").value }
  }).done(function(res) {
    if (res.success) {
        console.log("AJAX: SUCCESS");
        relevancyTotal += res.data.relevancy;
        createCircle(res.data.query, 1, res.data.relevancy);
    }
    else {
        console.log("AJAX: ERROR");
      }
  });
}

// let counter;
// counter = setInterval(function() {
//   let length = root.children.length;
//   for (let i = 0; i < length; i++) {
//     root.children[i].size += root.children[i].growth;
//   }
//   updateBubbles(root);
// }, 100);
