#!/usr/bin/env node

var fs      = require('fs'),
    lib     = require('../lib'),
    path    = require('path'),
    pipette = require('pipette');

var title = process.argv[2],
    fn = process.argv[3];

var setPageContent = function(text) {
    lib.setPageContent(title, text,
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
