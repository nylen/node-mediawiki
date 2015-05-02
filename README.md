## node-mediawiki

See the `bin` directory for examples.

### Documentation

generated with: `grep '^MediaWiki.prototype.[a-z]' lib/index.js | sed 's/$/ ... }/'`

```js
MediaWiki.prototype.listPages = function(opts, cbTitle, cbDone) { ... }
MediaWiki.prototype.listRandomPages = function(count, cbTitle, cbDone) { ... }
MediaWiki.prototype.getPageContent = function(title, cb) { ... }
MediaWiki.prototype.setPageContent = function(title, text, options, cb) { ... }
MediaWiki.prototype.getLastRevision = function(cb) { ... }
MediaWiki.prototype.getRevision = function(revid, cb) { ... }
```
