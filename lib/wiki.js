var request = require('../extern/request'),
    qs = require('qs'),
    util = require('util'),
    _ = require('underscore');

try {
    var config = require('../config');
} catch (ex) {
    throw new Error(
        'Cannot find config.js file.  Please copy and amend the example_config.js file as appropriate.');
}

config.baseUrl = config.baseUrl.replace(/\/+$/, '');

var doWikiRequest = function(page, params, callback, method) {
    var reqOptions = _.extend({}, config, {
        'method': (method || 'GET'),
        'uri': config.baseUrl + '/' + page,
        'headers': {
            // Need to set User-Agent header for Wikipedia
            'user-agent': 'MediaWikiAutomation/0.1 (https://github.com/nylen/node-mediawiki; jnylen@gmail.com)'
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
            throw new Error(body);
        } else {
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

var doAPIRequest = function(action, params, dataCallback, doneCallback) {
    var queryParams = _.extend({
        'action': 'query',
        'format': 'json'
    }, params);
    doAPIRequestChunk(action, queryParams, null, dataCallback, doneCallback);
};

var doAPIRequestChunk = function(action, queryParams, continueData, dataCallback, doneCallback) {
    if (continueData) {
        queryParams = _.extend({}, queryParams, continueData);
    }
    doWikiRequest('api.php', queryParams, function(data) {
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

var listPages = function(titleCallback, doneCallback) {
    doAPIRequest('allpages', {
        'list': 'allpages',
        'aplimit': 500
    }, function(d) {
        titleCallback(d.title);
    }, doneCallback);
}

var getPageContent = function(title, callback) {
    doWikiRequest('index.php', {
        'action': 'raw',
        'title': title
    }, callback, false);
};

var getEditToken = function(title, callback) {
    doWikiRequest('api.php', {
        'action': 'query',
        'prop': 'info',
        'intoken': 'edit',
        'titles': title,
        'format': 'json'
    }, function(data) {
        if (!data.query || !data.query.pages) {
            throw new Error('Bad edit token result: ' + util.inspect(data));
        }
        for (var i in data.query.pages) {
            var page = data.query.pages[i];
            callback({
                'token': page.edittoken,
                'basetimestamp': page.touched,
                'starttimestamp': page.starttimestamp,
                'title': page.title
            });
            return;
        }
    });
};

var setPageContent = function(title, text, summary, callback) {
    if (typeof summary == 'function' && !callback) {
        callback = summary;
        summary = undefined;
    }
    getEditToken(title, function(tokenData) {
        // console.log('getEditToken result: ', tokenData);
        var editParams = _.extend({
            'action': 'edit',
            'text': text,
            'summary': summary,
            'format': 'json'
        }, tokenData);
        doWikiRequest('api.php', editParams, function(data) {
            if (typeof callback == 'function') {
                callback(data);
            }
        }, 'POST');
    });
};

var pageTitleToFilename = function(title) {
    return title.replace(/[^a-z0-9 #.-]/gi, '_') + '.wiki';
};

exports.config              = config;
exports.doAPIRequest        = doAPIRequest;
exports.listPages           = listPages;
exports.getPageContent      = getPageContent;
exports.setPageContent      = setPageContent;
exports.pageTitleToFilename = pageTitleToFilename;
