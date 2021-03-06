


/* --------------- ROUTER ------------*/

var express = require('express');
var router = express.Router();
var espacios = require('./datos');
var config = require('./config.json');
var fs = require('fs');
var path = require('path');
var auth = require('basic-auth');
var bodyParser = require('body-parser')

router.use(function(req, res, next) {
    var credenciales = auth(req);
    if (credenciales === undefined) {
        console.log('No se ingresaron credenciales de usuario');
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic');
        res.end('Acceso denegado: Usuario no autorizado');
    }
    else {
        req.credenciales = credenciales;
        next();
    }
});

router.use(bodyParser.json());




/* --------- ROUTING WEB -----------------*/

//VISTA DE ADMIN
router.get('/web/admin', function(req,res) {
    var dirFile = path.join(__dirname, 'web', 'admin.html');
    fs.stat(dirFile, function(err,stats){
        if (stats.isFile()) {
            var readFile = fs.createReadStream(dirFile);
            readFile.pipe(res);
        }
        else {
            res.statusCode = 404;
            res.end({error:"No se encontró la web para los espacios"});
        }
    })
});

router.get('/web/espacios/:path', function(req,res) {
    var pathEspacio = req.params.path,
        dirFile = path.join(__dirname, 'web', 'espacio.html');

        console.log(pathEspacio);

    fs.stat(dirFile, function(err, stats){
        if (stats.isFile()) {
            var readFile = fs.createReadStream(dirFile);
            readFile.pipe(res);
        }
        else {
            res.statusCode = 404;
            res.end({error:"No se encontró la web para los espacios"});
        }
    })
});


router.get('/js/:script', function(req,res) {
    var script = req.params.script;
    var dirFile = path.join(__dirname, 'web', 'js', script);
    fs.stat(dirFile, function(err,stats){
        if (stats.isFile()) {
            var readFile = fs.createReadStream(dirFile);
            readFile.pipe(res);
        }
        else {
            res.statusCode = 404;
            res.end({error:"No se encontró el script"});
        }
    })
});





/* -------------- ROUTING REST ------------ */
/*
//api de espacios
router.get('/rest/espacios/:path/', function(req,res) {
    var pathEspacio = req.params.path, nivel = (req.query.nivel) ? parseInt(req.query.nivel) : 0;
    espacios.espacios(req.credenciales, pathEspacio, nivel)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});*/


router.get('/rest/espacios/:path/', function(req,res) {
    var path = req.params.path;
    espacios.obtenerEspacio(req.credenciales, path)
      .then(function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch(function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});

router.post('/rest/espacios/:path/', function(req,res) {
    var pathPadre = req.params.path;
    var espacioNuevo = req.body;
    espacios.agregarEspacio(req.credenciales, pathPadre, espacioNuevo)
    .then(function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch(function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});

router.put('/rest/espacios/:path/', function(req,res) {
    var pathEspacio = req.params.path;
    var espacio = req.body;
    espacios.modificarEspacio(req.credenciales, pathEspacio, espacio, function(err,result) {
        if (err) {
            res.statusCode = err.code;
            res.send(err);
            res.end();
        }
        else {
            res.statusCode = 200;
            res.send(result);
            res.end();
        }
    })
});

router.delete('/rest/espacios/:path/', function(req,res) {
    var pathEspacio = req.params.path, nombre = req.params.nombre;
    espacios.eliminarEspacio(req.credenciales, pathEspacio)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});

//api de marcadores
router.get('/rest/espacios/:path/marcadores/', function(req, res) {
    var path = req.params.path;
    espacios.marcadores(req.credenciales, path)
    .then( function(result) {
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.send(err);
        res.end();
    });
});

router.get('/rest/espacios/:path/marcadores/:id', function(req,res) {
    var path = req.params.path;
    var id = req.params.id;
    espacios.obtenerMarcador(req.credenciales, path, id)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});

router.post('/rest/espacios/:path/marcadores/', function(req,res) {
    var path = req.params.path;
    var marcador = req.body;
    espacios.agregarMarcador(req.credenciales, path, marcador)
    .then( function(result) {
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.send(err);
        res.end();
    });
});

router.put('/rest/espacios/:path/marcadores/:id', function(req,res) {
    var path = req.params.path;
    var id = req.params.id;
    var marcador = req.body;
    espacios.modificarMarcador(req.credenciales, path, id, marcador)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});

router.delete('/rest/espacios/:path/marcadores/:id', function(req,res) {
    var path = req.params.path;
    var id = req.params.id;
    espacios.eliminarMarcador(req.credenciales, path, id)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});



//api de usuario
router.get('/rest/usuarios/', function(req, res) {
    espacios.usuarios(req.credenciales)
    .then( function(result) {
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.send(err);
        res.end();
    });
});

router.get('/rest/usuarios/:nombre', function(req,res) {
    var nombre = req.params.nombre;
    espacios.usuario(req.credenciales, nombre)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});

router.post('/rest/usuarios/', function(req,res) {
    var usuario = req.body;
    espacios.agregarUsuario(req.credenciales, usuario)
    .then( function(result) {
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.send(err);
        res.end();
    });
});
/*
router.put('/rest/usuarios/:nombre', function(req,res) {
    var usuario = req.body,
        nombre = req.params.nombre;
    espacios.modificarUsuario(req.credenciales, nombre, usuario)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});*/

router.delete('/rest/usuarios/:nombre', function(req,res) {
    var nombre = req.params.nombre;
    espacios.eliminarUsuario(req.credenciales, nombre)
    .then( function(result) {
        res.statusCode = 200;
        res.send(result);
        res.end();
    })
    .catch( function(err) {
        res.statusCode = err.code;
        res.send(err);
        res.end();
    });
});


//EXPORTO EL ROUTER
module.exports = router;
module.exports.initLibermarcadores = function() {
   return espacios.configBD(config);
}
