#!/usr/bin/env node

var util = require('util'),
    wiki = require('../lib/wiki');

var title = process.argv[2];

if (!title) {
    throw new Error(util.format(
        'No page title given.  Usage: %s page-title', process.argv[1]));
}

wiki.getPageMarkup(title, function(data) {
    process.stdout.write(data);
});
