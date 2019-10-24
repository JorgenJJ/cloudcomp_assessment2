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

var router = express.Router();

const bucketName = 'assignment2-twitter-store';

const bucketPromise = new AWS.S3({ apiVersion: '2006-03-01'}).createBucket({ Bucket: bucketName}).promise();
bucketPromise.then(function(data) {
    console.log  ("Successfully created " + bucketName);
})
.catch(function(err) {
    console.error(err, err.stack);
});

const redisClient = redis.createClient();

redisClient.on('error', (err) => {
    console.log("REDIS ERROR: " + err);
});

var twitter = new Twitter({
  consumer_key: 'Z9OufPZ5l5gb17dyWnRpNOjqC',
  consumer_secret: 'Fa2fvXJ3AhTNOHUWfLIwSOdyC42IOOPXx8TdY6wuUSgr9iqIqW',
  access_token_key: '1182090541376233472-OWOmD2PLF7Y3GT6GU7uEWrGIwa9pWX',
  access_token_secret: 'VGf2Ea89NwKzQyEDleGrx5hiAqYJnmx9QZqQIHK4yyUmh'
});

let scoreTotal = 0;

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {});
});

router.post("/api/twitter", function(req, res, next) {
  // 1. Get user input
  const input = req.body.query;
  const redisKey = `twitter:${input}`;

  //app.get('/api/search', (req, res) => {
    //  const query = (req.query.query).trim();

      // Construct the wiki URL and key
    //  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
    //  const redisKey = `twitter:${input}`; // Try the cache
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
        // console.log(resultJSON.score);
        res.json({ success: true, data: {query: input, length: resultJSON.tweetArray.length, score: resultJSON.score, relevancy: resultJSON.relevancy } });

    } else {
      // check s3 for data
      return new AWS.S3({
          apiVersion: '2006-03-01'
      }).getObject(params, (err, result) => {
        if (result) { // S3 has the twitter page
          // Serve from S3
          console.log(result);
          const resultJSON = JSON.parse(result.Body);
      //    delete resultJSON.source;
      //    redisClient.setex(redisKey, 3600, JSON.stringify({
      //        source: 'Redis Cache',
      //        ...resultJSON,
      //    }));
          //return res.status(200).json({source: 'S3 Bucket', ...resultJSON});
          res.json({ success: true, data: {query: input, length: resultJSON.tweetArray.length, score: resultJSON.score, relevancy: resultJSON.relevancy } });
        } else {

          //Serve from Twitter API and store in cache

          let s =  '<!DOCTYPE html>' +
          '<html><head><title>Twitter output</title><link rel="stylesheet" href="/public/css/styles.css" type="text/css"><meta charset="UTF-8"/></head>' +
          '<body><h1>Result of searched word</h1>';

          // 2. Search twitter

           twitter.get('search/tweets', {q: input, count: 15, lang: 'en', result_type: 'recent'}, function(error, tweets, response) {

         //put all the tweets into an array and then store the array in Redis
           var tweetArray=[];
            for (let index = 0; index < tweets.statuses.length; index++) {
              const tweet = tweets.statuses[index];
              var tweetbody = {
                'text': tweet.text,
                'userScreenName': "@" + tweet.user.screen_name,
                'userName' : tweet.user.name,
                'userImage': tweet.user.profile_image_url_https,
                'userDescription': tweet.user.description,
                'date': tweet.created_at,
              }
              try {
                if(tweet.entities.media[0].media_url_https) {
                  tweetbody['image'] = tweet.entities.media[0].media_url_https;
                }
              } catch(err) { };
              tweetArray.push(tweetbody);
            }

            let d1 = new Date(tweetArray[0].date);
            let d2 = new Date(tweetArray[tweetArray.length - 1].date);
            let relevancy = 1 / (Math.abs(d1 - d2));

            tweets.statuses.forEach(function(tweet) {
             //redisClient.setex(redisKey, 3600, JSON.stringify({source: 'Redis Cache', tweet: tweet.id_str, tweet: tweet.user.screen_name, tweet: tweet.user.name, tweet: tweet.text}));

              var sentiment = new Sentiment();
              var result = sentiment.analyze(tweet.text);

              const { SimilarSearch } = require('node-nlp');

              const similar = new SimilarSearch();
              const text1 = tweet.text;
              const text2 = input;
              const result1 = similar.getBestSubstring(text1, text2);

              scoreTotal = scoreTotal + result.score;

              s += '<h3>Tweet:</h3><div class="container"><div class="row"><div class="col-sm"><div class="media-left"><a href="https://twitter.com/' + tweet.user.screen_name + '" target="_blank" title="' + tweet.user.name + '"><img class="media-object" src="' + tweet.user.profile_image_url_https + '" alt="' + tweet.user.name + '" /></a></div><div class="media-body">';
              s += ' <h5 class="media-heading"><a href="https://twitter.com/' + tweet.user.screen_name + '" target="_blank">' + tweet.user.screen_name + '</a></h5>';
              s += '<p class="tweet-body" title="View full tweet" data-link="https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str + '">' + tweet.text + '</p>';
              s += ' </div></div> Score: ' + result.score + ' Accumulated score: ' + scoreTotal + ' Result on simularity: accuracy ' + result1.accuracy + ', The Levenshtein distance '+ result1.levenshtein + '</div></div>'
              return s;

            });

            redisClient.setex(redisKey, 3600, JSON.stringify({source: 'Redis Cache', tweetArray, score: scoreTotal, relevancy: relevancy}));

            // store in S3
            //const responseJSON = response.data;
            const body = JSON.stringify({source: 'S3 Bucket', tweetArray, score: scoreTotal, relevancy: relevancy});
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
            res.json({ success: true, data: {query: input, length: tweetArray.length, score: scoreTotal, relevancy: relevancy } });
          });
        }
      });
  //else bracket
    }
  });
});

module.exports = router;
