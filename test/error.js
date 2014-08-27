var lib    = require('./lib'),
    mocha  = require('mocha'),
    should = require('should');

describe('error handling', function() {
    var wiki;

    before(function() {
        wiki = lib.newMediaWiki();
    });

    it('should report unexpected query results', function(done) {
        wiki._query('revisions', {
            prop   : 'revisions',
            rvprop : 'content|timestamp|comment|user|ids',
            revids : 1000
        }, function(err, rev) {
            should.exist(err);
            err.message.should.equal("Expected property 'revisions' in query result but found [ 'pages' ]");
            err.data.query.pages.should.have.property('36500');
            done();
        });
    });
});
