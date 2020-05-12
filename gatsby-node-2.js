"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectWithoutPropertiesLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutPropertiesLoose"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

const _require = require(`gatsby-source-filesystem`),
      createRemoteFileNode = _require.createRemoteFileNode;

const get = require('lodash/get');
 
exports.onCreateNode =
/*#__PURE__*/
function () {
  var _ref = (0, _asyncToGenerator2.default)(function* ({
    node, ///obecnie tworzony node
    actions, 
    store,
    cache,
    createNodeId
  }, options) {
    console.log('actions: ', actions)
    console.log('options: ', options)
    // console.log('options ', options)
    const createNode = actions.createNode;
    const nodeType = options.nodeType,
          imagePath = options.imagePath,
          _options$name = options.name,
          name = _options$name === void 0 ? 'localImage' : _options$name,
          _options$auth = options.auth,
          auth = _options$auth === void 0 ? {} : _options$auth,
          _options$ext = options.ext,
          ext = _options$ext === void 0 ? null : _options$ext,
          _options$prepareUrl = options.prepareUrl,
          prepareUrl = _options$prepareUrl === void 0 ? null : _options$prepareUrl;
          // prepareUrl = node.image;
    const createImageNodeOptions = {
      store,
      cache,
      createNode,
      createNodeId,
      auth,
      ext,
      name,
      prepareUrl
    };
    console.log('prepareUrl', prepareUrl, name)
    if (node.internal.type === nodeType) {
      console.log('Taaaaaaaaaaak!!!', node)
      // Check if any part of the path indicates the node is an array and splits at those indicators
      let imagePathSegments = [];

      if (imagePath.includes('[].')) {
        imagePathSegments = imagePath.split('[].');
      }
 
      if (imagePathSegments.length) {
        yield createImageNodesInArrays(imagePathSegments[0], node, Object.assign({
          imagePathSegments
        }, createImageNodeOptions));
      } else {
        const url = getPath(node, imagePath, ext);
        yield createImageNode(url, node, createImageNodeOptions);
      }
      console.log('sciezka-path: ', imagePath)
      console.log('node: ', node)
      console.log('opcjeGrafikia: ', createImageNodeOptions)
      console.log('sciezkaObrazu ', getPath(node, imagePath, ext))
    }
  });

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}(); // Returns value from path, adding extension when supplied


function getPath(node, path, ext = null) {
  const value = get(node, path);
  return ext ? value + ext : value;
} // Returns a unique cache key for a given node ID


function getCacheKeyForNodeId(nodeId) {
  return `gatsby-plugin-remote-images-${nodeId}`;
} // Creates a file node and associates the parent node to its new child


function createImageNode(_x3, _x4, _x5) {
  return _createImageNode.apply(this, arguments);
} // Recursively traverses objects/arrays at each path part, then operates on targeted leaf node


function _createImageNode() {
  console.log('robienie node obrazu', url)
  _createImageNode = (0, _asyncToGenerator2.default)(function* (url, node, options) {
    const name = options.name,
          imagePathSegments = options.imagePathSegments,
          prepareUrl = options.prepareUrl,
          restOfOptions = (0, _objectWithoutPropertiesLoose2.default)(options, ["name", "imagePathSegments", "prepareUrl"]);
    let fileNode;

    if (!url) {
      return;
    }

    if (typeof prepareUrl === 'function') {
      url = prepareUrl(url);
    }
    console.log('url zdjecia: ', url)
    try {
      console.log('url obrazu: ', url)
      fileNode = yield createRemoteFileNode(Object.assign({}, restOfOptions, {
        url,
        parentNodeId: node.id
      }));
      console.log9('fileNode ', fileNode)
    } catch (e) {
      console.error('gatsby-plugin-remote-images ERROR:', e);
    } // Store the mapping between the current node and the newly created File node


    if (fileNode) {
      // This associates the existing node (of user-specified type) with the new
      // File nodes created via createRemoteFileNode. The new File nodes will be
      // resolved dynamically through the Gatsby schema customization
      // createResolvers API and which File node gets resolved for each new field
      // on a given node of the user-specified type is determined by the contents
      // of this mapping. The keys are based on the ID of the parent node (of
      // user-specified type) and the values are each a nested mapping of the new
      // image File field name to the ID of the new File node.
      const cacheKey = getCacheKeyForNodeId(node.id);
      const existingFileNodeMap = yield options.cache.get(cacheKey);
      yield options.cache.set(cacheKey, Object.assign({}, existingFileNodeMap, {
        [name]: fileNode.id
      }));
    }
  });
  return _createImageNode.apply(this, arguments);
}

function createImageNodesInArrays(_x6, _x7, _x8) {
  return _createImageNodesInArrays.apply(this, arguments);
}

function _createImageNodesInArrays() {
  _createImageNodesInArrays = (0, _asyncToGenerator2.default)(function* (path, node, options) {
    if (!path || !node) {
      return;
    }

    const imagePathSegments = options.imagePathSegments,
          ext = options.ext;
    const pathIndex = imagePathSegments.indexOf(path),
          isPathToLeafProperty = pathIndex === imagePathSegments.length - 1,
          nextValue = getPath(node, path, isPathToLeafProperty ? ext : null); // grab the parent of the leaf property, if it's not the current value of `node` already
    // ex: `parentNode` in `myNodes[].parentNode.leafProperty`

    let nextNode = node;

    if (isPathToLeafProperty && path.includes('.')) {
      const pathToLastParent = path.split('.').slice(0, -1).join('.');
      nextNode = get(node, pathToLastParent);
    }

    return Array.isArray(nextValue) ? // Recursively call function with next path segment for each array element
    Promise.all(nextValue.map(item => createImageNodesInArrays(imagePathSegments[pathIndex + 1], item, options))) : // otherwise, handle leaf node
    createImageNode(nextValue, nextNode, options);
  });
  return _createImageNodesInArrays.apply(this, arguments);
}

exports.createResolvers = ({
  cache,
  createResolvers
}, options) => {
  const nodeType = options.nodeType,
        _options$name2 = options.name,
        name = _options$name2 === void 0 ? 'localImage' : _options$name2;
  const resolvers = {
    [nodeType]: {
      [name]: {
        type: 'File',
        resolve: function () {
          var _resolve = (0, _asyncToGenerator2.default)(function* (source, _, context) {
            const fileNodeMap = yield cache.get(getCacheKeyForNodeId(source.id));
            return context.nodeModel.getNodeById({
              id: fileNodeMap[name]
            });
          });

          function resolve(_x9, _x10, _x11) {
            return _resolve.apply(this, arguments);
          }
          return resolve;
        }()
      }
    }
  };
  createResolvers(resolvers);
};