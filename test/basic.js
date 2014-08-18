var lib    = require('./lib'),
    mocha  = require('mocha'),
    should = require('should');

describe('basic functionality', function() {
    var wiki;

    before(function() {
        wiki = lib.newMediaWiki();
    });

    it('should get page content', function(done) {
        wiki.getPageContent(lib.pages.user, function(body) {
            body.should.match(/Test user for \[.* <code>node-mediawiki<\/code> project\]/);
            done();
        });
    });

    it('should set page content', function(done) {
        this.timeout(10000);

        wiki.getPageContent(lib.pages.sandbox, function(body) {
            body.should.match(/{{User sandbox}}/);

            var rand  = lib.randomBytes(),
                edit  = '\n\ntest:' + rand + ' --~~~~',
                match = new RegExp('test:' + rand + ' --\\[\\[Special:Contributions/[0-9.]+\\|');

            wiki.setPageContent(lib.pages.sandbox, body + edit, {
                ignoreEditConflicts : true
            }, function(result) {
                result.should.have.property('edit');
                result.edit.should.have.property('result', 'Success');
                result.edit.should.have.property('title' , lib.pages.sandbox);

                wiki.getPageContent(lib.pages.sandbox, function(body) {
                    body.should.match(match);
                    done();
                });
            });
        });
    });

    it('should fail to get non-existent pages', function(done) {
        var rand = lib.randomBytes();

        wiki = lib.newMediaWiki(exports.endpoint, function(err, data) {
            err.message.should.equal('HTTP 404 Not Found');
            data.should.equal('');
            done();
        });

        wiki.getPageContent(rand, function(body) {
            throw new Error('This callback should never be called');
        });
    });
});
