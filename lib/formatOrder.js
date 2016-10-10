var sorting = require('postcss-sorting')
var alphabeticalSortingConfig = require('postcss-sorting/configs/alphabetical.json')

function formatOrder (root, params) {
  var propertiesOrders = params.stylelint['declaration-block-properties-order']
  switch (true) {
    case Array.isArray(propertiesOrders):
      // If the sylelint array configuration style is used, the sort order is the
      // first item in the list.
      if (Array.isArray(propertiesOrders[0])) {
        sortBySpecifiedPropertyNames(root, propertiesOrders[0])
        break;
      }
      sortBySpecifiedPropertyNames(root, propertiesOrders)
      break;
    case /alphabetical/.test(propertiesOrders):
      sortByAlphabetical(root)
      break;
  }
}

function sortByAlphabetical(root) {
  sorting(alphabeticalSortingConfig)(root)
}

function sortBySpecifiedPropertyNames(root, propertiesOrders) {
  // sort order can contain groups, so it needs to be flat for postcss-sorting
  var flattenedSortOrder = propertiesOrders.reduce(function (merged, item) {
    if (typeof item !== 'string' && typeof item !== 'object') {
      return merged;
    }
    if (Array.isArray(item.properties)) {
      return merged.concat(item.properties)
    }
    return merged.concat(item)
  }, [])

  var sort = sorting({
    'sort-order': flattenedSortOrder
  })
  sort(root)
}

module.exports = formatOrder
