var fs = require('fs')
var path = require('path')

var cosmiconfig = require('cosmiconfig')
var editorconfig = require('editorconfig')
var mergeDeep = require('merge-deep')
var resolveFrom = require('resolve-from')

var isEmptyObject = require('./util').isEmptyObject

var defaultIndentWidth = ' '.repeat(2)

function hasScssInWorkingDir (wd) {
  var dirs = fs.readdirSync(wd)
  return dirs.some(function (dir) {
    return dir.match(/.*\.scss/)
  })
}

function getIndentationFromEditorConfig (from, hasScss) {
  var config
  if (hasScss) {
    config = editorconfig.parseSync(path.resolve(process.cwd(), '*.scss'))
  } else {
    config = editorconfig.parseSync(path.resolve(process.cwd(), '*.css'))
  }
  switch ((config || {}).indent_style) {
    case 'tab':
      return '\t'
    case 'space':
      return ' '.repeat(config.indent_size)
    default:
      return defaultIndentWidth
  }
}

function getIndentationFromStylelintRules (rules) {
  var indentation = rules['indentation']
  if (typeof indentation === 'object') {
    indentation = indentation[0]
  }
  switch (typeof indentation) {
    case 'string':
      return '\t'
    case 'number':
      return ' '.repeat(indentation)
    default:
      return defaultIndentWidth
  }
}

function loadStylelintExtendConfig (params, config, configPath) {
  if (isEmptyObject(config.extends)) {
    return Promise.resolve(params)
  }
  return [].concat(config.extends).reduce(function (promise, extention) {
    return promise.then(function (mergedParams) {
      return augmentParams(mergedParams, extention, configPath)
    })
  }, Promise.resolve(params))
}

function augmentParams (originParams, extention, configPath) {
  return cosmiconfig()
    .load(null, resolveFrom(configPath, extention))
    .then(function (stylelint) {
      if (!stylelint) {
        return Promise.resolve(originParams)
      }
      var dirname = path.dirname(stylelint.filepath)
      var config = stylelint.config
      var rules = config.rules
      if (isEmptyObject(rules)) {
        return loadStylelintExtendConfig(originParams, config, dirname)
      }
      var params = {}
      params.indentWidth = getIndentationFromStylelintRules(rules)
      params.stylelint = rules
      var newParams = mergeDeep(params, originParams)
      return loadStylelintExtendConfig(newParams, config, dirname)
    })
}

function params (options) {
  // same as the options in stylelint
  var cosmiconfigOpts = {
    argv: false,
    rcExtensions: true
  }

  var searchPath
  if (options.config) {
    searchPath = options.config
  } else {
    searchPath = process.cwd()
  }

  return cosmiconfig('stylelint', cosmiconfigOpts).load(searchPath).then(function (stylelint) {
    var params = {}

    var hasScss = hasScssInWorkingDir(searchPath)
    params.hasScss = hasScss

    if (!stylelint) {
      params.indentWidth = getIndentationFromEditorConfig(searchPath, hasScss)
      params.stylelint = {}
      return Promise.resolve(params)
    }

    var rules = stylelint.config.rules
    if (!isEmptyObject(rules)) {
      params.indentWidth = getIndentationFromStylelintRules(rules)
      params.stylelint = rules
    }
    return loadStylelintExtendConfig(params, stylelint.config, searchPath)
  })
}

module.exports = params
