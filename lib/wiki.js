var digestClient = require('./digestClient'),
    qs = require('qs'),
    _ = require('underscore');

try {
    var config = require('../config');
} catch (ex) {
    throw new Error(
        'Cannot find config.js file.  Please copy and amend the example_config.js file as appropriate.');
}

var doWikiRequest = function(pageName, queryParams, callback, isJSON, method) {
    if (typeof isJSON == 'undefined') {
        isJSON = true;
    }
    var reqOptions = _.extend({}, config, {
        'method': (method || 'GET'),
        'path': config.baseUrl + '/' + pageName + '?' + qs.stringify(queryParams)
    });
    digestClient.doRequest(reqOptions, function(data) {
        if (isJSON) {
            data = JSON.parse(data);
            if (data && data.error && data.error.info) {
                throw new Error(
                    'Server error: ' + data.error.info);
            }
        }
        callback(data);
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

var getPageMarkup = function(title, callback) {
    doWikiRequest('index.php', {
        'action': 'raw',
        'title': title
    }, callback, false);
};

var getEditToken = function(title, callback) {
    // doWikiRequest('api.php', {
    //     'action': 'tokens',
    //     'type': 'edit',
    //     'format': 'json'
    // }, function(data) {
    //     console.log('Edit token = ', data);
    // });
    doWikiRequest('api.php', {
        'action': 'query',
        'prop': 'info',
        'intoken': 'edit',
        'titles': title,
        'format': 'json'
    }, function(data) {
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

var editPage = function(title, text, summary) {
    getEditToken(title, function(tokenData) {
        // console.log('getEditToken result: ', tokenData);
        var editParams = _.extend({
            'action': 'edit',
            'text': text,
            'summary': summary,
            'format': 'json'
        }, tokenData);
        doWikiRequest('api.php', editParams, function(data, res) {
            // console.log(res);
            // console.log('Editing API result: ', data);
        }, 'POST');
    });
};

exports.listPages = listPages;
exports.getPageMarkup = getPageMarkup;
exports.editPage = editPage;
