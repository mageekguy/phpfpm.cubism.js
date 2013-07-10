# Phpfpm.cubism.js

## A realtime monitoring for PHP-FPM made with [cubism.js](http://square.github.io/cubism/)

![screenshot](/screenshot.png?raw=true)

To use it, first, put contents of directories `js` and `css` file in a directory.  

Second, in the `head` section of an HTML file, add:
```
<script type="text/javascript" src="url/to/directory/js/d3.3.2.4.min.js" charset="utf-8"></script>
<script type="text/javascript" src="url/to/directory/js/cubism.1.3.0.min.js" charset="utf-8"></script>
<script type="text/javascript" src="url/to/directory/js/phpfpm.cubism.min.js" charset="utf-8"></script>
<link rel="stylesheet" href="url/to/directory/css/phpfpm.cubism.css" type="text/css" media="screen" />
```

Third, in the `body` section of your HTML file, add:
```
<div id="phpFpmMonitoring"></div>
<script type="text/javascript">cubism.phpfpm.monitoring('http://url/to/php/fpm/status', 1e3, 960).display('#phpFpmMonitoring');</script>
```

Moreover, you must enable PHP-FPM status page on your web server.  
To do that, just give the value `/status` or whatever you want to the directive `pm.status_page` in your PHP-FPM configuration file.--
Do not omit to restart PHP-FPM!  

At last, you should allow acces to your IP to `/status` in your web server.  
With [nginx](http://wiki.nginx.org/Main), add in its configuration file:
```
location /status {
    fastcgi_pass 127.0.0.1:9000; # Or use an UNIX socket
    fastcgi_index index.php;
    fastcgi_param  SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
    allow 127.0.0.1; # Allow your IP here
    deny all;
}
```
Do not omit to restart [nginx](http://wiki.nginx.org/Main)!
