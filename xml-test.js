'use strict';

const { expect } = require('chai');
const testee = require('./xml');

describe('XML', () => {
    it('Attribute parser', () => {
        const tests = [
            {
                input: 'name="value"',
                parsed: { name: 'name', value: 'value' },
                rest: '',
            },
            {
                input: 'name="value with space"',
                parsed: { name: 'name', value: 'value with space' },
                rest: '',
            },
            {
                input: 'name = "value" rest',
                parsed: { name: 'name', value: 'value' },
                rest: 'rest',
            },
            {
                input: 'wrong|char="value"',
                parsed: undefined
            },
            {
                input: 'name=no opening quote',
                parsed: undefined
            },
            {
                input: 'name="no closing quote',
                parsed: undefined
            }
        ];

        for (const { input, parsed, rest } of tests) {
            const actual = testee.attributeParser.parseText(input);

            if (parsed) {
                expect(actual).to.deep.equal({ parsed: parsed, rest });
            } else {
                expect(actual).to.be.undefined;
            }
        }
    });

    it('Open node parser', () => {
        const tests = [
            {
                input: '<node>',
                parsed: { name: 'node', attributes: [], closed: false },
                rest: ''
            },
            {
                input: '<node attr="value">',
                parsed: { name: 'node', attributes: [{ name: 'attr', value: 'value' }], closed: false },
                rest: ''
            },
            {
                input: '<node attr="value"/>',
                parsed: { name: 'node', attributes: [{ name: 'attr', value: 'value' }], closed: true },
                rest: ''
            },
            {
                input: '<node one="1" two="2"/>',
                parsed: {
                    name: 'node',
                    attributes: [
                        { name: 'one', value: '1' },
                        { name: 'two', value: '2' },
                    ],
                    closed: true
                },
                rest: ''
            },
            {
                input: '<node    attr   =   "value"   /   >',
                parsed: { name: 'node', attributes: [{ name: 'attr', value: 'value' }], closed: true },
                rest: ''
            },
            {
                input: '<node',
                parsed: undefined
            },
            {
                input: '<wrong|char>',
                parsed: undefined
            },
        ];

        for (const { input, parsed, rest } of tests) {
            const actual = testee.openNodeParser.parseText(input);

            if (parsed) {
                expect(actual).to.deep.equal({ parsed, rest });
            } else {
                expect(actual).to.be.undefined;
            }
        }
    });

    it('Text parser', () => {
        const tests = [
            {
                input: 'text',
                parsed: 'text',
                rest: ''
            },
            {
                input: 'text<',
                parsed: 'text',
                rest: '<'
            },
            {
                input: 'text<node',
                parsed: 'text',
                rest: '<node'
            },
            {
                input: '<node',
                parsed: undefined
            },
            {
                input: '',
                parsed: undefined
            },
        ];

        for (const { input, parsed, rest } of tests) {
            const actual = testee.textParser.parseText(input);

            if (parsed) {
                expect(actual?.parsed).to.equal(parsed);
                expect(actual?.rest).to.equal(rest);
            } else {
                expect(actual).to.be.undefined;
            }
        }
    });

    it('Close node parser', () => {
        const tests = [
            {
                input: '</node>',
                parsed: { closeName: 'node' },
                rest: ''
            },
            {
                input: '</node>rest',
                parsed: { closeName: 'node' },
                rest: 'rest'
            },
            {
                input: '<    /    node    >rest',
                parsed: { closeName: 'node' },
                rest: 'rest'
            },
        ];

        for (const { input, parsed, rest } of tests) {
            const actual = testee.closeNodeParser.parseText(input);

            if (parsed) {
                expect(actual).to.deep.equal({ parsed, rest });
            } else {
                expect(actual).to.be.undefined;
            }
        }
    });

    it('Self closing node parser', () => {
        const tests = [
            {
                input: { name: 'node', closed: false },
                parsed: undefined
            },
            {
                input: { name: 'node', closed: true },
                parsed: { name: 'node', closed: true }
            }
        ];

        for (const { input, parsed } of tests) {
            const actual = testee.isSelfClosingNodeParser._parse({ parsed: input, rest: '' });

            if (parsed) {
                expect(actual).to.deep.equal({ parsed, rest: '' });
            } else {
                expect(actual).to.be.undefined;
            }
        }
    });

    it('Node closing check parser', () => {
        const tests = [
            {
                input: { name: 'test', closeName: 'test' },
                parsed: { name: 'test', closeName: 'test' },
            },
            {
                input: { name: 'test', closeName: 'notTest' },
                parsed: undefined,
            },
            {
                input: { name: undefined, closeName: 'anything' },
                parsed: undefined,
            }
        ];

        for (const { input, parsed } of tests) {
            const actual = testee.closingMatchesParser._parse({ parsed: input, rest: '' });

            if (parsed) {
                expect(actual).to.deep.equal({ parsed, rest: '' });
            } else {
                expect(actual).to.be.undefined;
            }
        }
    });

    it('Non empty node content parser', () => {
        const parsed = { name: 'test' };
        const rest = 'text content <node>node content</node> text </test>rest';

        const expected = {
            parsed: {
                children: [
                    'text content ',
                    { name: 'node', attributes: [], children: ['node content'], closeName: 'node', closed: false },
                    ' text '
                ],
                closeName: 'test'
            },
            rest: 'rest'
        };
        const actual = testee.notEmptyNodeParser._parse({ parsed, rest });

        expect(actual).to.deep.equal(expected);
    });

    it('Full node parser', () => {
        const xml = `<root attr="attr value">
    Some text
    <self attr="self attribute"/>
    <enclosed attr="enclosed attribute">
        Enclosed text
        <innermost/>
    </enclosed>
    the rest of root
</root>
`;
        const actual = testee.fullNodeParser.parseText(xml);

        const expected = {
            parsed: {
                name: 'root',
                attributes: [
                    { name: 'attr', value: 'attr value' }
                ],
                closed: false,
                children: [
                    '\n    Some text\n    ',
                    {
                        name: 'self',
                        attributes: [
                            { name: 'attr', value: 'self attribute' }
                        ],
                        closed: true
                    },
                    '\n    ',
                    {
                        name: 'enclosed',
                        attributes: [
                            {
                                name: 'attr',
                                value: 'enclosed attribute'
                            }
                        ],
                        closed: false,
                        children: [
                            '\n        Enclosed text\n        ',
                            { name: 'innermost', attributes: [], closed: true },
                            '\n    '
                        ],
                        closeName: 'enclosed'
                    },
                    '\n    the rest of root\n'
                ],
                closeName: 'root'
            },
            rest: '\n'
        };

        expect(actual).to.deep.equal(expected);
    });

    it('Parse XML', () => {
        const xml = `<root attr="attr value" xmlns="root-space">
    Some text
    <self attr="self attribute"/>
    <enc:enclosed enc:attr="enclosed attribute" xmlns:enc="enclosed-space">
        Enclosed text
        <enc:innermost/>
    </enc:enclosed>
    the rest of root
</root>
`;
        const result = testee.parseString(xml);

        console.log(JSON.stringify(result));
    });
});
