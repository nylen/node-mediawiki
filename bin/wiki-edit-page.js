#!/usr/bin/env node

var cp   = require('child_process'),
    fs   = require('fs'),
    lib  = require('../lib'),
    path = require('path'),
    temp = require('temp');

var pageTitle = process.argv[2];

var editor = lib.config.editor || process.env.EDITOR;

if (!editor) {
    throw new Error(
        'No external editor defined.  Set one in the config file or via $EDITOR.');
}

temp.mkdir('wiki-edit-', function(err, tmpDir) {
    if (err) {
        throw err;
    }

    var tmpFilename = path.join(tmpDir, lib.pageTitleToFilename(pageTitle));

    lib.getPageContent(pageTitle, function(oldContent) {
        fs.writeFileSync(tmpFilename, oldContent);

        process.stdin.setRawMode(true);
        cp.spawn(editor, [tmpFilename], {
            stdio: 'inherit'
        }).on('exit', function(code) {
            process.stdin.setRawMode(false);

            if (code) {
                console.error('Editor exited with code: ' + code);
            } else {
                var newContent = fs.readFileSync(tmpFilename, 'utf8');
                if (oldContent == newContent) {
                    console.error('Page content was not changed.');
                } else {
                    lib.setPageContent(pageTitle, newContent, console.error);
                }
            }

            fs.unlinkSync(tmpFilename);
        });
    });
});
