#!/usr/bin/env node

var lib  = require('../lib'),
    util = require('util');

var wiki      = process.argv[2],
    pageTitle = process.argv[3];

if (!wiki || !pageTitle) {
    throw new Error(util.format(
        'Usage: %s wiki-name-or-url page-title',
        process.argv[1]));
}

lib.setWiki(wiki);

lib.getPageContent(pageTitle, function(data) {
    process.stdout.write(data);
});
