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
        'uri': config.baseUrl + '/' + page
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

var requestListChunk = function(continueData, titleCallback, doneCallback) {
    var queryParams = {
        'action': 'query',
        'list': 'allpages',
        'format': 'json'
    };
    if (continueData) {
        queryParams = _.extend(queryParams, continueData);
    }
    doWikiRequest('api.php', queryParams, function(data) {
        for (var i in data.query.allpages) {
            titleCallback(data.query.allpages[i].title);
        }
        if (data['query-continue']) {
            requestListChunk(data['query-continue'].allpages, titleCallback, doneCallback);
        } else if (typeof doneCallback == 'function') {
            doneCallback();
        }
    });
}

var listPages = function(titleCallback, doneCallback) {
    requestListChunk(null, titleCallback, doneCallback);
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

exports.config = config;
exports.listPages = listPages;
exports.getPageContent = getPageContent;
exports.setPageContent = setPageContent;
exports.pageTitleToFilename = pageTitleToFilename;
