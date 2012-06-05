###
Python's urllib.quote

escape does not escape:
`* + - . / @ _`

encodeURIComponent does not escape:

! ' ( ) * - . _ ~
###

quote = (str)->
  str = escape(str)
             .replace(/\%21/g, '!')
             .replace(/\%27/g, '\'')
             .replace(/\%28/g, '\(')
             .replace(/\%29/g, '\)')
             .replace(/\%7E/g, '\~')
  
  str.replace(/\+/g, '%2B')
     .replace(/\//g, '%2F')
     .replace(/@/g,  '%40')
     .replace(/\s/g, '%2B')

replaceMismatch = (str)->
  str.replace(/\!/g, "%21")
     .replace(/\'/g, "%27")
     .replace(/\(/g, "%28")
     .replace(/\)/g, "%29")
     .replace(/\*/g, "%2A")
  
doublequote = (str)->
  replaceMismatch( quote(str) ).replace(/%/g, '%25')
  
unquote = (str)->

  unescape(str).replace(/\%21/g, '!')
               .replace(/\%27/g, '\'')
               .replace(/\%28/g, '\(')
               .replace(/\%29/g, '\)')
               .replace(/\%7E/g, '\~')
               .replace(/\s/g,   '%2B')

((name, definition) ->
  # If this is amd
  if typeof define is "function"
    define definition
  
  # If this is node
  else if typeof module isnt "undefined" and module.exports
    module.exports = definition()
  # or browser
  else
    theModule = definition()
    global = this
    old = global[name]
    theModule.noConflict = ->
      global[name] = old
      theModule

    global[name] = theModule
) "escapePy", ->
  quote: quote
  doublequote: doublequote
  replaceMismatch: replaceMismatch
  unquote: unquote

