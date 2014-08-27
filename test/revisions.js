var lib    = require('./lib'),
    mocha  = require('mocha'),
    should = require('should');

describe('revisions API', function() {
    var wiki;

    before(function() {
        wiki = lib.newMediaWiki();
    });

    it('should get the last revision', function(done) {
        wiki.getLastRevision(function(err, props) {
            should.not.exist(err);
            props.should.have.property('revid');
            props.should.have.property('old_revid');
            props.revid.should.be.above(props.old_revid);
            props.should.have.property('pageid');
            props.pageid.should.be.above(0);
            done();
        });
    });

    it('should get revision content', function(done) {
        wiki.getLastRevision(function(err, props) {
            should.not.exist(err);
            wiki.getRevision(props.revid, function(err, rev) {
                should.not.exist(err);
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
