var fs = require('fs');
var request = require('request');
var archiver = require('archiver');
var exec = require('child_process').exec;
var findit = require('findit');

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


    function log() {
        if (options.debug) {
            console.log.call(console, arguments);
        }
    }

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

        log('[' + new Date().toString() + '] Zip file requested for: github.com/' + username + '/' + repo + '/archive/' + branch );

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
        var local_file_location = tmp_dir + '/' + username + '-' + repo + '-' + branch + '-' + Date.now();
        var local_file = fs.createWriteStream(local_file_location + '.zip');
        var ghURL = 'https://github.com/' + username + '/' + repo + '/archive/' + branch;
        var input = request(ghURL).pipe(local_file);
        log('...requesting: ' + ghURL);
        log('...saving to location: ' + local_file_location + '.zip');

        // PROBLEM AREA: UNZIPPED ARCHIVE DOES NOT GET CREATED
        input.on('close', function() {
            var cmd = 'unzip -o -d ' + tmp_dir + ' ' + local_file_location + '.zip';
            log('...executing: ' + cmd);
            var child = exec(cmd, function(err, stdout, stderr) {
                if (!err) {
                    // Walk the new file
                    var findDir = (repo + '-' + branch).replace(/\.zip$/, '');

                    log('...creating finder for dir: ' + findDir);
                    var finder = findit(findDir);
                    var expr = new RegExp('^' + findDir + '/');
                    finder.on('file', function (file, stat) {
                        archive.append(fs.createReadStream(file), { name: file.replace(expr,'') });
                    });
                    finder.on('directory', function(dir, state) {
                        archive.append(null, { name: dir.replace(expr,'') });
                    });
                    finder.on('end', function() {
                        log('...zip is finalizing');
                        archive.finalize();
                    });

                } else {
                    console.warn('...ERROR! unzip command errored: ' + stderr);
                    res.status(500);
                    res.end();
                }
            });
        });

        // Pipe archive to output
        log('...piping archive to response');
        archive.pipe(res);
    }

}
exports = module.exports = factory;