#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    pipette = require('pipette'),
    wiki = require('../lib/wiki');

var title = process.argv[2],
    fn = process.argv[3];

var edit = function(text) {
    wiki.editPage(title, text,
        'Edited with ' + path.basename(process.argv[1]), console.error);
};

if (fn) {
    edit(fs.readFileSync(fn));
} else {
    var text = '';
    process.stdin.resume();
    (new pipette.Sink(process.stdin)).on('data', function(data) {
        text = data.toString();
    }).on('error', function(error) {
        throw new Error('Error reading stdin: ' + error);
    }).on('end', function() {
        edit(text);
    });
}
