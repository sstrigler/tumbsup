fs          = require('fs')
Tumblr      = require('./../src/tumblr')
config      = JSON.parse(fs.readFileSync('config.json'))
photo       = fs.readFileSync('test/assets/50-photo.jpg')
require('console-trace')


encodedBody = fs.readFileSync('test/assets/url-encoded-image.txt').toString('utf-8')
encodedAuth = fs.readFileSync('test/assets/url-encoded-auth.txt').toString('utf-8')
encodedQ    = fs.readFileSync('test/assets/url-encoded-auth-before-quote.txt').toString('utf-8')


photo       = fs.readFileSync('test/assets/photo.jpg')
{ encodeToHex, replaceAfterEncode } = require('./../src/encode-image')

describe "encodeToHex", ->
  it "should encode image as same as python's dump", ->
    encodedString = encodeURIComponent( encodeToHex(photo) )
    encodedString = replaceAfterEncode( encodedString )
    encodedString.should.equal encodedString
  

  it "should encode image as same as python's dump for oauth signature", ->

    @tumblr = new Tumblr
      consumerKey: config.consumerKey
      consumerSecret: config.secretKey
      accessTokenKey: config.accessToken
      accessTokenSecret: config.accessTokenSecret
      host: config.host
    
    
    photo = fs.readFileSync('test/assets/50-photo.jpg' )
    @tumblr.oauth.originalBody =
      "data[0]": encodeToHex( photo )

    
    photo.toString('binary').substr(0, 1000).should.equal fs.readFileSync('test/assets/50-photo.jpg' ).toString('binary').substr(0, 1000)

    method        = "POST"
    url           = "http://api.tumblr.com/v2/blog/square.mnmly.com/post"
    parameters    = "data%5B0%5D=#{encodeURIComponent(replaceAfterEncode( encodeToHex(photo) ))}"
    signagureBase = @tumblr.oauth._createSignatureBase(method, url, parameters)
    encodedImage  = signagureBase.replace('POST&http%3A%2F%2Fapi.tumblr.com%2Fv2%2Fblog%2Fsquare.mnmly.com%2Fpost&', '')
                                 .replace(/%26/, '')
    encodedAuth   = encodedAuth.replace('POST&http%3A%2F%2Fapi.tumblr.com%2Fv2%2Fblog%2Fsquare.mnmly.com%2Fpost&', '')
                               .replace(/%26oauth_consumer_key\S+/, '')
    
    encodedImage.substr(0, 5000).should.equal encodedAuth.substr(0, 5000)
    encodedImage.substr(10000, 10000).should.equal encodedAuth.substr(10000, 10000)
    encodedImage.substr(20000, 40000).should.equal encodedAuth.substr(20000, 40000)
    encodedImage.should.equal encodedAuth

