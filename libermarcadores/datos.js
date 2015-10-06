
//INICIALIZACION DE VARIABLES
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var database;
var colUsuarios;
var colEspacios;
var colMarcadores;
var url;
var bd;


//FUNCION EXPORTADA PARA LA CONFIGURACION DE LA BASE DE DATOS
module.exports.configBD = function(options) {
    bd = (options.bd!=undefined) ? options.bd : "marcadores";
    url = 'mongodb://' + options.url + '/' + bd;
    colEspacios = (options.espacios!=undefined) ? options.espacios : "espacios";
    colUsuarios = (options.usuarios!=undefined) ? options.usuarios : "usuarios";
    colMarcadores = (options.marcadores!=undefined) ? options.marcadores : "marcadores";
    
    var error = null;    
    MongoClient.connect(url, function(err, db) {
       if (!err) 
           database = db;          
       else { 
           console.log("Error en conexión con Mongo",err);   
           error = err;
       }
    });     
    
    if (error)
        return {error: true, mensaje: error}
    else
        return {error:false}
}


//VERIFICO EL USUARIO Y CONTRASEÑA EN LA BASE DE DATOS
var autenticarUsuario = function(credenciales,callback) {
    console.log("Autentico usuario: ",credenciales);
    database.collection(colUsuarios)
        .find({"usuario":credenciales.name,"pass":credenciales.pass})
            .toArray(function(err, result){
                if (!err && (result.length==1)) 
                    callback(null,result);   
                else
                    callback({code:403, mensaje:'Acceso prohibido: no existe el usuario', detalle:err});
    });  
}

//VERIFICO SI EXISTE EL ESPACIO
var existeEspacio = function(pathEspacio,callback) {
    console.log("Verifico espacio: ",pathEspacio);
    database.collection(colEspacios)
        .find({"_id":pathEspacio})
            .toArray(function(err, result){
                if (!err && (result.length==1)) {
                    callback(null,result);   
                }
                else
                    callback({code:404, mensaje:'No existe el espacio especificado', detalle:err});
    });    
}

//VERIFICO SI EXISTEN LOS PERMISOS EN EL ESPACIO
var verificarPermiso = function(usuario, espacio, tipo, callback) {
    console.log("Verifico permiso: ",tipo,": ",usuario," en espacio:",espacio);
    var query = {"usuario":usuario, "espacio":espacio}; 
    if (tipo == "usuario")
       query.$or = [{"tipo":"admin"},{"tipo":"usuario"}];
    else
       query.tipo = "admin";     
    database.collection('permisos')
        .find(query)
            .toArray(function(err, result){
                if (!err && (result.length>0)) 
                    callback(null,result);    
                else
                    callback({code:403, mensaje:'Acceso prohibido: el usuario no tiene permisos', detalle:err});
    });    
}

//VERIFICA SI EXISTE EL ESPACIO Y SI EL USUARIO TIENE PERMISOS
//EN CASO DE EXITO LLAMA AL CALLBACK CON EL ESPACIO ENCONTRADO
//ESTA FUNCION CONDENSA LAS DOS ANTERIORES Y HAGO LAS DOS VERIFICACIONES EN UNA
var verificarEspacio = function(pathEspacio,usuario,tipo,callback) {
        console.log(pathEspacio)
    var pathEsp = (pathEspacio.search('.')==0 && pathEspacio!="root") ? 'root.' + pathEspacio : pathEspacio;
    var query = {path:pathEsp, permisos:{$elemMatch: {usuario: usuario}}};
    if (tipo == "usuario")
       query.permisos.$elemMatch.$or = [{tipo: "admin"},{tipo:"usuario"}]
    else
       query.permisos.$elemMatch.tipo = "admin";

    database.collection(colEspacios)
        .find(query)
            .toArray(function(err, result){
                if (!err && (result.length==1)) {
                    callback(null,result[0]);   
                }
                else
                    callback({code:404, mensaje:'No existe el espacio o el usuario no tiene permisos', detalle:err});
    });    
}

String.prototype.obtenerPadre = function () {
    return this.substring(0,this.lastIndexOf('.'));
}





/* ------------------------------ API DE ESPACIOS ------------------------------- */

//Obtener todos los subespacios de un espacio
module.exports.espacios = function(credencial, pathEspacio, nivel, callback) {
    var regExpNivel = (nivel>0) ? "{"+nivel+"}$" : "+";
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'usuario', function(err,espacio) {
            var expresion = pathEspacio+"(.(\\w|\\d)+)"+regExpNivel;            
            database.collection(colEspacios)
                .find({path:new RegExp(expresion), permisos:{$elemMatch: {usuario:credencial.name} } })
                    .toArray(function(err, result){
                        if (!err) 
                            callback(null,result);
                        else
                            callback({code:500, mensaje:'No se encontraron espacios', detalle:err});
            });                  
        });
    })    
}



//Obtener un subespacio del espacio
module.exports.obtenerEspacio = function(credencial, pathPadre, nombre, callback) {    
    autenticarUsuario(credencial, function() {
        var pathEspacio = pathPadre + "." + nombre;
        verificarEspacio(pathEspacio, credencial.name, 'usuario', function(err,espacio) {
            callback(null,espacio);                  
        });
    }); 
}


