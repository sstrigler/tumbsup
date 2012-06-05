var Tumblr = require('../lib/tumblr-v2'),
    conf = require('./tumblr-conf'),
    assert = require('assert');

var tumblr = new Tumblr({
  consumerKey : conf.consumerKey,
  consumerSecret : conf.consumerSecret,
  accessTokenKey : conf.accessTokenKey,
  accessTokenSecret : conf.accessTokenSecret
});

tumblr.getUserInfo(function(err, result) {
  console.log(arguments);
})
