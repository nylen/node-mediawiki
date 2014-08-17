#!/usr/bin/env node

var async  = require('async'),
    events = require('events'),
    fs     = require('fs-extra'),
    path   = require('path'),
    util   = require('util'),
    wiki   = require('../lib/wiki');

fs.jsonfile.spaces = 4;

var mirrorDir = process.argv[2];

if (!mirrorDir) {
    throw new Error(util.format(
        'No mirror directory given.  Usage: %s mirror-directory',
        process.argv[1]));
}

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

            console.log(util.format(
                "Wrote page '%s' to file '%s'", title, filename));
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
            console.log(util.format(
                "Wrote page titles and filenames to '%s'", mapFilename));
        });
    };
});
