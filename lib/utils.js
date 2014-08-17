exports.fatalError = function(err) {
    console.error.apply(null, arguments);
    process.exit(1);
};

exports.setDefaultHandlers = function(wiki) {
    wiki.on('error', function(err) {
        exports.fatalError('Error: ' + (err.message || err));
    });

    wiki.on('message', console.error);
};
