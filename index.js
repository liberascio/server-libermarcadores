var libermarcadores = require('./libermarcadores');
var config = require('./config.json');
var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var fs = require('fs');
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

    if (process.argv[2] == '-init')
        libermarcadores.initDB(config.superadmin);

    app.use('/libermarcadores', libermarcadores);

    https.createServer(options, app).listen(app.get('port'),config.host);

});




