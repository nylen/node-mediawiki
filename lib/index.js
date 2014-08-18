var events  = require('events'),
    http    = require('http'),
    request = require('request'),
    util    = require('util'),
    _       = require('underscore');

function MediaWiki(wiki) {
    var self = this;

    if (typeof wiki == 'string') {
        wiki = MediaWiki.config[wiki] || {
            baseUrl : wiki
        };
    }

    wiki.baseUrl = wiki.baseUrl.replace(/\/+$/, '');
    if (!/^https?:/.test(wiki.baseUrl)) {
        wiki.baseUrl = 'http://' + wiki.baseUrl;
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

MediaWiki.userAgent = 'MediaWikiAutomation/0.1 (' + [
    'https://github.com/nylen/node-mediawiki',
    'jnylen@gmail.com'
].join('; ') + ')';

MediaWiki.config = {};

MediaWiki.pageTitleToFilename = function(title) {
    return title.replace(/[^a-z0-9 #.-]/gi, '_') + '.wiki';
};

function tryGetTitle(body) {
    if (typeof body == 'string' && body.length > 200) {
        body = body.split('</title>')[0];
        body = body.split('<title>')[1] || body;
    }
    return body;
}

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

        var loginOptions = {
            action     : 'login',
            format     : 'json',
            lgname     : self.wiki.username,
            lgpassword : self.wiki.password
        };
        self._doRequest('POST', 'api.php', loginOptions, function(data) {
            switch (data && data.login && data.login.result) {
                case 'Success':
                    loggedIn();
                    break;

                case 'NeedToken':
                    loginOptions.lgtoken = data.login.token;
                    self._doRequest('POST', 'api.php', loginOptions, function(data) {
                        if (!data || !data.login || data.login.result != 'Success') {
                            self.emit('error', 'Login failed: ' + util.format(data));
                            return;
                        }
                        loggedIn();
                    });
                    break;

                default:
                    self.loggingIn = false;
                    self.emit('error', 'Login failed: ' + util.format(data));
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
            self.emit('error', error);
        } else if (response.statusCode != 200) {
            self.emit('error', tryGetTitle(body)
                || ('HTTP ' + response.statusCode + ' ' + http.STATUS_CODES[response.statusCode]));
        } else {
            if (response.headers['content-type']) {
                var contentType = response.headers['content-type'].split(';')[0];
                if (contentType == 'application/json') {
                    body = JSON.parse(body);
                }
            }
            if (body && body.error) {
                self.emit('error', 'MediaWiki says: '
                    + (body.error.info || util.inspect(body.error)));
            }
            cb(body);
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

    if (continueData) {
        params = _.extend({}, params, continueData);
    }
    self._doRequest('api.php', params, function(data) {
        if (!data.query) {
            data = tryGetTitle(data);
            self.emit('error', data);
            return;
        }
        var result = data.query[action];
        for (var i in result) {
            cbData(result[i]);
        }
        if (data['query-continue']) {
            self._queryChunk(action, params,
                data['query-continue'][action],
                cbData, cbDone);
        } else if (typeof cbDone == 'function') {
            cbDone();
        }
    });
};

MediaWiki.prototype.listPages = function(cbTitle, cbDone) {
    var self = this;

    self._query('allpages', {
        list    : 'allpages',
        aplimit : 500
    }, function(d) {
        cbTitle(d.title);
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
    }, function(data) {
        if (!data.query || !data.query.pages) {
            self.emit('error', 'Bad edit token result: ' + util.inspect(data));
            return;
        }
        for (var i in data.query.pages) {
            var page = data.query.pages[i];
            if (!page.edittoken) {
                var msg = 'Failed to get edit token.';
                if (data.warnings) {
                    msg += '  ' + util.format(data.warnings);
                }
                self.emit('error', msg);
                return;
            }
            cb({
                token          : page.edittoken,
                basetimestamp  : page.touched,
                starttimestamp : page.starttimestamp,
                title          : page.title
            });
            return;
        }
    });
};

MediaWiki.prototype.setPageContent = function(title, text, summary, cb) {
    if (typeof summary == 'function' && !cb) {
        cb      = summary;
        summary = undefined;
    }

    var self = this;

    self._getEditToken(title, function(tokenData) {
        var editParams = _.extend({
            action  : 'edit',
            text    : text,
            summary : summary,
            format  : 'json'
        }, tokenData);
        self._doRequest('POST', 'api.php', editParams, function(data) {
            if (typeof cb == 'function') {
                cb(data);
            }
        });
    });
};

module.exports = MediaWiki;
