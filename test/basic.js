var lib    = require('./lib'),
    mocha  = require('mocha'),
    should = require('should');

function runTests(desc, endpoint, matchAfterEdit, messages) {
    describe(desc, function() {
        var wiki;

        function testWikiMessages() {
            wiki.messages.should.eql(endpoint.username ? ['Logging in...', 'Logged in'] : []);
        }

        before(function() {
            wiki = lib.newMediaWiki(endpoint);
        });

        it('should get page content', function(done) {
            this.timeout(5000);

            wiki.messages.should.eql([]);
            wiki.getPageContent(lib.pages.user, function(err, body) {
                should.not.exist(err);
                body.should.match(/Test user for \[.* <code>node-mediawiki<\/code> project\]/);
                testWikiMessages();
                done();
            });
        });

        it('should set page content', function(done) {
            this.timeout(10000);

            wiki.getPageContent(lib.pages.sandbox, function(err, body) {
                should.not.exist(err);
                body.should.match(/{{User sandbox}}/);

                var rand  = lib.randomBytes(),
                    edit  = '\n\ntest:' + rand + ' --~~~~',
                    match = new RegExp(matchAfterEdit.replace('%r', rand));

                wiki.setPageContent(lib.pages.sandbox, body + edit, {
                    ignoreEditConflicts : true
                }, function(err, result) {
                    should.not.exist(err);
                    result.should.have.property('edit');
                    result.edit.should.have.property('result', 'Success');
                    result.edit.should.have.property('title' , lib.pages.sandbox);

                    wiki.getPageContent(lib.pages.sandbox, function(err, body) {
                        should.not.exist(err);
                        body.should.match(match);
                        testWikiMessages();
                        done();
                    });
                });
            });
        });

        it('should list pages', function(done) {
            var pageList = [];
            wiki._query('allpages', {
                list    : 'allpages',
                apfrom  : 'Baz',
                aplimit : 5,
                onlyOneQuery : true
            }, function(err, data) {
                should.not.exist(err);
                pageList.push(data);
            }, function(err) {
                should.not.exist(err);
                pageList.should.eql([
                    { pageid: 8914673 , ns: 0, title: 'Baz' },
                    { pageid: 19888154, ns: 0, title: 'Baz\'s Culture Clash' },
                    { pageid: 20112954, ns: 0, title: 'Baz, Albania' },
                    { pageid: 21957451, ns: 0, title: 'Baz, Hakkari' },
                    { pageid: 8455074 , ns: 0, title: 'Baz, Iran' }
                ]);
                testWikiMessages();
                done();
            });
        });

        it('should fail to get non-existent pages', function(done) {
            var rand = lib.randomBytes();

            wiki.getPageContent(rand, function(err, body) {
                err.message.should.equal('HTTP 404 Not Found');
                err.data.should.have.property('body');
                err.data.body.should.equal('');
                should.not.exist(body);
                testWikiMessages();
                done();
            });
        });
    });
}

runTests('basic functionality', lib.endpoint,
    'test:%r --\\[\\[Special:Contributions/[0-9.]+\\|');

runTests('with login', lib.endpointWithLogin,
    'test:%r --\\[\\[User:Node-mw-test\\|');
