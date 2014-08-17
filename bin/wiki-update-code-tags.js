#!/usr/bin/env node

var async = require('async'),
    wiki  = require('../lib/wiki');

async.eachSeries(process.argv.slice(2), function(title, cb) {
    wiki.getPageContent(title, function(oldContent) {
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
            cb();
        } else {
            wiki.setPageContent(title, newContent, function(data) {
                console.log(data);
                cb();
            });
        }
    });
});
