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

var wiki = utils.createWikiFromConfig(wikiName);

async.eachSeries(pageTitles, function(title, cb) {
    wiki.getPageContent(title, function(err, oldContent) {
        if (err) {
            utils.fatalError(err);
        }

        var newContent = utils.wikifyCodeTags(oldContent);

        if (oldContent == newContent) {
            console.error('Page content was not changed.');
            cb();
        } else {
            wiki.setPageContent(title, newContent, function(err, data) {
                if (err) {
                    utils.fatalError(err);
                } else {
                    console.log(data);
                    cb();
                }
            });
        }
    });
});
