var crypto = require('crypto'),
    http = require('http'),
    https = require('https'),
    _ = require('underscore'),
    util = require('util');

// From http://stackoverflow.com/questions/7516036/problems-with-digest-authentication-with-http-client-in-node-js

exports.doRequest = function(options, callback) {
    var reqOptions = _.extend({
        'method': 'GET'
    }, options);
    var req = https.request(reqOptions, function(resp) {
        resp.setEncoding('utf-8');
        resp.on('end', function() {
            var challengeParams = parseDigest(resp.headers['www-authenticate']);
            var ha1 = md5(reqOptions.username + ':' + challengeParams.realm + ':' + reqOptions.password);
            var ha2 = md5(reqOptions.method + ':' + reqOptions.path);
            var response = md5(ha1 + ':' + challengeParams.nonce + ':1::auth:' + ha2);
            reqOptions.headers = {
                'Authorization': renderDigest({
                    username: reqOptions.username,
                    realm: challengeParams.realm,
                    nonce: challengeParams.nonce,
                    uri: reqOptions.path,
                    qop: challengeParams.qop,
                    response: response,
                    nc: '1',
                    cnonce: '',
                })
            };
            var req2 = https.request(reqOptions, function(resp) {
                var content = '';
                resp.setEncoding('utf-8');
                resp.on('data', function(chunk) {
                    content += chunk;
                }).on('end', function() {
                    if (resp.statusCode == 200) {
                        callback(content);
                    } else {
                        throw new Error(util.format(
                            'Request error code %d: %s',
                            resp.statusCode, http.STATUS_CODES[resp.statusCode]));
                    }
                });
            }).on('error', function(err) {
                throw new Error('Request error: ' + err);
            });
            if (options.body) {
                req2.write(options.body);
            }
            req2.end();
        });
    });
    if (options.body) {
        req.write(options.body);
    }
    req.end();
};

function parseDigest(header) {
    return _(header.substring(7).split(/,\s+/)).reduce(function(obj, s) {
        var eqPos = s.indexOf('='),
            key = s.substring(0, eqPos),
            val = s.substring(eqPos + 1).replace(/"/g, '');
        obj[key] = val;
        return obj;
    }, {})
}

function renderDigest(params) {
    var s = _(_.keys(params)).reduce(function(s1, ii) {
        return s1 + ', ' + ii + '="' + params[ii] + '"';
    }, '')
    return 'Digest ' + s.substring(2);
}

function md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}
