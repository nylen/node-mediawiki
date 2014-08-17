#!/usr/bin/env node

var fs      = require('fs'),
    lib     = require('../lib'),
    path    = require('path'),
    pipette = require('pipette');

var wiki      = process.argv[2],
    pageTitle = process.argv[3],
    fn        = process.argv[4];

if (!wiki || !pageTitle) {
    lib.error(
        'Usage: %s wiki-name-or-url page-title [filename]',
        process.argv[1]);
}

lib.setWiki(wiki);

var setPageContent = function(text) {
    lib.setPageContent(pageTitle, text,
        'Edited with ' + path.basename(process.argv[1]), console.error);
};

if (fn) {
    setPageContent(fs.readFileSync(fn, 'utf8'));
} else {
    var text = '';
    process.stdin.resume();
    (new pipette.Sink(process.stdin)).on('data', function(data) {
        text = data.toString();
    }).on('error', function(error) {
        throw new Error('Error reading stdin: ' + error);
    }).on('end', function() {
        setPageContent(text);
    });
}
