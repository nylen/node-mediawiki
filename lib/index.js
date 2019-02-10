var events  = require('events'),
    http    = require('http'),
    _       = require('lodash'),
    request = require('request'),
    util    = require('util'),
    XRegExp = require('xregexp');

function MediaWiki(wiki) {
    var self = this;

    if (typeof wiki == 'string') {
        wiki = {
            baseUrl : wiki
        };
    }

    wiki.baseUrl = wiki.baseUrl.replace(/\/+$/, '');
    if (!/^https?:/.test(wiki.baseUrl)) {
        wiki.baseUrl = 'https://' + wiki.baseUrl;
    }
    wiki.username = wiki.username || wiki.user;
    wiki.password = wiki.password || wiki.pass;

    self.wiki = wiki;

    self.cookieJar = request.jar();
    self._request  = request.defaults({
        jar     : self.cookieJar,
        headers : {
            // Need to set User-Agent header for Wikipedia
            'user-agent' : MediaWiki.userAgent
        }
    });
};

util.inherits(MediaWiki, events.EventEmitter);

MediaWiki.userAgent = util.format('node-mediawiki/%s (%s; %s)',
    require('../package.json').version,
    'https://github.com/nylen/node-mediawiki',
    'jnylen@gmail.com');

MediaWiki.pageTitleToFilenameBase = function(title, allowSlashes) {
    var invalidFilenameChar = XRegExp('[^\\pL0-9#./-]', 'gi');
    var filenameBase = title.replace(invalidFilenameChar, '_');
    if (!allowSlashes) {
        filenameBase = filenameBase.replace(/\//g, '_');
    }
    return filenameBase;
};

MediaWiki.pageTitleToFilename = function(title, allowSlashes) {
    return MediaWiki.pageTitleToFilenameBase(title, allowSlashes) + '.wiki';
};

function tryGetTitle(body) {
    if (typeof body == 'string' && body.length > 200) {
        body = body.split('</title>')[0];
        body = body.split('<title>')[1] || body;
    }
    return body;
}

MediaWiki.prototype._error = function(msg, data) {
    var err = new Error(msg);
    err.data = data;
    return err;
};

MediaWiki.prototype._doRequest = function(method, page, params, cb) {
    if (typeof page == 'object') {
        // method not specified
        cb     = params;
        params = page;
        page   = method;
        method = 'GET';
    }

    var self = this;

    if (self.wiki.username && !self.loggedIn && !self.loggingIn) {
        self.emit('message', 'Logging in...');
        self.loggingIn = true;

        function loggedIn() {
            self.emit('message', 'Logged in');
            self.loggingIn = false;
            self.loggedIn  = true;
            self._doRequest(method, page, params, cb);
        }

        function loginFailed(data) {
            self.loggingIn = false;
            cb(self._error(
                'Login failed: ' + util.format(data),
                data));
        }

        var loginOptions = {
            action     : 'login',
            format     : 'json',
            lgname     : self.wiki.username,
            lgpassword : self.wiki.password
        };

        self._doRequest('POST', 'api.php', loginOptions, function(err, data) {
            if (err) return cb(err);

            switch (data && data.login && data.login.result) {
                case 'Success':
                    loggedIn();
                    break;

                case 'NeedToken':
                    loginOptions.lgtoken = data.login.token;
                    self._doRequest('POST', 'api.php', loginOptions, function(err, data) {
                        if (err) cb(err);

                        if (!data || !data.login || data.login.result != 'Success') {
                            loginFailed(data);
                            return;
                        }
                        loggedIn();
                    });
                    break;

                default:
                    loginFailed(data);
                    return;
            }
        });
        return;
    }

    var reqOptions = _.extend({}, self.wiki.requestOptions || {}, {
        method : (method || 'GET'),
        uri    : self.wiki.baseUrl + '/' + page
    });

    if (method == 'POST') {
        reqOptions.form = params;
    } else {
        reqOptions.qs = params;
    }

    self._request(reqOptions, function(error, response, body) {
        if (error) {
            if (error.message) {
                error.message = util.format('%s (%s %s)',
                    error.message, reqOptions.method, reqOptions.uri);
            }
            cb(error);
        } else if (response.statusCode != 200) {
            cb(self._error(
                (
                    'HTTP ' + response.statusCode
                    + ' ' + http.STATUS_CODES[response.statusCode]),
                _.pick(response, 'headers', 'statusCode', 'body')));
            return;
        } else {
            if (response.headers['content-type']) {
                var contentType = response.headers['content-type'].split(';')[0];
                if (contentType == 'application/json') {
                    body = JSON.parse(body);
                }
            }
            if (body && body.error) {
                cb(self._error(
                    'MediaWiki says: ' + (body.error.info || util.inspect(body.error)),
                    body));
                return;
            }
            cb(null, body);
        }
    });
}

MediaWiki.prototype._query = function(action, params, cbData, cbDone) {
    var self = this;

    params = _.extend({
        action : 'query',
        format : 'json'
    }, params);

    self._queryChunk(action, params, null, cbData, cbDone);
};

MediaWiki.prototype._queryChunk = function(action, params, continueData, cbData, cbDone) {
    var self = this;

    var cbError = cbDone || cbData;

    var onlyOneQuery = false;
    if (params.onlyOneQuery) {
        onlyOneQuery = true;
        delete params.onlyOneQuery;
    }

    if (continueData) {
        params = _.extend({}, params, continueData);
    }
    self._doRequest('api.php', params, function(err, data) {
        if (err) return cbError(err);

        if (!data.query) {
            data = tryGetTitle(data);
            cbError(self._error(
                'Query request failed: ' + util.format(data),
                data));
            return;
        }
        var result = data.query[action];
        if (!result) {
            cbError(self._error(
                util.format("Expected property '%s' in query result but found %s",
                    action,
                    util.format(Object.keys(data.query))),
                data));
            return;
        }
        for (var i in result) {
            cbData(null, result[i]);
        }
        if (data['query-continue'] && !onlyOneQuery) {
            self._queryChunk(action, params,
                data['query-continue'][action],
                cbData, cbDone);
        } else if (data['continue'] && !onlyOneQuery) {
            self._queryChunk(action, params,
                data['continue'],
                cbData, cbDone);
        } else if (typeof cbDone == 'function') {
            cbDone(null);
        }
    });
};

MediaWiki.prototype.listPages = function(opts, cbTitle, cbDone) {
    var self = this;

    self._query('allpages', {
        list    : 'allpages',
        aplimit : 500
    }, function(err, d) {
        cbTitle(err, d && d.title);
    }, cbDone);
};

MediaWiki.prototype.listRandomPages = function(count, cbTitle, cbDone) {
    var self = this;

    self._query('random', {
        list        : 'random',
        rnlimit     : count,
        rnnamespace : 0
    }, function(err, d) {
        cbTitle(err, d && d.title);
    }, cbDone);
};

MediaWiki.prototype.getPageContent = function(title, cb) {
    var self = this;

    self._doRequest('index.php', {
        action : 'raw',
        title  : title
    }, cb);
};

MediaWiki.prototype._getEditToken = function(title, cb) {
    var self = this;

    self._doRequest('api.php', {
        action  : 'query',
        prop    : 'info',
        intoken : 'edit',
        titles  : title,
        format  : 'json'
    }, function(err, data) {
        if (err) return cb(err);

        if (!data.query || !data.query.pages) {
            cb(self._error(
                'Bad edit token result: ' + util.inspect(data),
                data));
            return;
        }
        for (var i in data.query.pages) {
            var page = data.query.pages[i];
            if (!page.edittoken) {
                var msg = 'Failed to get edit token.';
                if (data.warnings) {
                    msg += '  ' + util.format(data.warnings);
                }
                cb(self._error(msg, data));
                return;
            }
            cb(null, {
                token          : page.edittoken,
                basetimestamp  : page.touched,
                starttimestamp : page.starttimestamp,
                title          : page.title
            });
            return;
        }
    });
};

MediaWiki.prototype.setPageContent = function(title, text, options, cb) {
    if (typeof options == 'function' && !cb) {
        cb      = options;
        options = undefined;
    }

    if (typeof options == 'string') {
        options = {
            summary : options
        };
    }
    if (!options) {
        options = {};
    }
    if (!options.summary) {
        options.summary = 'Edited with ' + MediaWiki.userAgent.split(' ')[0];
    }

    var self = this;

    self._getEditToken(title, function(err, tokenData) {
        if (err) return cb(err);

        if (options.ignoreEditConflicts) {
            delete tokenData.basetimestamp;
            delete options.ignoreEditConflicts;
        }

        var editParams = _.extend({
            action  : 'edit',
            text    : text,
            format  : 'json'
        }, options, tokenData);

        self._doRequest('POST', 'api.php', editParams, function(err, data) {
            if (typeof cb == 'function') {
                cb(err, data);
            }
        });
    });
};

MediaWiki.prototype.getLastRevision = function(cb) {
    var self = this;

    self._query('recentchanges', {
        list    : 'recentchanges',
        prop    : 'revisions',
        rclimit : 1,
        rcdir   : 'older',
        onlyOneQuery : true
    }, cb);
};

MediaWiki.prototype.getRevision = function(revid, cb) {
    var self = this;

    self._query('pages', {
        prop   : 'revisions',
        rvprop : 'content|timestamp|comment|user|ids',
        revids : revid
    }, cb);
};

module.exports = MediaWiki;
