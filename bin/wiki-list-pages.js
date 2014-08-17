#!/usr/bin/env node

var lib = require('../lib');

var wiki = process.argv[2];

if (!wiki) {
    throw new Error(util.format(
        'Usage: %s wiki-name-or-url',
        process.argv[1]));
}

lib.setWiki(wiki);

lib.listPages(function(title) {
    console.log(title);
});
