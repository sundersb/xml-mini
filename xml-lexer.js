'use strict';

/**
 * @typedef {object} Attribute
 * @property {string} namespace Full namespace
 * @property {string} name Actual name
 * @property {string} key Name prefixed with namespace alias i.e. "ns:attribute"
 */

function makeNode(allSpaces, parentSpaces, defaultNamespace, parsed) {
    if (typeof parsed == 'string') {
        return new Text(parsed);
    } else {
        return new Node(allSpaces, parentSpaces, defaultNamespace, parsed);
    }
}

const digits = 'abcdefghijklmnopqrstuvwxyz';

const digitsLength = digits.length;

function getAbcNumber(value) {
    if (value) {
        const result = [];

        while (value) {
            result.push(value % digitsLength);
            value = Math.trunc(value / digitsLength);
        }

        return result.reverse().map(i => digits[i]).join('');
    } else {
        return digits[0];
    }
}

function getNameAndNamespace(name) {
    const data = name.split(':');

    const result = data[1]
        ? { name: data[1], alias: data[0] }
        : { name: data[0], alias: '' };
    
    if (result.alias == 'xmlns') {
        const { name, alias } = result;
        result.name = alias;
        result.alias = name;
    }
    
    return result;
}

function getFullName(allSpaces, nodeSpaces, defaultNamespace, nodeName) {
    const { name, alias } = getNameAndNamespace(nodeName);
    
    return {
        name,
        alias: allSpaces.getAlias(nodeSpaces[alias] || defaultNamespace),
    };
}

/**
 * @typedef {object} RawAttribute
 * @property {string} name 
 * @property {string} value 
 * 
 * @typedef {object} Attribute
 * @property {string} [alias] 
 * @property {string} name 
 * @property {string} value 
 * 
 * @typedef {object} Namespace
 * @property {string} alias 
 * @property {string} value 
 */

/**
 * 
 * @param {RawAttribute[]} attributes 
 * @returns {{ attributes: Attribute[], namespaces: Attribute[]}}
 */
function partitionAttributes(attributes) {
    const result = {
        attributes: [],
        namespaces: [],
    };

    const getTarget = item => item.name == 'xmlns'
        ? result.namespaces
        : result.attributes;

    const addItem = item => getTarget(item).push(item);

    attributes
        .map(({ name, value }) => Object.assign(getNameAndNamespace(name), { value }))
        .forEach(addItem);

    return result;
}

function getDefaultNamespace(nodeName, namespaces, defaultNamespace) {
    const parts = nodeName.split(':');

    const alias = parts[1] ? parts[0] : '';

    return namespaces[alias] || defaultNamespace;
}

function Spaces() {
    this.aliases = {};
    this.size = 0;

    this.getAlias = namespace => {
        if ([undefined, null].includes(namespace)) {
            namespace = '';
        }

        let result = this.aliases[namespace];

        if (!result) {
            result = getAbcNumber(this.size);
            this.aliases[namespace] = result;
            ++this.size;
        }
        
        return result;
    };

}

function Text(text) {
    this.text = text ? text.trim() : '';
}

function Node(allSpaces, parentSpaces, defaultNamespace, parsed) {
    const { namespaces, attributes } = partitionAttributes(parsed?.attributes || []);

    const thisSpaces = {};

    if (parentSpaces) {
        Object.assign(thisSpaces, parentSpaces);
    }

    Object.assign(
        thisSpaces,
        Object.fromEntries(namespaces.map(({ alias, value }) => ([alias, value])))
    );

    Object.values(thisSpaces).forEach(allSpaces.getAlias);

    defaultNamespace = getDefaultNamespace(parsed.name, thisSpaces, defaultNamespace);

    const { name, alias } = getFullName(allSpaces, thisSpaces, defaultNamespace, parsed.name);

    this.name = name;

    this.key = `${alias}:${name}`;

    const getNameKey = (name, alias) => {
        if (alias) {
            const ns = thisSpaces[alias];
            const a = allSpaces.getAlias(ns);
            return `${a}:${name}`;
        } else {
            return name;
        }
    };

    this.attributes = attributes.map(a => ({
        name: a.name,
        key: getNameKey(a.name, a.alias),
        value: a.value,
    }));

    this.nodes = Array.isArray(parsed.children)
        ? parsed.children.map(p => makeNode(allSpaces, thisSpaces, defaultNamespace, p))
        : [];
}

function compile(raw) {
    const allSpaces = new Spaces();

    const xml = makeNode(allSpaces, {}, undefined, raw);

    return { names: allSpaces, xml };
}

module.exports = {
    compile,
};
