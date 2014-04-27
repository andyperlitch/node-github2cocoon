github2cocoon
=============
Express.js middleware to use a github repository/branch as a zip file endpoint for the [CocoonJS Launcher](http://support.ludei.com/hc/en-us/articles/201048463-How-to-use).

motivation
----------
Ludei's CocoonJS Launcher allows you to specify a URL endpoint for a zip containing your app. I wanted to use Github's archive endpoints (e.g. https://github.com/[USERNAME]/[REPO]/archive/[BRANCH].zip) for this purpose so that I could push to GH and then immediately test on my phone. This turns out not to work because Github packages the zip archive in a way that cocoon cannot find and execute the proper files. This middleware transforms the zip archive in a cocoon-compatible way.

usage
-----

```JavaScript
// Run this node server at an endpoint your 
// phone with cocoonjs launcher can reach.
var express = require('express');
var app = express();
var github2cocoon = require("github2cocoon");

app.use(github2cocoon("/zips/", { username: "andyperlitch" }));
app.listen(80);
```

Then, put your server url into the Launcher:
![CocoonJS Launcher screenshot](/screenshot.png)