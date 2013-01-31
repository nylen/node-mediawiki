#!/usr/bin/env node

var wiki = require('../lib/wiki');

var pageTitle = process.argv[2];

wiki.getPageContent(pageTitle, function(oldContent) {
    var arr = oldContent.split('`');
    var newContent = '';
    for (var i = 0; i < arr.length; i++) {
        if (i > 0) {
            newContent += (i % 2 ? '<code>' : '</code>');
        }
        newContent += arr[i];
    }

    if (oldContent == newContent) {
        console.error('Page content was not changed.');
    } else {
        wiki.setPageContent(pageTitle, newContent, console.error);
    }
});
