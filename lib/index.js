var fs      = require('fs'),
    http    = require('http'),
    ini     = require('ini'),
    path    = require('path'),
    request = require('request'),
    qs      = require('qs'),
    util    = require('util'),
    _       = require('underscore');

var configFilename,
    config  = null,
    configs = {};

if (process.env.WIKI_CONFIG) {
    configFilename = process.env.WIKI_CONFIG;
} else {
    configFilename = path.join(
        process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'],
        '.wikirc');
}

try {
    configs = exports.configs = ini.decode(fs.readFileSync(configFilename, 'utf8'));
} catch (err) { }

var cookieJar = exports.cookieJar = request.jar();

request = request.defaults({
    rejectUnauthorized : false,
    jar                : cookieJar
});

exports.setWiki = function(wiki) {
    if (configs[wiki]) {
        config = exports.config = configs[wiki];
    } else {
        config = exports.config = {
            baseUrl : wiki
        };
    }
    config.baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (!/^https?:/.test(config.baseUrl)) {
        config.baseUrl = 'http://' + config.baseUrl;
    }
};

exports.error = function() {
    console.error.apply(null, arguments);
    process.exit(1);
};

function doWikiRequest(page, params, callback, method) {
    if (!config) {
        throw new Error('Please set a wiki configuration using setWiki().');
    }

    var reqOptions = _.extend({}, config, {
        'method'  : (method || 'GET'),
        'uri'     : config.baseUrl + '/' + page,
        'jar'     : true,
        'headers' : {
            // Need to set User-Agent header for Wikipedia
            'user-agent' : 'MediaWikiAutomation/0.1 (https://github.com/nylen/node-mediawiki; jnylen@gmail.com)'
        }
    });
    if (method == 'POST') {
        reqOptions.form = params;
    } else {
        reqOptions.qs = params;
    }
    request(reqOptions, function(error, response, body) {
        if (error) {
            throw error;
        } else if (response.statusCode != 200) {
            throw new Error(body
                || http.STATUS_CODES[response.statusCode]
                || ('Error ' + response.statusCode));
        } else {
            if (response.headers['content-type']) {
                var contentType = response.headers['content-type'].split(';')[0];
                if (contentType == 'application/json') {
                    body = JSON.parse(body);
                }
            }
            if (body && body.error) {
                if (body.error.info) {
                    throw new Error('MediaWiki error: ' + body.error.info);
                } else {
                    throw new Error('MediaWiki error: ' + util.inspect(body.error));
                }
            }
            callback(body);
        }
    });
}

exports.doAPIRequest = function(action, params, dataCallback, doneCallback) {
    var queryParams = _.extend({
        'action' : 'query',
        'format' : 'json'
    }, params);
    doAPIRequestChunk(action, queryParams, null, dataCallback, doneCallback);
};

function doAPIRequestChunk(action, queryParams, continueData, dataCallback, doneCallback) {
    if (continueData) {
        queryParams = _.extend({}, queryParams, continueData);
    }
    doWikiRequest('api.php', queryParams, function(data) {
        if (!data.query) {
            if (typeof data == 'string') {
                data = data.split('</title>')[0];
                data = data.split('<title>')[1] || data;
            }
            throw new Error(data);
        }
        var result = data.query[action];
        for (var i in result) {
            dataCallback(result[i]);
        }
        if (data['query-continue']) {
            doAPIRequestChunk(action, queryParams,
                data['query-continue'][action],
                dataCallback, doneCallback);
        } else if (typeof doneCallback == 'function') {
            doneCallback();
        }
    });
};

exports.listPages = function(titleCallback, doneCallback) {
    exports.doAPIRequest('allpages', {
        'list'    : 'allpages',
        'aplimit' : 500
    }, function(d) {
        titleCallback(d.title);
    }, doneCallback);
}

exports.getPageContent = function(title, callback) {
    doWikiRequest('index.php', {
        'action' : 'raw',
        'title'  : title
    }, callback, false);
};

function getEditToken(title, callback) {
    doWikiRequest('api.php', {
        'action'  : 'query',
        'prop'    : 'info',
        'intoken' : 'edit',
        'titles'  : title,
        'format'  : 'json'
    }, function(data) {
        if (!data.query || !data.query.pages) {
            throw new Error('Bad edit token result: ' + util.inspect(data));
        }
        for (var i in data.query.pages) {
            var page = data.query.pages[i];
            if (!page.edittoken) {
                var msg = 'Failed to get edit token.';
                if (data.warnings) {
                    msg += '  ' + util.format(data.warnings);
                }
                throw new Error(msg);
            }
            callback({
                'token'          : page.edittoken,
                'basetimestamp'  : page.touched,
                'starttimestamp' : page.starttimestamp,
                'title'          : page.title
            });
            return;
        }
    });
};

exports.setPageContent = function(title, text, summary, callback) {
    if (typeof summary == 'function' && !callback) {
        callback = summary;
        summary = undefined;
    }
    getEditToken(title, function(tokenData) {
        var editParams = _.extend({
            'action'  : 'edit',
            'text'    : text,
            'summary' : summary,
            'format'  : 'json'
        }, tokenData);
        doWikiRequest('api.php', editParams, function(data) {
            if (typeof callback == 'function') {
                callback(data);
            }
        }, 'POST');
    });
};

exports.pageTitleToFilename = function(title) {
    return title.replace(/[^a-z0-9 #.-]/gi, '_') + '.wiki';
};
