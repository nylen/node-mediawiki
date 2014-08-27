var lib    = require('./lib'),
    mocha  = require('mocha'),
    should = require('should');

describe('revisions API', function() {
    var wiki;

    before(function() {
        wiki = lib.newMediaWiki();
    });

    it('should get the last revision', function(done) {
        wiki.getLastRevision(function(rev) {
            rev.should.have.property('revid');
            rev.should.have.property('old_revid');
            rev.revid.should.be.above(rev.old_revid);
            rev.should.have.property('pageid');
            rev.pageid.should.be.above(0);
            done();
        });
    });

    it('should get revision content', function(done) {
        wiki.getLastRevision(function(rev) {
            wiki.getRevision(rev.revid, function(rev) {
                rev.should.have.property('pageid');
                rev.pageid.should.be.above(0);
                rev.should.have.property('revisions').with.length(1);
                rev.revisions[0].should.have.property('*');
                rev.revisions[0]['*'].length.should.be.above(1);
                done();
            });
        });
    });
});
