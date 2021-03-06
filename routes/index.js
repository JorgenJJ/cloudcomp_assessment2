const responseTime = require('response-time')
const fs = require('fs');
const axios = require('axios');
const logger = require('morgan');
var Twitter = require('twitter');
var Sentiment = require('sentiment');
var bodyParser = require('body-parser');
const helmet = require('helmet');
const redis = require('redis');
const AWS = require('aws-sdk');
var express = require('express');
const async = require("async");

var router = express.Router();

// Set up connection with AWS S3 bucket
const bucketName = 'assessment2-twitter-store';

const bucketPromise = new AWS.S3({ apiVersion: '2006-03-01'}).createBucket({ Bucket: bucketName}).promise();
bucketPromise.then(function(data) {
    console.log  ("Successfully created " + bucketName);
})
.catch(function(err) {
    console.error(err, err.stack);
});

// Set up connection with Redis cache
const redisClient = redis.createClient();

redisClient.on('error', (err) => {
    console.log("REDIS ERROR: " + err);
});

// Authentication for using the Twitter API
var twitter = new Twitter({
  consumer_key: 'Z9OufPZ5l5gb17dyWnRpNOjqC',
  consumer_secret: 'Fa2fvXJ3AhTNOHUWfLIwSOdyC42IOOPXx8TdY6wuUSgr9iqIqW',
  access_token_key: '1182090541376233472-OWOmD2PLF7Y3GT6GU7uEWrGIwa9pWX',
  access_token_secret: 'VGf2Ea89NwKzQyEDleGrx5hiAqYJnmx9QZqQIHK4yyUmh'
});

let scoreTotal = 0; // Saves the total score provided by Sentiment analysis

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {});
});

router.post("/api/twitter", function(req, res, next) {
  const input = req.body.query;
  const redisKey = `twitter:${input}`;  // Redis key format
  scoreTotal = 0;
  const s3Key = `twitter-${input}`; // S3 key format
  const params = {
      Bucket: bucketName,
      Key: s3Key
  };


  //Try the cache
  return redisClient.get(redisKey, (err, result) => {

    if (result) { // If found in redis
        //Serve from Cache
        const resultJSON = JSON.parse(result);
        console.log("Data collected from Redis cache");
        res.json({ success: true, data: {query: input, array: resultJSON.tweetArray, score: resultJSON.score, relevancy: resultJSON.relevancy, seconds: resultJSON.seconds } });

    } else {  // If not found in redis
      // check s3 for data
      return new AWS.S3({
          apiVersion: '2006-03-01'
      }).getObject(params, (err, result) => {
        if (result) { // If in S3
          // Serve from S3
          const resultJSON = JSON.parse(result.Body);
          console.log("Data collected from S3 storage");
          res.json({ success: true, data: {query: input, array: resultJSON.tweetArray, score: resultJSON.score, relevancy: resultJSON.relevancy, seconds: resultJSON.seconds } });
        } else {  // If not in S3

          //Serve from Twitter API and store in cache and Redis
          // All code related to s is currently not in use
          let s =  '<!DOCTYPE html>' +
          '<html><head><title>Twitter output</title><link rel="stylesheet" href="/public/css/styles.css" type="text/css"><meta charset="UTF-8"/></head>' +
          '<body><h1>Result of searched word</h1>';

          // 2. Search twitter

           twitter.get('search/tweets', {q: input, count: 100, lang: 'en', result_type: 'recent'}, function(error, tweets, response) {

         //put all the tweets into an array and then store the array in Redis
           var tweetArray=[];
            for (let index = 0; index < tweets.statuses.length; index++) {  // Loop through all received tweets
              const tweet = tweets.statuses[index];
              var tweetbody = { // Create an object for each tweet
                'text': tweet.text,
                'userScreenName': "@" + tweet.user.screen_name,
                'userName' : tweet.user.name,
                'userImage': tweet.user.profile_image_url_https,
                'userDescription': tweet.user.description,
                'date': tweet.created_at,
              }
              try {
                if(tweet.entities.media[0].media_url_https) { // If there is an image attached
                  tweetbody['image'] = tweet.entities.media[0].media_url_https;
                }
              } catch(err) { };
              tweetArray.push(tweetbody);
            }

            let d1 = new Date(tweetArray[0].date);
            let d2 = new Date(tweetArray[tweetArray.length - 1].date);
            let relevancy = 1 / (Math.abs(d1 - d2));
            let seconds = Math.abs(d1 - d2) / 1000;

            tweets.statuses.forEach(function(tweet) { // Loop through all tweets

              var sentiment = new Sentiment();
              var result = sentiment.analyze(tweet.text); // Analyze the tweet score

              const { SimilarSearch } = require('node-nlp');

              const similar = new SimilarSearch();
              const text1 = tweet.text;
              const text2 = input;
              const result1 = similar.getBestSubstring(text1, text2);

              scoreTotal = scoreTotal + result.score; // Add the score to the total

              s += '<h3>Tweet:</h3><div class="container"><div class="row"><div class="col-sm"><div class="media-left"><a href="https://twitter.com/' + tweet.user.screen_name + '" target="_blank" title="' + tweet.user.name + '"><img class="media-object" src="' + tweet.user.profile_image_url_https + '" alt="' + tweet.user.name + '" /></a></div><div class="media-body">';
              s += ' <h5 class="media-heading"><a href="https://twitter.com/' + tweet.user.screen_name + '" target="_blank">' + tweet.user.screen_name + '</a></h5>';
              s += '<p class="tweet-body" title="View full tweet" data-link="https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str + '">' + tweet.text + '</p>';
              s += ' </div></div> Score: ' + result.score + ' Accumulated score: ' + scoreTotal + ' Result on simularity: accuracy ' + result1.accuracy + ', The Levenshtein distance '+ result1.levenshtein + '</div></div>'
              return s;

            });

            redisClient.setex(redisKey, 3600, JSON.stringify({source: 'Redis Cache', tweetArray, score: scoreTotal, relevancy: relevancy, seconds: seconds}));

            // store in S3
            //const responseJSON = response.data;
            const body = JSON.stringify({source: 'S3 Bucket', tweetArray, score: scoreTotal, relevancy: relevancy, seconds: seconds});
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

            s = s + 'Score Total: ' + scoreTotal;
            console.log("Data collected from Twitter API");
            res.json({ success: true, data: {query: input, array: tweetArray, score: scoreTotal, relevancy: relevancy, seconds: seconds } });
          });
        }
      });
    }
  });
});

