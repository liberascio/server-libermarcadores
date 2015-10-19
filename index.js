var libermarcadores = require('./libermarcadores');
var express = require('express');;
var fs = require('fs');
var https = require('https');
var app = express();


var options = {
    key: fs.readFileSync('./ssl/contacts.pem'),
    cert: fs.readFileSync('./ssl/contacts.crt')
};

app.use('/libermarcadores', libermarcadores);
libermarcadores.initLibermarcadores()
.then(function(result) {
  console.log(result);
})
.catch(function(err) {
  console.log(err)
})

https.createServer(options, app).listen(8000);
