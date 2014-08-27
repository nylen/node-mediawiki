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

var wiki = utils.createWikiFromConfig(wikiName);

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

    wiki.getPageContent(pageTitle, function(err, oldContent) {
        if (err && err.data && err.statusCode == 404) {
            oldContent = [
                '<!--',
                'PAGE: ' + pageTitle,
                'This page does not exist yet.  Change this text to create it.',
                '-->'
            ].join('\n');
        } else if (err) {
            utils.fatalError(err);
        }

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
                        wiki.setPageContent(pageTitle, newContent, function(err, result) {
                            if (err) {
                                utils.fatalError(err);
                            } else {
                                console.error(result);
                            }
                        });
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