// Collecting all stored bubbles
// *NOT IN USE*
router.get("/api/twitterAll", function(req, res, next) {
  let bubbles = [];
  let resultJSON;

  return redisClient.keys("*", (err, result) => {
    if (result.length != 0) {
      //res.json({success: true, data: result});
      async.map(result, function (key, cb) {
        redisClient.get(key, function (error, value) {
          if (error) return cb(error);
          let bubble = {};
          bubble["id"] = key;
          bubble["data"] = value;
          cb(null, bubble);
        });
      }, function (error, results) {
        if (error) return console.log(error);
        bubbles = results;
        res.json({success: true, source: "REDIS", data: bubbles});
      })
    }
    else {
      const s3Key = `twitter-`;
      const objectParams = {
        Bucket: bucketName,
        MaxKeys: 1000
      };

      return new AWS.S3({
          apiVersion: '2006-03-01'
      }).listObjects(objectParams, (err, data) => {
        if (err) {
          console.log(err);
          res.json({success: true, data: bubbles});
        }
        else {
          async.map(data.Contents, function (key, cb) {
            const params = {
              Bucket: bucketName,
              Key: key.Key
            }
            const responsePromise = new AWS.S3({
              apiVersion: '2006-03-01'
            }).getObject(params).promise();

            responsePromise.then(function (resp) {
              let bubble = {};
              let resJSON = JSON.parse(resp.Body);
              bubble["id"] = params.Key;
              bubble["data"] = resJSON;
              cb(null, bubble);
            });
          }, function (error, results) {
            if (error) return console.log(error);
            bubbles = results;
            res.json({success: true, source: "S3", data: bubbles});
          });
        }
      });

      res.json({success: true, source: null, data: null});
    }
  });
});

// Delete bubble from Redis and S3
router.post("/api/delete", function (req, res, next) {
  const input = req.body.query;
  redisClient.del(input);

  let s3name = input.split(":");

  const s3Key = `twitter-${s3name[1]}`;
  const objectParams = {
    Bucket: bucketName,
    Key: s3Key
  };
  const uploadPromise = new AWS.S3({
    apiVersion: '2006-03-01'
  }).deleteObject(objectParams).promise();

  uploadPromise.then(function (data) {
    console.log("Successfully deleted " + s3Key + " from " + bucketName);
  });


  res.json({success: true});
});

module.exports = router;
