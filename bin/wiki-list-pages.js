#!/usr/bin/env node

var lib = require('../lib');

lib.listPages(function(title) {
    console.log(title);
});
