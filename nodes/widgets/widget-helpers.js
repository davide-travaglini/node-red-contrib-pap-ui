/**
 * Shared helpers for PAP widget nodes.
 * Resolution chain: widget → subgroup → group → page → server
 * Area is optional metadata on page — NOT a hop in the chain.
 */

function resolveServer (RED, config) {
    const subgroupNode = RED.nodes.getNode(config.subgroup)
    const groupNode    = subgroupNode && RED.nodes.getNode(subgroupNode.config && subgroupNode.config.group)
    const pageNode     = groupNode    && RED.nodes.getNode(groupNode.config    && groupNode.config.page)
    return pageNode    && RED.nodes.getNode(pageNode.config    && pageNode.config.server)
}

function resolveIds (RED, config) {
    const subgroupNode = RED.nodes.getNode(config.subgroup)
    const groupNode    = subgroupNode && RED.nodes.getNode(subgroupNode.config && subgroupNode.config.group)
    return {
        subgroupId: config.subgroup,
        groupId:    groupNode    ? subgroupNode.config.group : null,
        pageId:     groupNode    ? groupNode.config.page     : null
    }
}

/**
 * Defers widget registration to the next event-loop tick so all config nodes
 * are guaranteed to be created before we walk the chain.
 */
function deferInit (RED, node, config, fn) {
    setImmediate(() => {
        const server = resolveServer(RED, config)
        if (!server) {
            const subgroupNode = RED.nodes.getNode(config.subgroup)
            const groupNode    = subgroupNode && RED.nodes.getNode(subgroupNode.config && subgroupNode.config.group)
            const pageNode     = groupNode    && RED.nodes.getNode(groupNode.config    && groupNode.config.page)
            node.error(
                `${node.type}: cannot resolve server config node ` +
                `(subgroup:${config.subgroup || '?'} → ` +
                `subgroupNode:${subgroupNode ? '✓' : '✗'} → ` +
                `groupNode:${groupNode ? '✓' : '✗'} → ` +
                `pageNode:${pageNode ? '✓' : '✗'} → ` +
                `server:✗)`
            )
            node.status({ fill: 'red', shape: 'ring', text: 'no server' })
            return
        }
        fn(server, resolveIds(RED, config))
    })
}

module.exports = { resolveServer, resolveIds, deferInit }
