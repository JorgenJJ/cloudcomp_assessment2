const express = require('express');
const responseTime = require('response-time')
const fs = require('fs');
const axios = require('axios');
const logger = require('morgan');
const router = express.Router();
var Twitter = require('twitter');
var Sentiment = require('sentiment');
var d3 = require("d3");
var bodyParser = require('body-parser');
const helmet = require('helmet');
const redis = require('redis');
const app = express();
const AWS = require('aws-sdk');


app.use(bodyParser.urlencoded({ extended: false }))
const hostname = '127.0.0.1';
const port = 3000;

app.use(helmet());
app.use("/public", express.static(__dirname + "/public"));

var twitter = new Twitter({
    consumer_key: 'Z9OufPZ5l5gb17dyWnRpNOjqC',
    consumer_secret: 'Fa2fvXJ3AhTNOHUWfLIwSOdyC42IOOPXx8TdY6wuUSgr9iqIqW',
    access_token_key: '1182090541376233472-OWOmD2PLF7Y3GT6GU7uEWrGIwa9pWX',
    access_token_secret: 'VGf2Ea89NwKzQyEDleGrx5hiAqYJnmx9QZqQIHK4yyUmh'
  });
  
var scoreTotal = 0;

//  Cloud Services Set-up   
//  Create unique bucket name
const bucketName = 'assign2-twitter-store'; 
//  Create a promise on S3  service object
const bucketPromise = new AWS.S3({ apiVersion: '2006-03-01'}).createBucket({ Bucket: bucketName}).promise();
bucketPromise.then(function(data) {
    console.log  ("Successfully created " + bucketName);  
})  
.catch(function(err) {        
    console.error(err, err.stack);  
});

const redisClient = redis.createClient();

redisClient.on('error', (err) => {
    console.log("Error " + err);
});

app.use(responseTime());

app.get('/', (req, res) => {
    res.writeHead(200,{'content-type': 'text/html'});
    fs.readFile('form.html', 'utf8', (err, data) => {
        if (err) {
            res.end('Could not find or open file for reading\n');
        } else {
            res.end(data);
        }
    });
});


