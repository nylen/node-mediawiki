var fs        = require('fs'),
    MediaWiki = require('./index'),
    ini       = require('ini'),
    path      = require('path');

exports.fatalError = function(err) {
    console.error.apply(null, arguments);
    process.exit(1);
};

exports.setDefaultHandlers = function(wiki) {
    wiki.on('error', function(err) {
        exports.fatalError('Error: ' + (err.message || err));
    });

    wiki.on('message', console.error);
};

exports.configFilename = path.join(
    process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'],
    '.wikirc');

exports.readConfigFromFile = function() {
    try {
        MediaWiki.config = ini.decode(
            fs.readFileSync(exports.configFilename, 'utf8'));
    } catch (err) { }
};
