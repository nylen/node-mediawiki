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
    configs = null;

var cookieJar = exports.cookieJar = request.jar();

request = request.defaults({
    jar     : cookieJar,
    headers : {
        // Need to set User-Agent header for Wikipedia
        'user-agent' : 'MediaWikiAutomation/0.1 (https://github.com/nylen/node-mediawiki; jnylen@gmail.com)'
    }
});

exports.setWiki = function(wiki) {
    if (typeof wiki == 'string') {
        if (!configs) {
            if (process.env.WIKI_CONFIG) {
                configFilename = process.env.WIKI_CONFIG;
            } else {
                configFilename = path.join(
                    process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'],
                    '.wikirc');
            }

            try {
                configs = exports.configs = ini.decode(fs.readFileSync(configFilename, 'utf8'));
            } catch (err) {
                configs = exports.configs = {};
            }
        }

        if (configs[wiki]) {
            config = exports.config = configs[wiki];
        } else {
            config = exports.config = {
                baseUrl : wiki
            };
        }
    }

    config.baseUrl = config.baseUrl.replace(/\/+$/, '');
    if (!/^https?:/.test(config.baseUrl)) {
        config.baseUrl = 'http://' + config.baseUrl;
    }
    config.username = config.username || config.user;
    config.password = config.password || config.pass;
};

exports.error = function() {
    console.error.apply(null, arguments);
    process.exit(1);
};

function tryGetTitle(data) {
    if (typeof data == 'string' && data.length > 200) {
        data = data.split('</title>')[0];
        data = data.split('<title>')[1] || data;
    }
    return data;
}

function doWikiRequest(method, page, params, callback) {
    if (!config) {
        throw new Error('Please set a wiki configuration using setWiki().');
    }

    if (typeof page == 'object') {
        // method not specified
        callback = params;
        params   = page;
        page     = method;
        method   = 'GET';
    }

    if (config.username && !config._loggedIn && !config._loggingIn) {
        console.error('Logging in...');
        config._loggingIn = true;

        function loggedIn() {
            console.error('Logged in');
            config._loggingIn = false;
            config._loggedIn  = true;
            doWikiRequest(method, page, params, callback);
        }

        var loginOptions = {
            action     : 'login',
            format     : 'json',
            lgname     : config.username,
            lgpassword : config.password
        };
        doWikiRequest('POST', 'api.php', loginOptions, function(data) {
            switch (data && data.login && data.login.result) {
                case 'Success':
                    loggedIn();
                    break;

                case 'NeedToken':
                    loginOptions.lgtoken = data.login.token;
                    doWikiRequest('POST', 'api.php', loginOptions, function(data) {
                        if (!data || !data.login || data.login.result != 'Success') {
                            throw new Error('Login failed: ' + util.format(data));
                        }
                        loggedIn();
                    });
                    break;

                default:
                    config._loggingIn = false;
                    throw new Error('Login failed: ' + util.format(data));
                    break;
            }
        });
        return;
    }

    var reqOptions = _.extend({}, config.request || {}, {
        method : (method || 'GET'),
        uri    : config.baseUrl + '/' + page
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
            throw new Error(tryGetTitle(body)
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
            data = tryGetTitle(data);
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
    }, callback);
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
        doWikiRequest('POST', 'api.php', editParams, function(data) {
            if (typeof callback == 'function') {
                callback(data);
            }
        });
    });
};

exports.pageTitleToFilename = function(title) {
    return title.replace(/[^a-z0-9 #.-]/gi, '_') + '.wiki';
};
