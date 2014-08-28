#!/usr/bin/env node

var concat    = require('concat-stream'),
    fs        = require('fs'),
    MediaWiki = require('../lib'),
    path      = require('path'),
    utils     = require('../lib/utils');

var wikiName  = process.argv[2],
    pageTitle = process.argv[3],
    fn        = process.argv[4];

if (!wikiName || !pageTitle) {
    utils.fatalError(
        'Usage: %s wiki-name-or-url page-title [filename]',
        process.argv[1]);
}

var wiki = utils.createWikiFromConfig(wikiName);

function setPageContent(text) {
    wiki.setPageContent(pageTitle, text,
        'Edited with ' + MediaWiki.userAgent,
        function(err, result) {
            if (err) {
                utils.fatalError(err);
            } else {
                console.error(result);
            }
        });
}

if (fn) {
    setPageContent(fs.readFileSync(fn, 'utf8'));
} else {
    process.stdin.pipe(concat(function(data) {
        setPageContent(data.toString('utf8'));
    }));
}
