#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    wiki = require('../lib/wiki');

var dir = process.argv[2];

if (!dir) {
    throw new Error(util.format(
        'No mirror directory given.  Usage: %s mirror-directory', process.argv[1]));
}

try {
    var stat = fs.statSync(dir);
} catch (ex) { }

if (!stat || !stat.isDirectory()) {
    fs.mkdirSync(dir);
}

var titleToFileMap = {};
var numTitles = 0;
var gotAllTitles = false;
var numPages = 0;

wiki.listPages(function(title) {
    var filename = wiki.pageTitleToFilename(title);
    titleToFileMap[title] = filename;
    numTitles++;
    wiki.getPageContent(title, function(data) {
        filename = path.join(dir, filename);
        fs.writeFileSync(filename, data);
        console.log(util.format(
            "Wrote page '%s' to file '%s'", title, filename));
        numPages++;

        if (gotAllTitles && numTitles == numPages) {
            var mapFilename = path.join(dir, 'wiki_pages.json');
            fs.writeFileSync(mapFilename, JSON.stringify(titleToFileMap, null, 4) + "\n");
            console.log(util.format(
                "Wrote page titles and filenames to '%s'", mapFilename));
        }
    });
}, function() {
    gotAllTitles = true;
});
