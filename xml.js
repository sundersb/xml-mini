'use strict';

const Parser = require('@sundersb/parser-mini');

const isSpace = c => '\r\n\t '.includes(c);

const isWord = c => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:_-'.includes(c);

const join = cs => cs.join('');

const skipSpacesParser = Parser.sat(isSpace).many();

const quotedParser = Parser.quoted('"');

const nameParser = Parser.sat(isWord).many(1).fmap(join);

const lessParser = Parser.char('<');

const moreParser = Parser.char('>');

const slashParser = Parser.char('/');

const attributeParser = nameParser.save('name')
    .pass(skipSpacesParser)
    .pass(Parser.char('='))
    .pass(skipSpacesParser)
    .bind(quotedParser.save('value'))
    .pass(skipSpacesParser)
    .fmap(({ name, value }) => ({ name, value }));

const openNodeParser = lessParser
    .pass(skipSpacesParser)
    .seq(nameParser.save('name'))
    .pass(skipSpacesParser)
    .bind(attributeParser.many().save('attributes'))
    .bind(slashParser.default('').fmap(c => c == '/').save('closed'))
    .pass(skipSpacesParser)
    .pass(moreParser)
    .fmap(({ name, attributes, closed }) => ({ name, attributes, closed }));

const closeNodeParser = lessParser
    .pass(skipSpacesParser)
    .pass(slashParser)
    .pass(skipSpacesParser)
    .seq(nameParser.save('closeName'))
    .pass(skipSpacesParser)
    .pass(moreParser);

const closingMatches = ({ name, closeName }) => name == closeName;

const isNodeProperlyClosedParser = new Parser(input => {
    const parsed = input?.parsed;

    if (parsed) {
        if (parsed.closed || closingMatches(parsed)) {
            return input;
        }
    }
});

const isSelfClosingNodeParser = new Parser(input => {
    if (input?.parsed?.closed) {
        return input;
    }
});

const textParser = new Parser(input => {
    const rest = input.rest;

    if (rest) {
        const lessPosition = rest.indexOf('<');

        if (lessPosition > 0) {
            return {
                parsed: rest.slice(0, lessPosition),
                rest: rest.slice(lessPosition),
            };
        } else if (lessPosition < 0) {
            return {
                parsed: rest,
                rest: '',
            };
        }
    }
});

const notEmptyNodeParser = textParser.or(getFullNodeParser())
    .many().save('children')
    .bind(closeNodeParser);

const fullNodeParser = openNodeParser
    .bind(isSelfClosingNodeParser.or(notEmptyNodeParser))
    .bind(isNodeProperlyClosedParser);

function getFullNodeParser() {
    // Dereferencing fullNodeParser in parse-time instead of build-time
    // to avoid "use before initialization" error
    return new Parser(input => fullNodeParser._parse(input));
}

function parseString(text) {
    const doctypeParser = skipSpacesParser
        .pass(lessParser)
        .pass(Parser.char('?'))
        .pass(Parser.item().many(0, 0, text => text.startsWith('?>')))
        .pass(Parser.string('?>'))
        .pass(skipSpacesParser);
    
    const xmlParser = doctypeParser.default('').seq(fullNodeParser);

    const result = xmlParser.parseText(text);

    if (result) {
        return require('./xml-lexer').compile(result.parsed);
    }
}

module.exports = {
    parseString,

    openNodeParser,
    attributeParser,
    closeNodeParser,
    textParser,
    isSelfClosingNodeParser,
    closingMatchesParser: isNodeProperlyClosedParser,

    notEmptyNodeParser,
    fullNodeParser,
};
