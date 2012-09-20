#!/usr/bin/env node

var wiki = require('../lib/wiki');

wiki.listPages(function(title) {
    console.log(title);
});
