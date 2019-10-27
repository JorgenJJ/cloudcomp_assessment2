let root = {"children": []};
let index = 0,  // Used to select specific bubbles from the charts
    totalTweets = 50; // The amount of tweets fetched using the API

// Size of the bubble chart
const width = 600,
      height = 400;

let relevancyTotal = 0; // Used to calculate the size of bubbles comapred to all bubbles

// Used by D3, template for bubbles
var bubble = d3.layout.pack()
    .sort(null)
    .size([height, height])
    .padding(5);

// Bubble chart object
let svg = d3.select("#bubble-chart")
  .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("class", "bubble");

// Updates or sets the size, name and colour of all bubbles
function updateBubbles(root) {
  if (root.children.length > 1) { // If there are objects in the array
    for(let i = 0; i < root.children.length; i++) { // Loop through all objects
      root.children[i].size = Math.round((root.children[i].relevancy / relevancyTotal) * 10000) / 100;  // Calculate size with 2 decimals
      console.log(root.children[i].name + ": " + root.children[i].score);
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
    .attr("r", function (d) {
      if (d.r < 10) { // If radius is smalled than 10
        return 10;  // Set radius to 10
      }
      else return d.r;
    })
    .attr("id", function (d) {return "circle_" + d.index})
    .attr("onclick", function (d) {return "selectCircle(" + d.index + ")"})
    .style("fill", function (d, i) {
      console.log(d.className + ": " + d.score);
      if (d.score < 0) {  // If score is negative
        let n = 255 + ((d.score / 50) * 255);
        if (n > 200) n = 200; // Prevent bubble from turning white
        return "rgb(255, " + n + ", " + n + ")";
      }
      else {  // If score is positive
        let n = 255 - ((d.score / 50) * 255);
        if (n > 200) n = 200; // Prevent bubble from turning white
        return "rgb(" + n + ", 255, " + n + ")";
      }
    })

  // re-use enter selection for titles
  nodeEnter
    .append("title")
    .text(function (d) {
      return d.className;
  });

  // selection for circless
  node.select("circle")
    .transition().duration(1000)
    .attr("r", function (d) {
      if (d.r < 10) { // If radius is less than 10
        return 10;  // Set radius to 10
      }
      else return d.r;
  });

  // re-use enter selection for text
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
}

// Creates a single bubble
// *NO LONGER IN USE*
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

// Create a single circle
function createCircle(name, array, size, score, relevancy, seconds) {
  root.children.push({"index": index++, "name": name, "array": array, "size": Number(size), "score": Number(score), "relevancy": Number(relevancy), "seconds": Number(seconds) });
  document.getElementById("inp_search").value = ""; // Clear input field
  updateBubbles(root);
}

// Select a single circle
function selectCircle(circle) {
  let body = document.getElementById("information");
  if (body.childNodes.length != 0) body.removeChild(body.childNodes[0]);

  let circleElement = document.getElementById("circle_" + circle);
  let circleName = circleElement.nextSibling.nextSibling.innerHTML;

  let c;
  for (let i = 0; i < root.children.length; i++) {  // Loop through all objects in the array
    if (root.children[i].name == circleName) c = root.children[i]; // Store the one matching the name from the circle clicked on
  }

  let div = document.createElement("div");
  div.setAttribute("id", "div_information");

  let title = document.createElement("h1");
  title.innerHTML = circleName;

  let pm = (Math.round(1 / (c.seconds / totalTweets) * 100) / 100); // Calculate tweets per minute
  let tpm = document.createElement("h3");
  if (c.seconds == 0) tpm.innerHTML = "More than " + totalTweets + " per second"; // If all tweets are posted the same second
  else if ( 1 / (c.seconds / totalTweets) > (1 / 60)) tpm.innerHTML = "Tweets per second: " + pm; // If tweets per second is a normal number
  else tpm.innerHTML = "Tweets per second: Less than one an minute";  // If tweets are infrequent

  let del;
  if (root.children.length > 1) { // Only add delete button if there are more than 1 circle
    del = document.createElement("input");
    del.setAttribute("id", "btn_deleteCircle");
    del.setAttribute("type", "button");
    del.setAttribute("value", "Remove circle");
    del.setAttribute("onclick", "deleteCircle(" + circle + ")");
  }

  let tweets = document.createElement("div");
  tweets.setAttribute("class", "div_tweet_list");

  // Creating the tweet list
  for (let j = 0; j < root.children.length; j++) {  // Loop through all circle objects
    if (root.children[j].index == circle) { // If the correct object is selected
      for (let i = 0; i < root.children[j].array.length; i++) { // Loop through all tweets
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
  if (root.children.length > 1) div.append(del);  // Only append delete button if more than 1 bubble
  div.append(tweets);
  document.getElementById("information").append(div);
}

// Delete a single bubble
function deleteCircle(circle) {
  let circleElement = document.getElementById("circle_" + circle);
  let circleName = circleElement.nextSibling.nextSibling.innerHTML;

  let c;
  for (let i = 0; i < root.children.length; i++) {  // Loop though all objects in the array
    if (root.children[i].name == circleName) c = root.children[i];  // If correct object
  }

  let body = document.getElementById("information");
  if (body.childNodes.length != 0) body.removeChild(body.childNodes[0]);  // If information is displayed, remove it
  for (let i = 0; i < root.children.length; i++) {  // Loop through all objects in the array
    if (root.children[i].index == circle) root.children.splice(i, 1); // Remove the object that is deleted
  }

  // Send a delete request to the server
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
  updateBubbles(root);
}

// Request a new bubble based on input
function sendRequest() {
  if (document.getElementById("inp_search").value != "") {
    $.ajax({
      url: '/api/twitter',
      method: 'post',
      data: { query: document.getElementById("inp_search").value }
    }).done(function(res) {
      if (res.success) {  // If bubble is received
        console.log("AJAX: SUCCESS");
        relevancyTotal += res.data.relevancy; // Add its relevancy to the total relevancy
        createCircle(res.data.query, res.data.array, 1, res.data.score, res.data.relevancy, res.data.seconds);  // Add the bubble
      }
      else {
        console.log("AJAX: ERROR");
      }
    });
  }
}

// *NOT IN USE*
function getAllCircles() {
  $.ajax({
    url: "/api/twitterAll",
    method: "get"
  }).done(function(res) {
    if (res.success) {  // If all bubbles are received
      console.log("AJAX: SUCCESS");
      for (let i = 0; i < res.data.length; i++) { // Loop through all received bubbles
        if (res.source == "REDIS") {  // If collected from Redis cache
          let resultJSON = JSON.parse(res.data[i].data);
          let name = res.data[i].id.split(":"); // Retrieve the name of the bubble
          relevancyTotal += resultJSON.relevancy; // Add its relevancy to the total relevancy
          createCircle(name[1], resultJSON.tweetArray, 1, resultJSON.score, resultJSON.relevancy, resultJSON.seconds);
        }
        else if (res.source == "S3") {  // If collected from S3 Store
          let name = res.data[i].id.split("-"); // Retrieve the name of the bubble
          relevancyTotal += res.data[i].data.relevancy; // Add its relevancy to the total relevancy
          createCircle(name[1], res.data[i].data.tweetArray, 1, res.data[i].data.score, res.data[i].data.relevancy, res.data[i].data.seconds);
        }
      }
    }
    else {
      console.log("AJAX: ERROR");
    }
  });
}

// getAllCircles();

// let counter;
// counter = setInterval(function() {
//   let length = root.children.length;
//   for (let i = 0; i < length; i++) {
//     root.children[i].size += root.children[i].growth;
//   }
//   updateBubbles(root);
// }, 100);
