var lib    = require('./lib'),
    mocha  = require('mocha'),
    should = require('should');

function runTests(desc, endpoint, matchAfterEdit, messages) {
    describe(desc, function() {
        var wiki;

        before(function() {
            wiki = lib.newMediaWiki(endpoint);
        });

        it('should get page content', function(done) {
            wiki.messages.should.eql([]);
            wiki.getPageContent(lib.pages.user, function(body) {
                body.should.match(/Test user for \[.* <code>node-mediawiki<\/code> project\]/);
                wiki.messages.should.eql(endpoint.username ? ['Logging in...', 'Logged in'] : []);
                done();
            });
        });

        it('should set page content', function(done) {
            this.timeout(10000);

            wiki.getPageContent(lib.pages.sandbox, function(body) {
                body.should.match(/{{User sandbox}}/);

                var rand  = lib.randomBytes(),
                    edit  = '\n\ntest:' + rand + ' --~~~~',
                    match = new RegExp(matchAfterEdit.replace('%r', rand));

                wiki.setPageContent(lib.pages.sandbox, body + edit, {
                    ignoreEditConflicts : true
                }, function(result) {
                    result.should.have.property('edit');
                    result.edit.should.have.property('result', 'Success');
                    result.edit.should.have.property('title' , lib.pages.sandbox);

                    wiki.getPageContent(lib.pages.sandbox, function(body) {
                        body.should.match(match);
                        wiki.messages.should.eql(endpoint.username ? ['Logging in...', 'Logged in'] : []);
                        done();
                    });
                });
            });
        });

        it('should fail to get non-existent pages', function(done) {
            var rand = lib.randomBytes();

            wiki = lib.newMediaWiki(endpoint, function(err, data) {
                err.message.should.equal('HTTP 404 Not Found');
                data.should.have.property('body');
                data.body.should.equal('');
                wiki.messages.should.eql(endpoint.username ? ['Logging in...', 'Logged in'] : []);
                done();
            });

            wiki.getPageContent(rand, function(body) {
                throw new Error('This callback should never be called');
            });
        });
    });
}

runTests('basic functionality', lib.endpoint,
    'test:%r --\\[\\[Special:Contributions/[0-9.]+\\|');

runTests('with login', lib.endpointWithLogin,
    'test:%r --\\[\\[User:Node-mw-test\\|');
