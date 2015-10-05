var libermarcadores = require('./libermarcadores');
var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var fs = require('fs');
var app = express();

app.use(express.static('html'));
app.use(bodyParser.json());

app.set('port', process.env.PORT || 8000);

var options = {
    key: fs.readFileSync('./ssl/contacts.pem'),
    cert: fs.readFileSync('./ssl/contacts.crt')
};

libermarcadores.configBD({
    url: 'localhost:27017'
});
app.use('/libermarcadores', libermarcadores);

https.createServer(options, app).listen(app.get('port'));