//Agregar un nuevo subespacio
module.exports.agregarEspacio = function(credencial, pathPadre, espacioNuevo, callback) {
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathPadre,credencial.name,'usuario', function(err,espacio) {
            espacioNuevo.path = pathPadre + "." + espacioNuevo.nombre;
            espacioNuevo.permisos = [];
            espacioNuevo.permisos = espacio.permisos.filter(function(permiso) {
                return (permiso.tipo=="admin");                
            });                   
            espacioNuevo.marcadores = [];
            database.collection(colEspacios).insertOne(espacioNuevo, function(err, result){
                if (!err) 
                    callback(null,result);   
                else
                    callback({code:500, mensaje:'No se pudo agregar el espacio', detalle:err});
            });                  
        });
    }); 
}


//Modificar un espacio
module.exports.modificarEspacio = function(credencial, pathEspacio, espacioNuevo, callback) {
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name, 'admin', function(err,espacio) {
            if (!err) {
                if (!espacioNuevo.permisos)
                    espacioNuevo.permisos = espacio.permisos;
                if (!espacioNuevo.marcadores && espacio.marcadores)
                    espacioNuevo.marcadores = espacio.marcadores;  
                espacioNuevo.path = pathEspacio.obtenerPadre() + "." + espacioNuevo.nombre;           
                verificarEspacio(espacioNuevo.path, credencial.name, 'admin', function(err,espacio) {
                    if (err) {
                        database.collection(colEspacios).updateOne({"path":pathEspacio}, espacioNuevo,
                            function(err,result) {
                                if (!err)
                                    callback(null,result);
                                else
                                    callback({code:500, mensaje:'No se pudo modificar el espacio', detalle:err});		

                            });                      
                    }
                    else
                        callback({code:500, mensaje:'Ya existe el espacio con el nombre nuevo', detalle:err});
                });                       
            }          
            else
                callback({code:500, mensaje:'No existe el espacio', detalle:err});
        });	
    });    
}

//Borrar un Espacio con su nombre
module.exports.eliminarEspacio = function(credencial, pathEspacio, callback) {
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name, 'admin', function(err,espacio) {
            var expresion = pathEspacio+".*";
            database.collection(colEspacios).remove({"path":new RegExp(expresion)},
                function(err,result) {
                    if (!err)
                        callback(null,result);
                    else
                        callback({code:500, mensaje:'No se pudo eliminar el espacio', detalle:err});		
            });
        });         
    });
}


/* ------------------------ API MARCADORES -----------------------*/

   
// Obtener todos los marcadores del espacio    
module.exports.marcadores = function(credencial, pathEspacio, callback) {
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'usuario', function(err,espacio) {
            if (err)

                callback(err)
            else
                callback(null,espacio.marcadores);
        });
    });           
}


//Obtener un marcador del espacio con su id
module.exports.obtenerMarcador = function(credencial, pathEspacio, id, callback) {
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'usuario', function(err,espacio) {
            var marcador = espacio.marcadores.filter(function(marcador){
                return (id==marcador.id); 
            })[0];
            if (marcador==undefined)
                callback({code:404, mensaje:'No existe el marcador'});		
            else
                callback(null,marcador);
        });
    });  
}



//Agregar un nuevo marcador
module.exports.agregarMarcador = function(credencial, pathEspacio, marcador,callback) {
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'usuario', function(err,espacio) {
            marcador.creador = credencial.name;
            marcador.id = new ObjectId();
            database.collection(colEspacios).update({_id:espacio._id}, {$push:{marcadores:marcador}},
                function(err, result){
                    if (!err) 
                        callback(null,result);    
                    else
                        callback({code:500, mensaje:'No se pudo agregar el marcador', detalle:err});		
            });                        
        });
    });      
}



//Modificar un marcador con su id
module.exports.modificarMarcador = function(credencial, pathEspacio, id, marcador, callback) {   
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'admin', function(err,espacio) {
            var marcadores = espacio.marcadores.filter(function(marcador){
                return (id!=marcador.id); 
            });
            if (marcadores.length==espacio.marcadores.length)
                callback({code:404, mensaje:'No existe el marcador'});		    
            else {   
                marcador.id = id;
                marcadores.push(marcador);
                database.collection(colEspacios).update({_id:pathEspacio}, {marcadores:marcadores,permisos:espacio.permisos},
                    function(err, result){
                        if (!err) 
                            callback(null,result);    
                        else
                            callback({code:500, mensaje:'No se pudo modificar el marcador', detalle:err});		
                });                 
            }                       
        });
    });         
}


//Modificar un marcador con su id
module.exports.eliminarMarcador = function(credencial, pathEspacio, id, callback) {   
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'admin', function(err,espacio) {
            var marcadores = espacio.marcadores.filter(function(marcador){
                return (id!=marcador.id); 
            });
            if (marcadores.length==espacio.marcadores.length)
                callback({code:404, mensaje:'No existe el marcador', detalle:err});		    
            else {               
                database.collection(colEspacios).update({_id:pathEspacio}, {permisos:espacio.permisos, marcadores:marcadores},
                    function(err, result){
                        if (!err) 
                            callback(null,result);    
                        else
                            callback({code:500, mensaje:'No se pudo eliminar el marcador', detalle:err});		
                });                 
            }                       
        });
    });         
}
