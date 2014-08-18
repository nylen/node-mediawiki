#!/usr/bin/env node

var MediaWiki = require('../lib'),
    utils     = require('../lib/utils');

var wikiName  = process.argv[2],
    pageTitle = process.argv[3];

if (!wikiName || !pageTitle) {
    utils.fatalError(
        'Usage: %s wikiName-name-or-url page-title',
        process.argv[1]);
}

var wiki = new MediaWiki(utils.getConfig(wikiName));
utils.setDefaultHandlers(wiki);

wiki.getPageContent(pageTitle, function(data) {
    process.stdout.write(data);
});
