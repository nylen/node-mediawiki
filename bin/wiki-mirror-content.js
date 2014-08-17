#!/usr/bin/env node

var async     = require('async'),
    events    = require('events'),
    fs        = require('fs-extra'),
    MediaWiki = require('../lib'),
    path      = require('path'),
    utils     = require('../lib/utils');

fs.jsonfile.spaces = 4;

var wikiName  = process.argv[2],
    mirrorDir = process.argv[3];

if (!wikiName || !mirrorDir) {
    utils.fatalError(
        'Usage: %s wikiName-name-or-url mirror-directory',
        process.argv[1]);
}

var wiki = new MediaWiki(wikiName);
utils.setDefaultHandlers(wiki);

fs.mkdirpSync(mirrorDir);

var titleToFileMap = {},
    numTitles = 0,
    gotAllTitles = false,
    numPages = 0;

function writePage(title, cb) {
    wiki.getPageContent(title, function(data) {
        var filename = path.join(mirrorDir, wiki.pageTitleToFilename(title));
        titleToFileMap[title] = filename;

        fs.writeFile(filename, data, function(err) {
            if (err) {
                cb(err);
                return;
            }

            console.log(
                "Wrote page '%s' to file '%s'",
                title, filename);
            cb(null);
        });
    });
}

var queue = async.queue(writePage, 10);

events.EventEmitter.defaultMaxListeners = 50; // only works in Node >=v0.11.2

wiki.listPages(function(title) {
    numTitles++;
    queue.push(title);
}, function() {
    queue.drain = function() {
        var mapFilename = path.join(mirrorDir, 'wiki_pages.json');
        fs.writeJSONFile(mapFilename, titleToFileMap, function(err) {
            if (err) throw err;
            console.log(
                "Wrote page titles and filenames to '%s'",
                mapFilename);
        });
    };
});
