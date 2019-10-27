let root = {"children": []};
let index = 0,
    format = d3.format(",d"),
    totalTweets = 15;

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
      console.log(root.children[i].name + ": " + root.children[i].score);
      //console.log(root.children[i].name + ": " + Math.round((root.children[i].relevancy / relevancyTotal) * 10000) / 100 + "%");


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
    .attr("id", function (d) {return "circle_" + d.index})
    .attr("onclick", function (d) {return "selectCircle(" + d.index + ")"})
    .style("fill", function (d, i) {
      console.log(d.className + ": " + d.score);
      if (d.score < 0) {
        let n = 255 + ((d.score / 50) * 255);
        if (n > 200) n = 200;
        return "rgb(255, " + n + ", " + n + ")";
      }
      else {
        let n = 255 - ((d.score / 50) * 255);
        if (n > 200) n = 200;
        return "rgb(" + n + ", 255, " + n + ")";
      }
    })

  // re-use enter selection for titles
  nodeEnter
    .append("title")
    .text(function (d) {
      return d.className;
  });

  node.select("circle")
    .transition().duration(1000)
    .attr("r", function (d) {
      if (d.r < 10) {
        return 10;
      }
      else return d.r;
  });

  nodeEnter
    .append("text")
    .attr("dy", ".3px")
    .attr("onclick", function (d) {return "selectCircle(" + d.index + ")"})
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
          value: node.size,
          index: node.index,
          score: node.score
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

function createCircle(name, array, size, score, relevancy, seconds) {
  root.children.push({"index": index++, "name": name, "array": array, "size": Number(size), "score": Number(score), "relevancy": Number(relevancy), "seconds": Number(seconds) });
  document.getElementById("inp_search").value = "";
  updateBubbles(root);
}

function selectCircle(circle) {
  let body = document.getElementById("information");
  if (body.childNodes.length != 0) body.removeChild(body.childNodes[0]);

  let circleElement = document.getElementById("circle_" + circle);
  let circleName = circleElement.nextSibling.nextSibling.innerHTML;

  let c;
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].name == circleName) c = root.children[i];
  }

  let div = document.createElement("div");
  div.setAttribute("id", "div_information");

  let title = document.createElement("h1");
  title.innerHTML = circleName;

  let pm = (Math.round(1 / (c.seconds / totalTweets) * 100) / 100);
  let tpm = document.createElement("h3");
  if ( 1 / (c.seconds / totalTweets) > (1 / 60)) tpm.innerHTML = "Tweets per second: " + pm;
  else tpm.innerHTML = "Tweets per second: Less than one an minute";

  //tpm.innerHTML = "Time between first and last tweet: " + Math.floor(c.seconds / 60) + ":" + (c.seconds % 60);

  let del;
  if (root.children.length > 1) {
    del = document.createElement("input");
    del.setAttribute("id", "btn_deleteCircle");
    del.setAttribute("type", "button");
    del.setAttribute("value", "Remove circle");
    del.setAttribute("onclick", "deleteCircle(" + circle + ")");
  }

  let tweets = document.createElement("div");
  tweets.setAttribute("class", "div_tweet_list");

  for (let j = 0; j < root.children.length; j++) {
    if (root.children[j].index == circle) {
      for (let i = 0; i < root.children[j].array.length; i++) {
        let tweet = document.createElement("div");
        tweet.setAttribute("class", "div_tweet");

        // let img = document.createElement("img");
        // img.setAttribute("class", "profile_picture");
        // img.setAttribute("src", root.children[circle].array[i].userImage);

        let u = document.createElement("h3");
        u.setAttribute("class", "profile_name");
        u.innerHTML = root.children[j].array[i].userName;

        let d = document.createElement("p");
        d.setAttribute("class", "tweet_date");
        d.innerHTML = root.children[j].array[i].date;

        let t = document.createElement("p");
        t.setAttribute("class", "tweet_text");
        t.innerHTML = root.children[j].array[i].text;

        // tweet.append(img);
        tweet.append(u);
        tweet.append(d);
        tweet.append(t);
        tweets.append(tweet);
      }
    }
  }

  div.append(title);
  div.append(tpm);
  if (root.children.length > 1) div.append(del);
  div.append(tweets);
  document.getElementById("information").append(div);
}

function deleteCircle(circle) {
  let circleElement = document.getElementById("circle_" + circle);
  let circleName = circleElement.nextSibling.nextSibling.innerHTML;

  let c;
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].name == circleName) c = root.children[i];
  }

  let body = document.getElementById("information");
  if (body.childNodes.length != 0) body.removeChild(body.childNodes[0]);
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].index == circle) root.children.splice(i, 1);
  }

  $.ajax({
    url: '/api/delete',
    method: 'post',
    data: { query: "twitter:" + circleName }
  }).done(function(res) {
    if (res.success) {
      console.log("AJAX: SUCCESS");
    }
    else {
      console.log("AJAX: ERROR");
    }
  });
  // root.children.splice(circle, 1);
  updateBubbles(root);
}

function sendRequest() {
  if (document.getElementById("inp_search").value != "") {
    $.ajax({
      url: '/api/twitter',
      method: 'post',
      data: { query: document.getElementById("inp_search").value }
    }).done(function(res) {
      if (res.success) {
        console.log("AJAX: SUCCESS");
        relevancyTotal += res.data.relevancy;
        createCircle(res.data.query, res.data.array, 1, res.data.score, res.data.relevancy, res.data.seconds);
      }
      else {
        console.log("AJAX: ERROR");
      }
    });
  }
}

function getAllCircles() {
  $.ajax({
    url: "/api/twitterAll",
    method: "get"
  }).done(function(res) {
    if (res.success) {
      console.log("AJAX: SUCCESS");
      console.log(res.data);
      for (let i = 0; i < res.data.length; i++) {
        if (res.source == "REDIS") {
          let resultJSON = JSON.parse(res.data[i].data);
          let name = res.data[i].id.split(":");
          relevancyTotal += resultJSON.relevancy;
          createCircle(name[1], resultJSON.tweetArray, 1, resultJSON.score, resultJSON.relevancy, resultJSON.seconds);
        }
        else if (res.source == "S3") {
          let name = res.data[i].id.split("-");
          relevancyTotal += res.data[i].data.relevancy;
          createCircle(name[1], res.data[i].data.tweetArray, 1, res.data[i].data.score, res.data[i].data.relevancy, res.data[i].data.seconds);
        }
      }
    }
    else {
      console.log("AJAX: ERROR");
    }
  });
}

getAllCircles();

// let counter;
// counter = setInterval(function() {
//   let length = root.children.length;
//   for (let i = 0; i < length; i++) {
//     root.children[i].size += root.children[i].growth;
//   }
//   updateBubbles(root);
// }, 100);
