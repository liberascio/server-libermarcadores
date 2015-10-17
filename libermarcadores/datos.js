
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
module.exports.configBD = function(options, callback) {
    bd = (options.bd!=undefined) ? options.bd : "marcadores";
    url = 'mongodb://' + options.url + '/' + bd;
    colEspacios = (options.espacios!=undefined) ? options.espacios : "espacios";
    colUsuarios = (options.usuarios!=undefined) ? options.usuarios : "usuarios";
    colMarcadores = (options.marcadores!=undefined) ? options.marcadores : "marcadores";
    
    var error = null;    
    MongoClient.connect(url, function(err, db) {
       if (!err) {
           database = db;    
           callback(null,{error:false});
        }
       else { 
           console.log("Error en conexión con Mongo",err);
           callback(err,{error: true, msg: error});             
   
       }
    });             
}

//INICIO LA BASE DE DATOS, NUEVAS BASES Y SUPERADMIN
module.exports.initDB = function(superadmin) {
    if (database) {
        database.dropDatabase(function(err,result) {
            if(!err) {
                database.collection(colUsuarios)
                    .insert({username:superadmin.username,pass:superadmin.pass, super:true}, function(err,result) {
                        if (err)
                            console.log("No puedo crearse superadmin");            
                    });
                database.collection(colEspacios)
                    .insert({path:'root', permisos:[{tipo:'admin', usuario:superadmin.username}]}, function(err,result) {
                        if (err)
                            console.log("No puedo crearse superadmin");
                    });             
            }
        });  
        return;          
    }

    database.collection(colUsuarios)
        .insert({username:superadmin.username,pass:superadmin.pass, super:true}, function(err,result) {
            if (err)
                console.log("No puedo crearse superadmin");            
        });
    database.collection(colEspacios)
        .insert({path:'root', permisos:[{tipo:'admin', usuario:superadmin.username}]}, function(err,result) {
            if (err)
                console.log("No puedo crearse superadmin");
        });        
        
}


var existeUsuario  = function(colUsuarios, credenciales) {
    var username = credenciales.name;
    var pass = credenciales.pass;
    return new Promise(function(resolve,reject) { 
        database.collection(colUsuarios)
            .find({"username":username,"pass":pass})
                .toArray(function(err, result){
                    if (!err && (result.length==1)) 
                        resolve(result);   
                    else
                        reject({code:403, msg:'Acceso prohibido: no existe el usuario', error:err});
        });     
    });
}    

//VERIFICO EL USUARIO Y CONTRASEÑA EN LA BASE DE DATOS
var autenticarUsuario = function(credenciales,callback) {
    console.log("Autentico usuario: ",credenciales);
    database.collection(colUsuarios)
        .find({"username":credenciales.name,"pass":credenciales.pass})
            .toArray(function(err, result){
                if (!err && (result.length==1)) 
                    callback(null,result);   
                else
                    callback({code:403, msg:'Acceso prohibido: no existe el usuario', error:err});
    });  
}

//VERIFICO SI EXISTE EL ESPACIO
var existeEspacio = function(colEspacios, pathEspacio) {
    var pathEsp = (pathEspacio.search('.')==0 && pathEspacio!="root") ? 'root.' + pathEspacio : pathEspacio;
    return new Promise( function(resolve, reject) {
        database.collection(colEspacios)
            .find({path:pathEsp})
                .toArray(function(err, result){
                    if (!err && (result.length==1)) 
                        resolve(result[0]);
                    else
                        reject({code:404, msg:'No existe el espacio especificado', error:err});
        });         
    });   
}

/*
//VERIFICO SI EXISTEN LOS PERMISOS EN EL ESPACIO
var verificarPermiso = function(usuario, espacio, tipo, callback) {
    console.log("Verifico permiso: ",tipo,": ",usuario," en espacio:",espacio);
    var query = {"username":usuario, "espacio":espacio}; 
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
                    callback({code:403, msg:'Acceso prohibido: usuario inexistente', error:err});
    });    
}*/

