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
utils.setDefaultHandlers(wiki, 'message');

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

    wiki.on('error', function(err, data) {
        if (data && data.statusCode == 404) {
            cbPageContent(null, true);
        } else {
            utils.fatalError('Error: ' + (err.message || err));
        }
    });

    wiki.getPageContent(pageTitle, function(oldContent) {
        cbPageContent(oldContent);
    });

    function cbPageContent(oldContent, pageNotFound) {
        if (pageNotFound) {
            oldContent = [
                '<!--',
                'PAGE: ' + pageTitle,
                'This page does not exist yet.  Change this text to create it.',
                '-->'
            ].join('\n');
        }

        wiki.removeAllListeners('error');
        utils.setDefaultHandlers(wiki, 'error');

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
                    if (oldContent.trim() == newContent.trim()) {
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
    }
});
