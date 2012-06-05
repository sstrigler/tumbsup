VERSION     = '0.0.2'

querystring = require('querystring')
CustomOAuth = require('./custom-oauth')
utils       = require('./utils')
keys        = require('./keys')

encodeToHex = require('./encode-image').encodeToHex

class Tumblr

  @VERSION = VERSION
  BASE     = "http://api.tumblr.com/v2/"
  
  _isFunction = (fn)->
    getType = {}
    fn and getType.toString.call(fn) is "[object Function]"
  
  defaults =
    consumerKey: null
    consumerSecret: null
    accessTokenKey: null
    accessTokenSecret: null
    headers:
      'Accept-Encoding': 'identity'
    secure: no
    cookie: 'tbauth'
    cookieOptions: {}
    cookieSecret: null

  constructor: (options)->

    @options  = utils.merge(defaults, options, keys.urls)
    @host     = @options.host
    @baseBlog = "#{BASE}blog/#{@host}/"

    @oauth    = new CustomOAuth(
      @options.requestTokenUrl,
      @options.accessTokenUrl,
      @options.consumerKey,
      @options.consumerSecret,
      '1.0', null, 'HMAC-SHA1', null, @options.headers
    )

  get: (action, options, callback)->
    if ( not callback? ) and _isFunction( options )
      callback = options
    # user info can be retrieved via POST
    method = if /user/.test(action) then 'post' else 'get'
    @oauth[method] @getUrlFor(action, options),
      @options.accessTokenKey,
      @options.accessTokenSecret,
      callback
  

  post: (content, callback)->
    if content.data?
      @oauth.originalBody = {}
      if Array.isArray( content.data )
        for d, i in content.data
          content["data[#{i}]"] = encodeToHex(d)
          @oauth.originalBody["data[#{i}]"] = encodeToHex(d)
        delete content.data
      else
        content[ 'data[0]' ] = encodeToHex(content.data)
        @oauth.originalBody["data[0]"] = encodeToHex(content.data)
        delete content.data
    @oauth.post @getUrlFor('post'),
      @options.accessTokenKey,
      @options.accessTokenSecret,
      content, "application/x-www-form-urlencoded",
      callback
  

  edit: (content, callback)->
    @oauth.post @getUrlFor('post/edit'),
      @options.accessTokenKey,
      @options.accessTokenSecret,
      content, "application/x-www-form-urlencoded",
      callback
  

  delete: (postId, callback)->
    if postId.id?
      postId = postId.id

    content =
      "id": postId

    @oauth.post @getUrlFor('post/delete'),
      @options.accessTokenKey,
      @options.accessTokenSecret,
      content, "application/x-www-form-urlencoded",
      callback


  getUrlFor: (action, options)->
    if /post(?!s)/.test(action)
      return "#{@baseBlog}#{action}"
    else
      isUser = /user/.test(action)
      _url   = "#{if isUser then BASE else @baseBlog}"
      _url  += "#{action}/"

      # If Oauth is not required, add the API key
      unless ( options?.type? in ['draft', 'queue', 'submission'] or isUser )
        _url += "?api_key=#{@options.consumerKey}"

      if options?
        query = querystring.stringify(options)
        if query isnt ''
          _url += "&#{ query }"
      _url

module.exports = Tumblr
