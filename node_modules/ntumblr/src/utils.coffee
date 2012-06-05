###
  Merge objects into the first one
###

exports.merge = (defaults) ->
  
  for obj, i in arguments
    continue if i is 0
    for key, val of obj
      defaults[key] = val

  defaults


