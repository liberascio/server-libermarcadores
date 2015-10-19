var divLista = document.getElementById('lista-marcadores');
var espacio = window.location.href;
espacio = espacio.substring(espacio.indexOf('web')+3,espacio.length)+"/";
var url = "https://localhost:8000/libermarcadores/rest" + espacio;

new Request({
    metodo: 'GET',
    url: url + "marcadores",
    header: {"Content-type": "application/json;charset=UTF-8"},
    fin: function(resp) {
        var marcadores = JSON.parse(resp);
        var ul = divLista.querySelector('ul');
        marcadores.forEach(function (marcador){
            var li = document.createElement('li');
            var texto = document.createTextNode(marcador.titulo);
            var a = document.createElement('a');
            a.href = marcador.url;
            a.appendChild(texto);
            li.appendChild(a);
            ul.appendChild(li);
        });
    }
});

divLista.querySelector('ul').addEventListener('click', function(event) {
   event.preventDefault();
   var url = event.target.href;
   if (url) 
       window.open(url);
});

document.getElementById('menu-espacio').addEventListener('click',function(event) {
    event.preventDefault();
    var opcion = event.target.getAttribute('opcion');
    if (opcion) {
        var views = this.parentNode.querySelectorAll('.view');
        views.forEach(function(view){
            view.style.display = (view.getAttribute('opcion-view')==opcion) ? 'block' : 'none';
        });      
    }  
});

document.getElementById('crear-boton').addEventListener('click', function(event) {
    var nombre = document.getElementById('crear-nombre').value;
    if (nombre.length) {
        new Request({
        metodo: 'POST',
        url: url,
        datos: JSON.stringify({nombre:nombre}),
        header: {"Content-type": "application/json;charset=UTF-8"},
        fin: function(resp) {
            console.log(resp);
         }   
        });
    }
});

document.getElementById('ver-boton').addEventListener('click', function(event) {
    new Request({
    metodo: 'GET',
    url: url + "?nivel=1",
    header: {"Content-type": "application/json;charset=UTF-8"},
    fin: function(resp) {
        console.log(resp);
     }   
    });
});

document.getElementById('mod-boton').addEventListener('click', function(event) {
    var nombre = document.getElementById('mod-nombre').value;
    var permisosStr = document.getElementById('mod-permisos').value;
    var permisos = JSON.parse(permisosStr);
    console.log(permisos);
    new Request({
    metodo: 'PUT',
    url: url,
    datos: JSON.stringify({permisos:permisos,nombre:nombre}),
    header: {"Content-type": "application/json;charset=UTF-8"},
    fin: function(resp) {
        console.log(resp);
     }   
    });
});

document.getElementById('bot-borrar').addEventListener('click', function(event) {
    if (window.confirm('Esta seguro que desea eliminar el espacio y todos sus marcadores?')) {
        new Request({
        metodo: 'DELETE',
        url: url,
        header: {"Content-type": "application/json;charset=UTF-8"},
        fin: function(resp) {
            console.log(resp);
         }   
        });    
    }
});
