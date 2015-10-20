var Request = function(opciones) {
    request = this.request = new XMLHttpRequest();
    var async = (opciones.async!=undefined) ? opciones.async : true;
    request.open(opciones.metodo,opciones.url,async);
    var header = (opciones.header!=undefined) ? opciones.header : "";
    Object.keys(header).forEach(function(head) {
        request.setRequestHeader(head,header[head]);
    });
    var datos = (opciones.datos!=undefined) ? opciones.datos : "";
    request.send(datos);
    request.onreadystatechange = function() {
        if (this.readyState==4 && this.status=="200") {
            opciones.fin(this.responseText);
        }
    }
}

NodeList.prototype.forEach = Array.prototype.forEach;

String.prototype.getPath = function() {
  if (this.search('root') != -1) {
    return this.substring(5,this.length);
  }
}
