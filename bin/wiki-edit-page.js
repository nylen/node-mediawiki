#!/usr/bin/env node

var cp        = require('child_process'),
    fs        = require('fs'),
    MediaWiki = require('../lib'),
    path      = require('path'),
    temp      = require('temp'),
    utils     = require('../lib/utils');

var wikiName  = process.argv[2],
    pageTitle = process.argv[3];

if (!wikiName || !pageTitle) {
    utils.fatalError(
        'Usage: %s wikiName-name-or-url page-title',
        process.argv[1]);
}

var wiki = new MediaWiki(utils.getConfig(wikiName));
utils.setDefaultHandlers(wiki);

var editor = process.env.EDITOR;

if (!editor) {
    editor = 'editor';
    console.error(
        'No external editor defined.  Trying `editor` - set one via $EDITOR.');
}

temp.track();

temp.mkdir('wiki-edit-', function(err, tmpDir) {
    if (err) {
        throw err;
    }

    var tmpFilename = path.join(tmpDir, MediaWiki.pageTitleToFilename(pageTitle));

    wiki.getPageContent(pageTitle, function(oldContent) {
        fs.writeFileSync(tmpFilename, oldContent);

        process.stdin.setRawMode(true);

        var done = function(err, code) {
            process.stdin.setRawMode(false);

            done = function() { };

            if (err) {

                if (err.code && err.code == 'ENOENT') {
                    console.error('Editor `%s` not found.', editor);
                } else {
                    throw err;
                }

            } else {

                if (code) {
                    console.error('Editor exited with code: ' + code);
                } else {
                    var newContent = fs.readFileSync(tmpFilename, 'utf8');
                    if (oldContent == newContent) {
                        console.error('Page content was not changed.');
                    } else {
                        wiki.setPageContent(pageTitle, newContent, console.error);
                    }
                }

            }
        };

        cp.spawn(editor, [tmpFilename], {
            stdio : 'inherit'
        }).on('exit', function(code) {
            done(null, code);
        }).on('error', function(err) {
            done(err);
        });
    });
});
