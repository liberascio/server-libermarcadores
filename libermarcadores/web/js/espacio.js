var divLista = document.getElementById('lista-marcadores'),
  urlEspacio = window.location.href.substring(window.location.href.indexOf('web')
    + 3, window.location.href.length)+"/",
  urlBasica = "https://localhost:8000/libermarcadores/rest",
  url = urlBasica + urlEspacio,
  espacio;


new Request({
    metodo: 'GET',
    url: url,
    header: {"Content-type": "application/json;charset=UTF-8"},
    fin: function(resp) {
        var ul = divLista.querySelector('ul'),
            marcadores,
            response = JSON.parse(resp);

        espacio = response.result;
        if(espacio.marcadores) {
          espacio.marcadores.forEach(function(marcador) {
              var li = document.createElement('li');
              var texto = document.createTextNode(marcador.titulo);
              var a = document.createElement('a');
              a.href = marcador.url;
              a.appendChild(texto);
              li.appendChild(a);
              ul.appendChild(li);
          });
        }
        ul = document.getElementById('lista-subespacios').getElementsByTagName('ul')[0];
        if(espacio.subespacios) {
          espacio.subespacios.forEach(function(esp) {
              var li = document.createElement('li');
              var a = document.createElement('a');
              a.href = urlBasica + "/espacios/" + espacio.path.getPath() + "." + esp;
              a.innerHTML = esp;
              li.appendChild(a);
              ul.appendChild(li);
          });
        }
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