/*
//VERIFICA SI EXISTE EL ESPACIO Y SI EL USUARIO TIENE PERMISOS
//EN CASO DE EXITO LLAMA AL CALLBACK CON EL ESPACIO ENCONTRADO
//ESTA FUNCION CONDENSA LAS DOS ANTERIORES Y HAGO LAS DOS VERIFICACIONES EN UNA
var verificarEspacio = function(pathEspacio,usuario,tipo,callback) {
    var pathEsp = (pathEspacio.search('.')==0 && pathEspacio!="root") ? 'root.' + pathEspacio : pathEspacio;
    var query = {path:pathEsp, permisos:{$elemMatch: {username: usuario}}};
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
                    callback({code:404, msg:'No existe el espacio o el usuario no tiene permisos', error:err});
    });    
}*/

String.prototype.obtenerPadre = function () {
    return this.substring(0,this.lastIndexOf('.'));
}

function verificarPermiso(usuario, espacio, tipo) {
    //BUSCO UN PERMISO PARA EL USUARIO
    var permisos = espacio.permisos.filter(function(perm) {
        return (perm.usuario==usuario);
    });
    if (tipo=='usuario') {
        return (permisos.length>0) 
    }
    else if (tipo=='admin') {
        return (permisos.filter(function(perm){
            return (perm.tipo==tipo);
        }).length>0)
    }
}





/* ------------------------------ API DE ESPACIOS ------------------------------- */

//Obtener todos los subespacios de un espacio
module.exports.espacios = function(credencial, pathEspacio, nivel) {
    var usuario, espacio, expresion, regExpNivel = (nivel>0) ? "{"+nivel+"}$" : "+";
    expresion = pathEspacio + "(.(\\w|\\d)+)" + regExpNivel;   
    
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathEspacio)
         })
        .then( function(espacioResult) {
            database.collection(colEspacios)
                .find({path:new RegExp(expresion), permisos:{$elemMatch: {usuario:credencial.name} }})
                    .toArray(function(err, result){
                        if (!err) 
                            resolve({code:200, result:result, msg:'OK'});
                        else
                            reject({code:500, msg:'No se encontraron espacios', error:err});
            });      
        })
        .catch(function(err) {
            reject(err);
        });        
    });             
}


/*
//Obtener un subespacio del espacio
module.exports.obtenerEspacio = function(credencial, pathPadre, nombre, callback) {    
    autenticarUsuario(credencial, function() {
        var pathEspacio = pathPadre + "." + nombre;
        verificarEspacio(pathEspacio, credencial.name, 'usuario', function(err,espacio) {
            callback(null,espacio);                  
        });
    }); 
}*/


//Agregar un nuevo subespacio
module.exports.agregarEspacio = function(credencial, pathPadre, espacioNuevo) {
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathPadre)
         })
        .then( function(espacioResult) {
            espacioNuevo.path = espacioResult.path + "." + espacioNuevo.nombre;
            espacioNuevo.permisos = [];
            espacioNuevo.permisos = espacioResult.permisos.filter(function(permiso) {
                return (permiso.tipo=="admin");                
            });                   
            espacioNuevo.marcadores = [];
            database.collection(colEspacios).insertOne(espacioNuevo, function(err, result){
                if (!err) 
                    resolve({code:200, result:result, msg:'OK'});   
                else
                    reject({code:500, msg:'No se pudo agregar el espacio', error:err});
            });    
        })
        .catch(function(err) {
            reject(err);
        });        
    }); 
}


/* ESTA FUNCION HAY QUE CAMBIARLA PARA USAR PROMESAS
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
                                    callback({code:500, msg:'No se pudo modificar el espacio', error:err});		

                            });                      
                    }
                    else
                        callback({code:500, msg:'Ya existe el espacio con el nombre nuevo', error:err});
                });                       
            }          
            else
                callback({code:500, msg:'No existe el espacio', error:err});
        });	
    });    
}*/



//Borrar un Espacio con su nombre
module.exports.eliminarEspacio = function(credencial, pathEspacio) {
    var expresion = pathEspacio + ".*";
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathEspacio)
         })
        .then( function(espacioResult) {
            database.collection(colEspacios).remove({path:new RegExp(expresion), 
                permisos:{$elemMatch:{usuario:credencial.name, tipo:'admin'}}},
                function(err,result) {
                    if (!err)
                        resolve({code:200, result:result, msg:'OK'});
                    else
                        reject({code:500, msg:'No se pudo eliminar el espacio', error:err});		
            });      
        })
        .catch(function(err) {
            reject(err);
        });        
    }); 
}


