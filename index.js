var fs = require('fs');
var unzip = require('unzip');
var request = require('request');
var archiver = require('archiver');

function factory(root, options) {

    if (!root || typeof root !== 'string') {
        throw new Error('root path required (first argument, e.g.: app.use(github2cocoon("/ludei_zips/", { username: "andyperlitch" }));');
    }

    options = options || {};

    // Store predefined username
    var predefined_user = options.username || false;

    // Ensure that root starts and ends with a slash
    root = root.replace(/^\/*/, '/').replace(/\/*$/, '/');

    // Define location for temporary zip files
    var tmp_dir = options.tmp_dir || '/tmp';

    // RegEx to test paths
    var exp = predefined_user
        ? new RegExp('^' + root + '([^\/]+)/([^\/]+)') 
        : new RegExp('^' + root + '([^\/]+)/([^\/]+)/([^\/]+)');

    return function(req, res, next) {

        var url = req.url;

        var result = exp.exec(url);

        if (!result) {
            return next();
        }

        // username, repo, branch
        var username, repo, branch;
        if (predefined_user) {
            username = predefined_user;
            repo = result[1];
            branch = result[2];
        } else {
            username = result[1];
            repo = result[2];
            branch = result[3];
        }

        // The archive stream
        var archive = archiver('zip', {
            // Pass options to underlying
            // zlib library
            zlib: {
                // Set this higher than default, cocoon launcher complains a lot
                // otherwise. This could use some tweaking
                windowBits: 14, 
                memLevel: 7
            }
        });

        // Will hold name of parent directory
        var rootDirName;

        // Get input, pipe to file
        var local_file_location = tmp_dir + '/' + username + '-' + repo + '-' + branch + '-' + Date.now() + '.zip';
        var local_file = fs.createWriteStream(local_file_location);
        var input = request('https://github.com/' + username + '/' + repo + '/archive/' + branch).pipe(local_file);

        input.on('close', function() {
            
            var output = fs.createReadStream(local_file_location)
            // .pipe(unzip.Parse());

            // // Pass all but our parent directory to
            // // archiver.
            // output.on('entry', function(entry) {
            //     var filepath = entry.path;
            //     if (!rootDirName) {
            //         rootDirName = filepath;
            //         entry.autodrain();
            //     } else {
            //         // Strip name of parent dir
            //         archive.append(entry, { name: entry.path.replace(rootDirName, '') });
            //     }
            // });

            // // Finalize the archive when input has closed.
            // output.on('close', function() {
            //     archive.finalize();
            // });

            // // Emit to response
            // archive.pipe(res);
            output.pipe(res);
        });
    }

}
exports = module.exports = factory;