{ replaceMismatch, quote, doublequote } = require('../src/escape-py')

describe "quote", ->
  it "should escape acii string", ->
    quote('abcd').should.equal 'abcd'

  it 'should not escape `! \' ( ) * - . _ ~`', ->
    noEscapeChars = '! \' ( ) * - . _ ~'.split(' ')

    for char in noEscapeChars
      quote(char).should.equal(char)

  it 'should escape `+ / @`', ->
    escapeChars  = '+ \/ @'.split(' ')
    escapedChars = ['%2B', '%2F', '%40']
    for char, i in escapeChars
      quote(char).should.equal(escapedChars[i])

  it 'should not encode unicode', ->
    euro = '€'
    quote(euro).should.equal('%u20AC')

  it 'should function double-encode', ->
    str = 'Having a nice day :D ! \' ( ) * - . _ ~'
    doubleEncodedStr = "Having%2520a%2520nice%2520day%2520%253AD%2520%2521%2520%2527%2520%2528%2520%2529%2520%252A%2520-%2520.%2520_%2520~"
    replaceMismatch( encodeURIComponent( replaceMismatch( encodeURIComponent(str) ) ) ).should.equal doubleEncodedStr
    doublequote( str ).should.equal(doubleEncodedStr)
    