app.post('/', (req, res) => {

// 1. Get user input
const input = req.body.search_field;
console.log(input);
const redisKey = `twitter:${input}`;
const s3Key = `twitter-${input}`;
    const params = {
        Bucket: bucketName,
        Key: s3Key
    };


//Try the cache
return redisClient.get(redisKey, (err, result) => {

if (result) {
    //Serve from Cache
    const resultJSON = JSON.parse(result);
    //console.log(resultJSON);
   // return res.status(200).json(resultJSON);
    let s =  '<!DOCTYPE html>' +
                '<html><head><title>Twitter output</title><link rel="stylesheet" href="/public/css/styles.css" type="text/css"><meta charset="UTF-8"/></head>' + 
                '<body><h1>Result of searched word from Redis</h1>';

var scoreTotal = 0;
  resultJSON.tweetArray.forEach(function(tweet) {
        var sentiment = new Sentiment();                                                                                                                                                                                                                                                                                                                                                                                                                                                             
        // var result = sentiment.analyze(resultJSON.tweetArray.tweet.text);
        var result = sentiment.analyze(tweet.text);

         const { SimilarSearch } = require('node-nlp');

         const similar = new SimilarSearch();
         const text1 = tweet.text;
         const text2 = input;
         const result1 = similar.getBestSubstring(text1, text2);

         console.dir(result);
         console.log(result1);
         scoreTotal = scoreTotal + result.score;

         s += '<h3>Tweet:</h3><div class="container"><div class="row"><div class="col-sm"><div class="media-left"><a href="https://twitter.com/' + tweet.userScreenName + '" target="_blank" title="' + tweet.userName + '"><img class="media-object" src="' + tweet.userImage + '" alt="' + tweet.userName + '" /></a></div><div class="media-body">';
         s += ' <h5 class="media-heading"><a href="https://twitter.com/' + tweet.userScreenName + '" target="_blank">' + tweet.userScreenName + '</a></h5>';
         s += '<p class="tweet-body" title="View full tweet" data-link="https://twitter.com/' + tweet.userScreenName + '/status/' + tweet.userID + '">' + tweet.text + '</p>';
         s += 'Score: ' + result.score + ' Accumulated score: ' + scoreTotal + ' Result on simularity: accuracy ' + result1.accuracy + ', The Levenshtein distance '+ result1.levenshtein + '</div></div>'

         return s;

        });
        console.log(scoreTotal);
        s = s + 'Score Total: ' + scoreTotal; 
        res.send(s); 
   
} else {
    // check s3 for data
    var scoreTotal = 0;
    return new AWS.S3({
        apiVersion: '2006-03-01'
    }).getObject(params, (err, result) => {
        if (result) { // S3 has the twitter page
            // Serve from S3
            console.log(result);
            const resultJSON = JSON.parse(result.Body);
        
         let s =  '<!DOCTYPE html>' +
         '<html><head><title>Twitter output</title><link rel="stylesheet" href="/public/css/styles.css" type="text/css"><meta charset="UTF-8"/></head>' + 
         '<body><h1>Result of searched word from S3</h1>';
           
           resultJSON.tweetArray.forEach(function(tweet) {
                  var sentiment = new Sentiment();                                                                                                                                                                                                                                                                                                                                                                                                                                                             
                //  var result = sentiment.analyze(resultJSON.tweetArray.text);
                var result = sentiment.analyze(tweet.text);
                  const { SimilarSearch } = require('node-nlp');
         
                  const similar = new SimilarSearch();
                  const text1 = tweet.text;
                  const text2 = input;
                  const result1 = similar.getBestSubstring(text1, text2);
         
                  console.dir(result);
                  console.log(result1);
                  scoreTotal = scoreTotal + result.score;
         
                  s += '<h3>Tweet:</h3><div class="container"><div class="row"><div class="col-sm"><div class="media-left"><a href="https://twitter.com/' + tweet.userScreenName + '" target="_blank" title="' + tweet.userName + '"><img class="media-object" src="' + tweet.userImage + '" alt="' + tweet.userName + '" /></a></div><div class="media-body">';
                  s += ' <h5 class="media-heading"><a href="https://twitter.com/' + tweet.userScreenName + '" target="_blank">' + tweet.userScreenName + '</a></h5>';
                  s += '<p class="tweet-body" title="View full tweet" data-link="https://twitter.com/' + tweet.userScreenName + '/status/' + tweet.userID + '">' + tweet.text + '</p></div></div>';
                  s += ' </div></div> Score: ' + result.score + ' Accumulated score: ' + scoreTotal + ' Result on simularity: accuracy ' + result1.accuracy + ', The Levenshtein distance '+ result1.levenshtein + '</div></div>'
                 
                 });
                 console.log(scoreTotal);
                 s = s + 'Score Total: ' + scoreTotal; 
                 res.send(s); 
       }
    else {

            //Serve from Twitter API and store in cache

            let s =  '<!DOCTYPE html>' +
            '<html><head><title>Twitter output</title><link rel="stylesheet" href="/public/css/styles.css" type="text/css"><meta charset="UTF-8"/></head>' + 
            '<body><h1>Result of searched word</h1>';

            // 2. Search twitter

            twitter.get('search/tweets', {q: input, count: 1000, language: 'en'}, function(error, tweets, response) {

            //put all the tweets into an array and then store the array in Redis   
            var tweetArray=[];
            for (let index = 0; index < tweets.statuses.length; index++) {
                const tweet = tweets.statuses[index];
                var tweetbody = {
                    'text': tweet.text,
                    'userScreenName': "@" + tweet.user.screen_name,
                  //  'userScreenName': tweet.user.screen_name,
                    'userName' : tweet.user.name,
                    'userImage': tweet.user.profile_image_url_https,
                    'userDescription': tweet.user.description,
                    'userID' : tweet.id_str,
                    }
            try {
                if(tweet.entities.media[0].media_url_https) {
                tweetbody['image'] = tweet.entities.media[0].media_url_https;
                }
            } catch(err) { }
            tweetArray.push(tweetbody);
            }     
        redisClient.setex(redisKey, 3600, JSON.stringify({source: 'Redis Cache', tweetArray}));

        // store in S3

        const body = JSON.stringify({source: 'S3 Bucket', tweetArray});
        const objectParams = {
            Bucket: bucketName,
            Key: s3Key,
            Body: body
            };
        const uploadPromise = new AWS.S3({
            apiVersion: '2006-03-01'
        }).putObject(objectParams).promise();

        uploadPromise.then(function (data) {
        console.log("Successfully uploaded data to " + bucketName + "/" + s3Key);
        });

       tweets.statuses.forEach(function(tweet) {
            console.log("tweet: " + tweet.text);
         
            var sentiment = new Sentiment();                                                                                                                                                                                                                                                                                                                                                                                                                                                             
            var result = sentiment.analyze(tweet.text);

            const { SimilarSearch } = require('node-nlp');

            const similar = new SimilarSearch();
            const text1 = tweet.text;
            const text2 = input;
            const result1 = similar.getBestSubstring(text1, text2);

            console.dir(result);
            console.log(result1);
            scoreTotal = scoreTotal + result.score;
    
            s += '<h3>Tweet:</h3><div class="container"><div class="row"><div class="col-sm"><div class="media-left"><a href="https://twitter.com/' + tweet.user.screen_name + '" target="_blank" title="' + tweet.user.name + '"><img class="media-object" src="' + tweet.user.profile_image_url_https + '" alt="' + tweet.user.name + '" /></a></div><div class="media-body">';
            s += ' <h5 class="media-heading"><a href="https://twitter.com/' + tweet.user.screen_name + '" target="_blank">' + tweet.user.screen_name + '</a></h5>';
            s += '<p class="tweet-body" title="View full tweet" data-link="https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str + '">' + tweet.text + '</p>';
            s += 'Score: ' + result.score + ' Accumulated score: ' + scoreTotal + ' Result on simularity: accuracy ' + result1.accuracy + ', The Levenshtein distance '+ result1.levenshtein + '</div></div>'
            return s;
     
            });
            console.log(scoreTotal);
            s = s + 'Score Total: ' + scoreTotal; 
            res.send(s); 
            });
        }
        });
    }
    });
});


app.listen(port, function () {
    console.log(`Express app listening at http://${hostname}:${port}/`);
});