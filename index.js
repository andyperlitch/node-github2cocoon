var path = require('path');
var fs = require('fs');
var request = require('request');
var exec = require('child_process').exec;

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

        // Get input, pipe to file
        var local_file_location = tmp_dir + '/' + username + '-' + repo + '-' + branch + '-' + Date.now();
        var local_file = fs.createWriteStream(local_file_location + '.zip');
        var ghURL = path.join('https://github.com',username,repo,branch;
        var input = request(ghURL).pipe(local_file);
        log('...requesting: ' + ghURL);
        log('...saving to location: ' + local_file_location + '.zip');

        // PROBLEM AREA: UNZIPPED ARCHIVE DOES NOT GET CREATED
        input.on('close', function() {
            var cmd = 'unzip -o -d ' + tmp_dir + ' ' + local_file_location + '.zip';
            log('...executing: ' + cmd);
            exec(cmd, function(err, stdout, stderr) {
                if (!err) {
                    var repoBranchRoot = (repo + '-' + branch).replace(/\.zip$/, '');
                    var finalzip = tmp_dir + '/' + repoBranchRoot + '.zip';
                    var cmd2 = 'zip -r ' + finalzip + ' ' + path.join(tmp_dir,repoBranchRoot, '*');
                    log('...executing: ' + findDir);
                    exec(cmd2, function(err) {
                        if (!err) {
                            log('...zip successful, opening read stream to: ' + finalzip);
                            fs.createReadStream(finalzip).pipe(res);
                        } else {
                            log('...ERROR: could not perform zip operation.');
                            res.status(500);
                            res.end();
                        }
                    })

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