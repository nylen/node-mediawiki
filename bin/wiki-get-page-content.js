#!/usr/bin/env node

var lib  = require('../lib'),
    util = require('util');

var title = process.argv[2];

if (!title) {
    throw new Error(util.format(
        'No page title given.  Usage: %s page-title', process.argv[1]));
}

lib.getPageContent(title, function(data) {
    process.stdout.write(data);
});
