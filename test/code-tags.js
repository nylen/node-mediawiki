var mocha  = require('mocha'),
    should = require('should'),
    utils  = require('../lib/utils');

describe('backticks to code tags', function() {
    it('should not change normal strings', function() {
        var text = 'this is a normal string with no backticks';
        utils.wikifyCodeTags(text).should.equal(text);
    });

    it('should replace backticks at end of string', function() {
        utils.wikifyCodeTags(
            'this string has `backticks at the end`').should.equal(
            'this string has <code>backticks at the end</code>');
    });

    it('should replace backticks at beginning of string', function() {
        utils.wikifyCodeTags(
            '`a string` with backticks at the beginning').should.equal(
            '<code>a string</code> with backticks at the beginning');
    });

    it('should replace multiple pairs of backticks', function() {
        utils.wikifyCodeTags(
            '`multiple pairs` of `backticks`').should.equal(
            '<code>multiple pairs</code> of <code>backticks</code>');
    });
});
