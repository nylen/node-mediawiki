#!/usr/bin/env node

var MediaWiki = require('../lib'),
    utils     = require('../lib/utils');

var wikiName = process.argv[2];

if (!wikiName) {
    utils.fatalError(
        'Usage: %s wikiName-name-or-url',
        process.argv[1]);
}

var wiki = new MediaWiki(utils.getConfig(wikiName));
utils.setDefaultHandlers(wiki);

wiki.listPages(function(title) {
    console.log(title);
});
