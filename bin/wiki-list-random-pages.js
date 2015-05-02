#!/usr/bin/env node

var MediaWiki = require('../lib'),
    utils     = require('../lib/utils');

var wikiName = process.argv[2];

if (!wikiName) {
    utils.fatalError(
        'Usage: %s wiki-name-or-url',
        process.argv[1]);
}

var wiki = utils.createWikiFromConfig(wikiName);

wiki.listRandomPages(10, function(err, title) {
    if (err) {
        utils.fatalError(err);
    } else {
        console.log(title);
    }
});
