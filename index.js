var libermarcadores = require('./libermarcadores');
var config = require('./config.json');
var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));
var app = express();

app.use(express.static('html'));
app.use(bodyParser.json());

app.set('port', process.env.PORT || config.port);

var options = {
    key: fs.readFileSync(config.ssl+'.pem'),
    cert: fs.readFileSync(config.ssl+'.crt')
};


libermarcadores.configBD({
    url: config['mongo-host']+":"+config['mongo-port']
}, function(err,result) {

    console.log(argv);

    if (argv['init']) {
        if (argv['admin'] && argv['pass']) {
            libermarcadores.initDB({username:argv['username'], pass:argv['pass']});        
        }
        else
            console.log("No se han especificado datos del admin. Ej: --user=martin --pass=123");
    } 

    app.use('/libermarcadores', libermarcadores);

    https.createServer(options, app).listen(app.get('port'),config.host);

});




