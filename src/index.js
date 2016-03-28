let postcss = require('postcss');

const BEM = {
    el: '__',
    mod: '_'
};

function nestingChainIterator(nesting, callback, chain = []) {
    let level = nesting[0];
    if (!level) {
        callback(chain);
    } else {
        let nextLevels = nesting.slice(1);
        level.forEach(selector => {
            nestingChainIterator(nextLevels, callback, chain.concat(selector));
        });
    }
}

function combine(nesting, selectors) {
    let result = [];

    nestingChainIterator(nesting.concat([ selectors ]), chain => {
        console.log('chain', chain);
        result.push(processChain(chain));
    });

    return result;
}

function isBlock(chainEl) {
    return chainEl[0] !== '_';
}

function isElement(chainEl) {
    return chainEl[0] === '_' && chainEl[1] === '_';
}

function isMod(chainEl) {
    return chainEl[0] === '_' && chainEl[1] !== '_';
}

function processChain(chain) {
    let selector = '';
    let block = '';
    let prev = '';

    for (let i = 0; i < chain.length; i++) {
        let current = chain[i];

        if (isBlock(current)) {
            block = current;
            let j = i;
            let next = null;
            while (next = chain[++j], next && isMod(next)) {
                selector += `.${block}${next}`
            }

            if (j - i !== 1) {
                if (chain[j]) {
                    selector += ' ';
                }
            }

            i = j - 1;
        }

        if (isElement(current)) {
            let j = i;
            let next = null;

            while (next = chain[++j], next && isMod(next)) {
                selector += `.${block}${current}${next}`
            }

            if (j - i == 1) {
                selector += `.${block}${current}`;
                if (chain[i + 1]) {
                    selector += ' '
                }
            }

            i = j - 1;
        }
    }

    return selector;
}

function processBlock(atrule, bubble, root) {
    let classRule = postcss.rule({
        selector: `.${atrule.name}`,
        selectors: [`.${atrule.name}`],
        parent: atrule.parent,
        nodes: atrule.nodes
    });

    let ctx = {
        bubble,
        root,
        nesting: [[ atrule.name ]]
    };

    let nodes = classRule.nodes.slice();
    nodes.forEach(child => {
        if (child.type === 'rule') {
            processRule(child, ctx);
        }
    });

    if (classRule.nodes.length > 0) {
        atrule.replaceWith(classRule);
    } else {
        atrule.remove();
    }
}

function processRule(rule, ctx) {
    let selectors = rule.selectors;
    rule.selectors = combine(ctx.nesting, selectors);

    let newCtx = Object.assign({}, ctx, {
        nesting: ctx.nesting.concat([ selectors ])
    });

    rule.moveTo(ctx.root);

    rule.each(node => {
        if (node.type === 'rule') {
            processRule(node, newCtx);
        }
    });

    if (rule.nodes.length === 0) {
        rule.remove();
    }
}

function selectors(selectors, ctx) {
    return selectors.map(selector => iter(ctx, selector));
}

function pickComment(comment, after) {
    if (comment && comment.type === 'comment') {
        return comment.moveAfter(after);
    } else {
        return after;
    }
}

function atruleChilds(rule, atrule) {
    let children = [];
    atrule.each(child => {
        if (child.type === 'comment') {
            children.push( child );
        } if (child.type === 'decl') {
            children.push( child );
        } else if (child.type === 'rule') {
            child.selectors = selectors(rule, child);
        } else if (child.type === 'atrule') {
            atruleChilds(rule, child);
        }
    });
    if (children.length) {
        let clone = rule.clone({ nodes: [] });
        for (let i = 0; i < children.length; i++ ) children[i].moveTo(clone);
        atrule.prepend(clone);
    }
}

module.exports = postcss.plugin('postcss-bem-nesting', function (opts) {
    let bubble = ['media', 'supports', 'document'];
    if (opts && opts.bubble) {
        bubble = bubble.concat(opts.bubble.map(function (i) {
            return i.replace(/^@/, '');
        }));
    }

    let process = (node) => {
        node.each(child => {
            if (child.type === 'atrule' || child.name == 'block') {
                // process only @block atrule
                processBlock(child, bubble, node);
            }
        });
    };

    return process;
});
