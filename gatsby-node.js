const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const get = require('lodash/get');
const crypto = require(`crypto`)
exports.onCreateNode = async (
  { node,getNode, actions, store, cache, createNodeId },
  options
) => {
    // console.log('obecny węzeł-0: ', node.internal.type)
    // console.log('obecny węzeł: ', options, node)
    // console.log('PMcache: ', store)
    const { createNode, createParentChildLink } = actions;
    if(node.internal.type == 'StrapiArticleAuthorsNodes'){
        createParentChildLink({ parent: getNode(node.parent), child: node })
        // console.log('gowienko', node)
    }
    if(node.internal.type == 'StrapiArticleReviewersNodes'){
        // console.log('wezeł z reviewers nodes: ', node)
        createParentChildLink({ parent: getNode(node.parent), child: node })
        // console.log('gowienko', node)
    }
    if(node.internal.type == 'StrapiArticle'){
        // createParentChildLink({ parent: node, child: authorsNode })
        // console.log('wezeł z if child node: ', authorsNode)
        let authorsIds = node.authors.map(  (el, index) => {
            return node.id + 'authors_node_' + index;
        })
        ///authors nodes
        node.authors.map((el, index) => {
            createNode({
                ...el,
                id: node.id + 'authors_node_' + index,
                parent: node.id + 'authors_node',
                internal: {
                    contentDigest: crypto
                    .createHash(`md5`)
                    .update(JSON.stringify(el))
                    .digest(`hex`),
                    type: `StrapiArticleAuthorsNode`,
                }
            })
            
        })
        // console.log('authors ids: ', authorsIds)
        const authorsNode = await createNode({
            id: node.id + 'authors_node',
            parent: node.id,
            children: authorsIds,
            internal: {
                contentDigest: crypto
                .createHash(`md5`)
                .update(JSON.stringify(node.authors))
                .digest(`hex`),
                type: `StrapiArticleAuthorsNodes`,
            }
        })

        let reviewersIds = node.reviewers.map(  (el, index) => {
            return node.id + 'reviewers_node_' + index;
        })
        ///reviewers nodes
        node.reviewers.map((el, index) => {
            createNode({
                ...el,
                id: node.id + 'reviewers_node_' + index,
                parent: node.id + 'reviewers_node',
                internal: {
                    contentDigest: crypto
                    .createHash(`md5`)
                    .update(JSON.stringify(el))
                    .digest(`hex`),
                    type: `StrapiArticleReviewersNode`,
                }
            })
            
        })
        // console.log('Reviewers ids: ', ReviewersIds)
        const reviewersNode = await createNode({
            id: node.id + 'reviewers_node',
            parent: node.id,
            children: reviewersIds,
            internal: {
                contentDigest: crypto
                .createHash(`md5`)
                .update(JSON.stringify(node.reviewers))
                .digest(`hex`),
                type: `StrapiArticleReviewersNodes`,
            }
        })
    }
    const {
    nodeType,
    imagePath,
    name = 'localImage',
    auth = {},
    ext = null,
    prepareUrl = null,
  } = options;
  const createImageNodeOptions = {
    store,
    cache,
    createNode,
    createNodeId,
    auth,
    ext,
    name,
    prepareUrl,
  };

  if (node.internal.type === nodeType) {
    //   console.log('yeees')
    // Check if any part of the path indicates the node is an array and splits at those indicators
    let imagePathSegments = [];
    if (imagePath.includes('[].')) {
      imagePathSegments = imagePath.split('[].');
    }
    if (imagePathSegments.length) {
        ///array nodes
      await createImageNodesInArrays(imagePathSegments[0], node, {
        imagePathSegments,
        ...createImageNodeOptions,
      });
    } else {
      const url = getPath(node, imagePath, ext);
    //   console.log('drugie url: ', url)
     
      await createImageNode(url, node, createImageNodeOptions);
    }

    // console.log('node: ', node)
    // console.log('opcjeGrafikia: ', createImageNodeOptions)
    // console.log('sciezkaObrazu ', getPath(node, imagePath, ext))
  }
};

// Returns value from path, adding extension when supplied
function getPath(node, path, ext = null) {
  const value = get(node, path);

  return ext ? value + ext : value;
}

// Returns a unique cache key for a given node ID
function getCacheKeyForNodeId(nodeId) {
  return `gatsby-plugin-remote-images-${nodeId}`;
}

// Creates a file node and associates the parent node to its new child
async function createImageNode(url, node, options) {
    // console.log('tworzenie wezła: ', node, url)
  const { name, imagePathSegments, prepareUrl, ...restOfOptions } = options;
  let fileNode;
  if( !url ){
      url = 'https://res.cloudinary.com/authoritydental/image/upload/v1589238983/placeholder.png'
  }
console.log('url zdjecia: ', url)
  if (!url) {
    return;
  }

  if (typeof prepareUrl === 'function') {
    url = prepareUrl(url);
  }
  try {
    fileNode = await createRemoteFileNode({
      ...restOfOptions,
      url,
      parentNodeId: node.id,
    });
  } catch (e) {
    console.error('gatsby-plugin-remote-images ERROR:', e);
  }

  // Store the mapping between the current node and the newly created File node
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
    const existingFileNodeMap = await options.cache.get(cacheKey);
    await options.cache.set(cacheKey, {
      ...existingFileNodeMap,
      [name]: fileNode.id,
    });
  }
}

// Recursively traverses objects/arrays at each path part, then operates on targeted leaf node
async function createImageNodesInArrays(path, node, options) {
    // console.log('tworzenie wezlow z tablicy', path, node)
    // console.log('tworzenie wezlow z tablicy-options', options)
  if (!path || !node) {
    return;
  }
  const { imagePathSegments, ext } = options;
  const pathIndex = imagePathSegments.indexOf(path),
    isPathToLeafProperty = pathIndex === imagePathSegments.length - 1,
    nextValue = getPath(node, path, isPathToLeafProperty ? ext : null);

  // grab the parent of the leaf property, if it's not the current value of `node` already
  // ex: `parentNode` in `myNodes[].parentNode.leafProperty`
  let nextNode = node;
  if (isPathToLeafProperty && path.includes('.')) {
    const pathToLastParent = path
      .split('.')
      .slice(0, -1)
      .join('.');
    nextNode = get(node, pathToLastParent);
  }
  return Array.isArray(nextValue)
    ? // Recursively call function with next path segment for each array element
      Promise.all(
        nextValue.map(item =>
          createImageNodesInArrays(
            imagePathSegments[pathIndex + 1],
            item,
            options
          )
        )
      )
    : // otherwise, handle leaf node
      createImageNode(nextValue, nextNode, options);
}

exports.createResolvers = ({ cache, createResolvers }, options) => {
    // console.log('kolejny resolver')
  const { nodeType, name = 'localImage' } = options;

  const resolvers = {
    [nodeType]: {
      [name]: {
        type: 'File',
        resolve: async (source, _, context) => {
          const fileNodeMap = await cache.get(getCacheKeyForNodeId(source.id));
          return context.nodeModel.getNodeById({ id: fileNodeMap[name] });
        },
      },
    },
  };

  createResolvers(resolvers);
};