http    = require('http')
fs      = require('fs')
express = require("express")
Tumblr  = require('./src/tumblr')
OAuth = require("oauth").OAuth

config  = JSON.parse( fs.readFileSync('config.json', 'utf-8') )

# if express version 3 or above
if express.version.charAt(0) is '3'
  app = express()
  http.createServer( app ).listen 3000
else
  app = express.createServer()
  app.listen 3000

app.configure ->
  app.use express.bodyParser()
  app.use express.cookieParser('secrecy')
  app.use express.session(secret: 'somerandomletters')

oa = new OAuth("http://www.tumblr.com/oauth/request_token",
               "http://www.tumblr.com/oauth/access_token",
               config.consumerKey,
               config.secretKey,
               "1.0A",
               "http://localhost:3000/callback",
               "HMAC-SHA1")

app.get "/callback", (req, res) ->
  oauth_token = req.query.oauth_token
  oauth_verifier = req.query.oauth_verifier
  hasVerifier = !!(oauth_verifier)
  if hasVerifier
    getOAuthAccessToken req, res, oauth_verifier
  else
    getOAuthRequestToken req, res

app.get "/", (req, res) ->
  res.redirect('callback')

app.get "/dashb", (req, res) ->
  res.send "ok"

app.get "/dashb/fetch", (req, res) ->
  oa.getProtectedResource "http://api.tumblr.com/v2/blog/square.mnmly.com/info", "GET", req.session.oauth.access_token, req.session.oauth.access_token_secret, (err, data, response) ->
    if err
      res.send err, 500
      return
    res.contentType "json"
    res.send data

getOAuthAccessToken = (req, res, oauth_verifier) ->
  oa.getOAuthAccessToken req.session.oauth.oauth_token, req.session.oauth.oauth_token_secret, oauth_verifier, (err, oauth_access_token, oauth_access_token_secret, results) ->
    if err
      res.send err, 500
      return
    req.session.oauth =
      access_token: oauth_access_token
      access_token_secret: oauth_access_token_secret

    unless config.accessToken?
      config.accessToken = oauth_access_token
      config.accessTokenSecret = oauth_access_token_secret
      fs.writeFileSync('config.json', JSON.stringify(config, null, 2))

    res.redirect "/dashb"

getOAuthRequestToken = (req, res) ->
  oa.getOAuthRequestToken (err, oauth_token, oauth_token_secret, results) ->
    if err
      res.send err, 500
      return
    req.session.oauth =
      oauth_token: oauth_token
      oauth_token_secret: oauth_token_secret
      request_token_results: results
    
    res.redirect "http://www.tumblr.com/oauth/authorize?oauth_token=" + oauth_token

console.log "listening on port 3000"
