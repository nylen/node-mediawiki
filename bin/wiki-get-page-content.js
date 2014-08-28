#!/usr/bin/env node

var MediaWiki = require('../lib'),
    utils     = require('../lib/utils');

var wikiName  = process.argv[2],
    pageTitle = process.argv[3];

if (!wikiName || !pageTitle) {
    utils.fatalError(
        'Usage: %s wiki-name-or-url page-title',
        process.argv[1]);
}

var wiki = utils.createWikiFromConfig(wikiName);

wiki.getPageContent(pageTitle, function(err, data) {
    if (err) {
        utils.fatalError(err);
    } else {
        process.stdout.write(data);
    }
});
