var postcss = require('postcss');
var nested  = require('../');
var expect  = require('chai').expect;

require('source-map-support').install();

var check = function (input, output, opts) {
    let outputLines = output.split('\n');
    let mainLine = outputLines[1];
    let sep = '';
    let i = 0;
    while (mainLine[i++] === ' ') { sep += ' ' };

    outputLines = outputLines.map(line => line.replace(sep, ''));
    output = outputLines.join('\n').trim();

    var processor = postcss([ nested(opts) ])
    expect( processor.process(input).css.trim() ).to.equal(output);
};

describe('postcss-nested', function () {

    it('block', function () {
        check(
            `
            @block block {
                width: 0
            }
            `,
            `
            .block {
                width: 0
            }
            `
        );
    });

    it('block with el', function () {
        check(
            `
            @block block {
                width: 0;
                __el { width: 0 }
            }
            `,
            `
            .block {
                width: 0
            }
            .block__el {
                width: 0
            }
            `
        );
    });

    it('block with mod', function () {
        check(
            `
            @block block {
                width: 0;
                _active { width: 100px }
            }
            `,
            `
            .block {
                width: 0
            }
            .block_active {
                width: 100px
            }
            `
        );
    });

    it('block with mod and el', function () {
        check(
            `
            @block block {
                __el { width: 0; }
                _active {
                    __el { width: 100px; }
                }
            }
            `,
            `
            .block__el {
                width: 0;
            }
            .block_active .block__el {
                width: 100px;
            }
            `
        );
    });

    it('block with el with mod', function () {
        check(
            `
            @block block {
                __el {
                    width: 0;
                    _active {
                        width: 100px;
                    }
                }
            }
            `,
            `
            .block__el {
                width: 0
            }
            .block__el_active {
                width: 100px;
            }
            `
        );
    });

    it('block with mod with el with mod', function () {
        check(
            `
            @block block {
                __el {
                    width: 0;
                    _active {
                        width: 100px;
                    }
                }
                _active {
                    __el {
                        _active {
                            width: 200px;
                        }
                    }
                }
            }
            `,
            `
            .block__el {
                width: 0
            }
            .block__el_active {
                width: 100px;
            }
            .block_active .block__el_active {
                width: 200px;
            }
            `
        );
    });

    it('block with comma selectors', function () {
        check(
            `
            @block block {
                __el,
                __el2 {
                    width: 0;
                    _active,
                    _active2 {
                        width: 100px;
                    }
                }
                _active,
                _active2 {
                    __el,
                    __el2,
                    _super {
                        _active,
                        _active2 {
                            width: 200px;
                        }
                    }
                }
            }
            `,
            `
            .block__el,
                            .block__el2 {
                width: 0
            }
            .block__el_active,
                                .block__el_active2,
                                .block__el2_active,
                                .block__el2_active2 {
                width: 100px;
            }
            .block_active .block__el_active,
                                    .block_active .block__el_active2,
                                    .block_active .block__el2_active,
                                    .block_active .block__el2_active2,
                                    .block_active.block_super.block_active,
                                    .block_active.block_super.block_active2,
                                    .block_active2 .block__el_active,
                                    .block_active2 .block__el_active2,
                                    .block_active2 .block__el2_active,
                                    .block_active2 .block__el2_active2,
                                    .block_active2.block_super.block_active,
                                    .block_active2.block_super.block_active2 {
                width: 200px;
            }
            `
        );
    });

});
