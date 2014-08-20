var fs        = require('fs'),
    MediaWiki = require('./index'),
    ini       = require('ini'),
    _         = require('lodash'),
    path      = require('path');

exports.fatalError = function(err) {
    if (process.stdin.isRaw) {
        process.stdin.setRawMode(false);
    }
    console.error.apply(null, arguments);
    process.exit(1);
};

exports.setDefaultHandlers = function(wiki) {
    var set = [].slice.call(arguments, 1);

    set = (set.length ? _.object(set, set) : { all : true });

    if (set.all || set.error) {
        wiki.on('error', function(err) {
            exports.fatalError('Error: ' + (err.message || err));
        });
    }

    if (set.all || set.message) {
        wiki.on('message', console.error);
    }
};

var config         = {},
    configFilename = path.join(
        process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'],
        '.wikirc'),
    readConfigFile = false;

exports.getConfig = function(wiki) {
    if (!readConfigFile) {
        try {
            config = ini.decode(fs.readFileSync(configFilename, 'utf8'));
        } catch (err) { }
        readConfigFile = true;
    }
    return config[wiki] || wiki;
};
