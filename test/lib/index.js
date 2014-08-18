var crypto    = require('crypto'),
    MediaWiki = require('../../lib');

exports.endpoint = 'http://en.wikipedia.org/w/';

exports.endpointWithLogin = {
    baseUrl  : exports.endpoint,
    username : 'Node-mw-test',
    password : 'node-mw-test-pw'
};

exports.pages = {
    user    : 'User:Node-mw-test',
    sandbox : 'User:Node-mw-test/sandbox'
};

exports.newMediaWiki = function(config, onError) {
    if (!onError) {
        onError = function(err) {
            throw err;
        };
    }

    var wiki = new MediaWiki(config || exports.endpoint);

    wiki.on('error', onError);

    wiki._messages = [];
    wiki.on('message', function(msg) {
        wiki._messages.push(msg);
    });

    return wiki;
};

exports.randomBytes = function(n) {
    return crypto.pseudoRandomBytes(n || 16).toString('hex');
};
