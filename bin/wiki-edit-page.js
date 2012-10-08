#!/usr/bin/env node

var wiki = require('../lib/wiki');

getPageMarkup('XBMC', function(text) {
    editPage('XBMC', text, 'Test editing API');
});
