var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('testing', { title: 'Express' });
});

router.get('/fiddle', function(req, res, next) {
  res.render('fiddle', {});
})

module.exports = router;
