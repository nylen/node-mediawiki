#!/usr/bin/env node

var fs   = require('fs-extra'),
    path = require('path'),
    util = require('util'),
    wiki = require('../lib/wiki');

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

wiki.listPages(function(title) {
    var filename = wiki.pageTitleToFilename(title);
    titleToFileMap[title] = filename;
    numTitles++;
    wiki.getPageContent(title, function(data) {
        filename = path.join(mirrorDir, filename);
        fs.writeFileSync(filename, data);
        console.log(util.format(
            "Wrote page '%s' to file '%s'", title, filename));
        numPages++;

        if (gotAllTitles && numTitles == numPages) {
            var mapFilename = path.join(mirrorDir, 'wiki_pages.json');
            fs.writeJSONFile(mapFilename, titleToFileMap, function(err) {
                if (err) throw err;
                console.log(util.format(
                    "Wrote page titles and filenames to '%s'", mapFilename));
            });
        }
    });
}, function() {
    gotAllTitles = true;
});