/* ------------------------ API MARCADORES -----------------------*/

   
// Obtener todos los marcadores del espacio    
module.exports.marcadores = function(credencial, pathEspacio) {
    var permiso,
        user;         
    
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathEspacio)
         })
        .then( function(espacioResult) {
            if (verificarPermiso(credencial.name, espacioResult, 'usuario') ) {
                resolve({code:200, result:espacioResult.marcadores, msg:'OK'});
            }
            else 
                reject({code:401, msg:'Usuario sin permisos necesario'});            
        })
        .catch(function(err) {
            reject(err);
        });        
    });     
}


//Obtener un marcador del espacio con su id
module.exports.obtenerMarcador = function(credencial, pathEspacio, id) {
    var permiso,
        marcador;         
    
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathEspacio)
         })
        .then( function(espacioResult) {
           if (verificarPermiso(credencial.name, espacioResult, 'usuario')) {
                marcador = espacioResult.marcadores.filter(function(mark){
                    return (id==mark.id); 
                })[0];
                if (marcador==undefined)
                    reject({code:404, msg:'No existe el marcador'});		
                else
                    resolve({code:200, result:marcador, msg:'OK'});
            }
            else {
                reject({code:401, msg:'Usuario sin permisos necesario'});
            }            
        })
        .catch(function(err) {
            reject(err);
        });        
    });     
}



//Agregar un nuevo marcador
module.exports.agregarMarcador = function(credencial, pathEspacio, marcador) {  
    var permiso;         
    
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathEspacio)
         })
        .then( function(espacioResult) {
            if (verificarPermiso(credencial.name, espacioResult, 'admin')) {            
                marcador.creador = credencial.name;
                marcador.id = new ObjectId();
                database.collection(colEspacios).update({_id:espacioResult._id}, {$push:{marcadores:marcador}},
                    function(err, result){
                        if (!err) 
                            resolve({code:200, msg:'OK'})
                        else
                            reject({code:500, msg:'No se pudo agregar el marcador', error:err});		
                });       
            }
            else {
                reject({code:401, msg:'Usuario sin permisos necesario'});
            }
            
        })
        .catch(function(err) {
            reject(err);
        });        
    });     
}


/* FALTA CAMBIAR A PROMESAS
//Modificar un marcador con su id
module.exports.modificarMarcador = function(credencial, pathEspacio, id, marcador, callback) {   
    autenticarUsuario(credencial, function() {
        verificarEspacio(pathEspacio,credencial.name,'admin', function(err,espacio) {
            var marcadores = espacio.marcadores.filter(function(marcador){
                return (id!=marcador.id); 
            });
            if (marcadores.length==espacio.marcadores.length)
                callback({code:404, msg:'No existe el marcador'});		    
            else {   
                marcador.id = id;
                marcadores.push(marcador);
                database.collection(colEspacios).update({_id:pathEspacio}, {marcadores:marcadores,permisos:espacio.permisos},
                    function(err, result){
                        if (!err) 
                            callback(null,result);    
                        else
                            callback({code:500, msg:'No se pudo modificar el marcador', error:err});		
                });                 
            }                       
        });
    });         
*/



//Eliminar un marcador con su id
module.exports.eliminarMarcador = function(credencial, pathEspacio, id, callback) {   
    var permiso,
        marcadores;         
    
    return new Promise(function(resolve, reject) {
        existeUsuario(colUsuarios, credencial)
        .then( function(usuarioResult) {
                  user = usuarioResult;
                  return existeEspacio(colEspacios, pathEspacio)
         })
        .then( function(espacioResult) {
            if (verificarPermiso(credencial.name, espacioResult, 'admin')) {
                marcadores = espacio.marcadores.filter(function(marcador){
                    return (id!=marcador.id); 
                });
                if (marcadores.length==espacio.marcadores.length) {
                    callback({code:404, msg:'No existe el marcador'});		    
                }
                else {               
                    database.collection(colEspacios).update({_id:espacioResult._id}, {permisos:espacioResult.permisos, marcadores:marcadores},
                        function(err, result){
                            if (!err) 
                                resolve({code:200, result:result, msg:'OK'});    
                            else
                                reject({code:500, msg:'No se pudo eliminar el marcador', error:err});		
                    });                 
                }            
            }
            else {
                reject({code:401, msg:'Usuario sin permisos necesario'});
            }
            
        })
        .catch(function(err) {
            reject(err);
        });        
    });     
}
