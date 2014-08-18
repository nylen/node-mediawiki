#!/usr/bin/env node

var async     = require('async'),
    MediaWiki = require('../lib'),
    utils     = require('../lib/utils');

var wikiName   = process.argv[2],
    pageTitles = process.argv.slice(3);

if (!wikiName || !pageTitles.length) {
    utils.fatalError(
        'Usage: %s wikiName-name-or-url page-title [page-title [...]]',
        process.argv[1]);
}

utils.readConfigFromFile();
var wiki = new MediaWiki(wikiName);
utils.setDefaultHandlers(wiki);

async.eachSeries(pageTitles, function(title, cb) {
    wiki.getPageContent(title, function(oldContent) {
        var arr = oldContent.split('`');
        var newContent = '';
        for (var i = 0; i < arr.length; i++) {
            if (i > 0) {
                newContent += (i % 2 ? '<code>' : '</code>');
            }
            newContent += arr[i];
        }

        if (oldContent == newContent) {
            console.error('Page content was not changed.');
            cb();
        } else {
            wiki.setPageContent(title, newContent, function(data) {
                console.log(data);
                cb();
            });
        }
    });
});
