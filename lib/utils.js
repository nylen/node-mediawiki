var fs        = require('fs'),
    MediaWiki = require('./index'),
    ini       = require('ini'),
    path      = require('path');

exports.fatalError = function(err) {
    if (process.stdin.isRaw) {
        process.stdin.setRawMode(false);
    }
    console.error.apply(null, arguments);
    process.exit(1);
};

var config         = {},
    configFilename = path.join(
        process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'],
        '.wikirc'),
    readConfigFile = false;

exports.createWikiFromConfig = function(wikiName) {
    if (!readConfigFile) {
        try {
            config = ini.decode(fs.readFileSync(configFilename, 'utf8'));
        } catch (err) { }
        readConfigFile = true;
    }

    var wiki = new MediaWiki(config[wikiName] || wikiName);

    wiki.on('message', console.error);

    return wiki;
};
