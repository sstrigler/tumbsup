fs          = require('fs')
qs          = require('querystring')
quote       = require('./escape-py').quote
doublequote = require('./escape-py').doublequote

module.exports.encodeToHex = (buffer)->
  "data:" + (buffer.toString('binary'))

module.exports.replaceAfterEncode = (str, originalBody = null)->
  
  pattern = /data%3A([\w\!\'\(\)\*\-\._~%]+)/g
  if originalBody?
    pattern = /data%255B(\d+)%255D%3Ddata%253A([\w\!\'\(\)\*\-\._~%]+)/g
  _s = str.replace pattern, (a, g1, g2) ->
    unless isNaN( g1 )
      index = g1
      data = originalBody["data[#{index}]"].replace('data:', '')
      g1 = g2
      g1 = "data%5B#{index}%5D%3D" + doublequote(data)
    else
      g1 = quote( decodeURIComponent(g1) )
      g1 = g1.replace( /%20/g, "+" )
    g1
  _s

