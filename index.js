var unzip = require('unzip');
var request = require('request');
var archiver = require('archiver');

function factory(root, options) {

    if (!root || typeof root !== 'string') {
        throw new Error('root path required (first argument, e.g.: app.use(github2cocoon("/ludei_zips/", { username: "andyperlitch" }));');
    }

    if (!options || !options.username) {
        throw new Error('you must provide a github username, e.g.: app.use(github2cocoon("/ludei_zips/", { username: "andyperlitch" }));');
    }

    // Store the username
    var username = options.username;

    // Ensure that root starts and ends with a slash
    root = root.replace(/^\/*/, '/').replace(/\/*$/, '/');

    // RegEx to test paths
    var exp = new RegExp('^' + root + '([^\/]+)/([^\/]+)');

    return function(req, res, next) {

        var url = req.url;

        var result = exp.exec(url);

        if (!result) {
            return next();
        }

        // repo, branch
        var repo = result[1];
        var branch = result[2];

        // The archive stream
        var archive = archiver('zip');

        // Will hold name of parent directory
        var rootDirName;

        // Get input, pipe to unzip utility
        var input = request('https://github.com/' + username + '/' + repo + '/archive/' + branch).pipe(unzip.Parse());

        // Pass all but our parent directory to
        // archiver.
        input.on('entry', function(entry) {
            var filepath = entry.path;
            if (!rootDirName) {
                rootDirName = filepath;
                entry.autodrain();    
            } else {
                // Strip name of parent dir
                archive.append(entry, { name: entry.path.replace(rootDirName, '') });
            }
        });

        // Finalize the archive when input has closed.
        input.on('close', function() {
            archive.finalize();
        });

        // Emit to response
        archive.pipe(res);
    }

}
exports = module.exports = factory;