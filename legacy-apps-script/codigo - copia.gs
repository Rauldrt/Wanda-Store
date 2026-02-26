// --- CONFIGURACIÓN NATIVA ---
const SS = SpreadsheetApp.getActiveSpreadsheet();

// --- 1. CEREBRO DE LECTURA (GET) ---
function doGet(e) {
  const action = e.parameter.action;
  const app = e.parameter.app; // Parámetro para saber qué pantalla cargar

  // --- NUEVO: RUTA PARA LA APP DE PREVENTA ---
  if (app === 'preventa') {
    return HtmlService.createHtmlOutputFromFile('AppPreventa')
        .setTitle('Preventa Lácteos')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
  }

  if (!action) {
    return HtmlService.createHtmlOutputFromFile('IndexAdmin')
        .setTitle('Centro de Operaciones')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  if (action == 'getProductos') return leerDatos('PRODUCTOS');
  if (action == 'getClientes') return leerDatos('CLIENTES');
  
  if (action == 'getPedidosCompletos') {
    try {
      return ContentService.createTextOutput(JSON.stringify(getPedidosCompletos()))
              .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
              .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput("Sistema Online.");
}

// --- 2. CEREBRO DE ESCRITURA (POST) ---
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    const rawData = e.postData.contents;
    const datos = JSON.parse(rawData);
    
    logDebug(`INICIO POST: Pedido recibido. Items: ${datos.items.length}`);

    const idPedido = datos.id_interno ? datos.id_interno.toString() : new Date().getTime().toString();
    const fecha = new Date();
    const vendedor = datos.vendedor || "App Móvil"; 
    const notas = datos.notas || "";

    const sheetPedidos = SS.getSheetByName("PEDIDOS");
    sheetPedidos.appendRow([idPedido, fecha, datos.cliente.id, datos.cliente.nombre, vendedor, datos.total, "Pendiente", notas, ""]);

    const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
    datos.items.forEach(item => {
      sheetDetalle.appendRow([idPedido, item.id, item.nombre, item.detalle || "", item.cantidad_sistema || item.cantidad, item.subtotal]);
    });

    logDebug(`Actualizando Stock para pedido ${idPedido}...`);
    actualizarStock(datos.items, -1); 
    logDebug(`FIN POST: Stock actualizado.`);

    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "id": idPedido })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logDebug(`ERROR POST: ${error.toString()}`);
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- NUEVO: PROCESADOR NATIVO PARA LA APP PREVENTA EN GAS ---
function procesarPedido(datos) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000); 

  try {
    logDebug(`INICIO PREVENTA NATIVA: Pedido recibido. Items: ${datos.items.length}`);

    const idPedido = datos.id_interno ? datos.id_interno.toString() : new Date().getTime().toString();
    const fecha = new Date();
    const vendedor = datos.vendedor || "App Preventa (Nativa)"; 
    const notas = datos.notas || "";

    const sheetPedidos = SS.getSheetByName("PEDIDOS");
    sheetPedidos.appendRow([idPedido, fecha, datos.cliente.id, datos.cliente.nombre, vendedor, datos.total, "Pendiente", notas, ""]);

    const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
    datos.items.forEach(item => {
      sheetDetalle.appendRow([idPedido, item.id, item.nombre, item.detalle || "", item.cantidad_sistema || item.cantidad, item.subtotal]);
    });

    actualizarStock(datos.items, -1); 
    logDebug(`FIN PREVENTA NATIVA: Stock actualizado.`);
    return { "result": "success", "id": idPedido };

  } catch (error) {
    logDebug(`ERROR PREVENTA NATIVA: ${error.toString()}`);
    throw new Error(error.toString());
  } finally {
    lock.releaseLock();
  }
}

function logDebug(msg) {
  let sheet = SS.getSheetByName("DEBUG");
  if (!sheet) {
    sheet = SS.insertSheet("DEBUG");
    sheet.appendRow(["Timestamp", "Mensaje"]);
  }
  sheet.appendRow([new Date(), msg]);
}

// --- 3. FUNCIONES DE LOGÍSTICA ---

function crearReparto(idsPedidos, nombreReparto) {
  const sheet = SS.getSheetByName("PEDIDOS");
  const data = sheet.getDataRange().getValues();
  // id es col 0, estado col 6 (G), reparto col 8 (I)
  idsPedidos.forEach(id => {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.getRange(i + 1, 7).setValue("En Preparación"); 
        sheet.getRange(i + 1, 9).setValue(nombreReparto);    
        break;
      }
    }
  });
  return "OK";
}

function eliminarReparto(nombreReparto) {
  const sheet = SS.getSheetByName("PEDIDOS");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][8]) === String(nombreReparto)) {
      sheet.getRange(i + 1, 7).setValue("Pendiente"); 
      sheet.getRange(i + 1, 9).setValue("");          
    }
  }
  return "OK";
}

function quitarPedidoDeReparto(idPedido) {
  const sheet = SS.getSheetByName("PEDIDOS");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(idPedido)) {
      sheet.getRange(i + 1, 7).setValue("Pendiente");
      sheet.getRange(i + 1, 9).setValue("");
      return "OK";
    }
  }
  return "Error";
}

function asignarRepartoMasivo(idsPedidos, nombreReparto) {
    return crearReparto(idsPedidos, nombreReparto);
}

function liberarReparto(nombreReparto) {
    return eliminarReparto(nombreReparto);
}

// --- FUNCIÓN DE AJUSTE RÁPIDO (MODAL PESAJE) ---
function ajustarItemMasivo(ajustes) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
    const sheetPedidos = SS.getSheetByName("PEDIDOS");
    const sheetProductos = SS.getSheetByName("PRODUCTOS");
    
    const dataDetalle = sheetDetalle.getDataRange().getValues();
    const dataProd = sheetProductos.getDataRange().getValues(); 
    
    // Buscar dinámicamente dónde está la columna de Stock
    const headers = dataProd[0];
    const stockIndex = encontrarIndiceStock(headers);

    ajustes.forEach(ajuste => {
      for (let i = 1; i < dataDetalle.length; i++) {
        if (String(dataDetalle[i][0]) === String(ajuste.idPedido) && String(dataDetalle[i][1]) === String(ajuste.idProd)) {
          const cantVieja = parseFloat(dataDetalle[i][4]);
          const cantNueva = parseFloat(ajuste.nuevaCant);
          const diferencia = cantNueva - cantVieja;
          
          if (cantNueva > 0) {
              sheetDetalle.getRange(i + 1, 5).setValue(cantNueva); 
              sheetDetalle.getRange(i + 1, 6).setValue(ajuste.nuevoSubtotal); 
              if (ajuste.nuevoDetalle !== undefined) {
                  sheetDetalle.getRange(i + 1, 4).setValue(ajuste.nuevoDetalle); 
              }
          } else {
              sheetDetalle.deleteRow(i + 1);
          }
          
          actualizarStockSingle(ajuste.idProd, diferencia * -1, dataProd, sheetProductos, stockIndex);
          break;
        }
      }
      recalcularTotalPedido(ajuste.idPedido, sheetPedidos, sheetDetalle);
    });
    return "OK";
  } catch(e) {
    return "Error: " + e.toString();
  } finally {
    lock.releaseLock();
  }
}

function guardarCorreccionPedido(pedidoEditado) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
    const sheetPedidos = SS.getSheetByName("PEDIDOS");
    const sheetProductos = SS.getSheetByName("PRODUCTOS");

    const dataDetalle = sheetDetalle.getDataRange().getValues();
    const dataProd = sheetProductos.getDataRange().getValues();
    const headers = dataProd[0];
    const stockIndex = encontrarIndiceStock(headers);

    pedidoEditado.items.forEach(item => {
        for (let i = 1; i < dataDetalle.length; i++) {
            if (String(dataDetalle[i][0]) === String(pedidoEditado.id) && String(dataDetalle[i][1]) === String(item.id_prod)) {
                const cantVieja = parseFloat(dataDetalle[i][4]); 
                const cantNueva = parseFloat(item.cantidad);
                const diferencia = cantNueva - cantVieja;

                sheetDetalle.getRange(i + 1, 5).setValue(cantNueva);
                sheetDetalle.getRange(i + 1, 6).setValue(item.subtotal);

                actualizarStockSingle(item.id_prod, diferencia * -1, dataProd, sheetProductos, stockIndex);
                break;
            }
        }
    });

    const dataPedidos = sheetPedidos.getDataRange().getValues();
    for (let i = 1; i < dataPedidos.length; i++) {
        if (String(dataPedidos[i][0]) === String(pedidoEditado.id)) {
            sheetPedidos.getRange(i + 1, 6).setValue(pedidoEditado.total); 
            break;
        }
    }

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  } finally {
    lock.releaseLock();
  }
}

// --- UTILIDADES DE STOCK TOTALMENTE DINÁMICAS ---

function encontrarIndiceStock(headers) {
    let index = headers.findIndex(h => {
        if (!h) return false;
        const txt = h.toString().toLowerCase().trim();
        return txt === "stock_actual" || txt === "stock actual" || txt === "stock";
    });
    if (index === -1) return 5; 
    return index;
}

function actualizarStock(items, multiplicador) {
    const sheetProductos = SS.getSheetByName("PRODUCTOS");
    const dataProductos = sheetProductos.getDataRange().getValues(); 
    
    const headers = dataProductos[0];
    const stockIndex = encontrarIndiceStock(headers);

    items.forEach(item => {
      const cantidad = (item.cantidad_sistema || item.cantidad) * multiplicador; 
      actualizarStockSingle(item.id || item.id_prod, cantidad, dataProductos, sheetProductos, stockIndex);
    });
}

function actualizarStockSingle(idProd, delta, dataProd, sheetProd, stockIndex) {
    for (let i = 1; i < dataProd.length; i++) {
      if (String(dataProd[i][0]) === String(idProd)) {
         const stockActual = parseFloat(dataProd[i][stockIndex]) || 0; 
         sheetProd.getRange(i + 1, stockIndex + 1).setValue(stockActual + delta);
         break;
      }
    }
}

function recalcularTotalPedido(idPedido, sheetPedidos, sheetDetalle) {
   const dataD = sheetDetalle.getDataRange().getValues();
   let nuevoTotal = 0;
   for(let i=1; i<dataD.length; i++) {
     if(String(dataD[i][0]) === String(idPedido)) {
       nuevoTotal += parseFloat(dataD[i][5]) || 0; 
     }
   }
   const dataP = sheetPedidos.getDataRange().getValues();
   for(let i=1; i<dataP.length; i++) {
     if(String(dataP[i][0]) === String(idPedido)) {
       sheetPedidos.getRange(i+1, 6).setValue(nuevoTotal); 
       break;
     }
   }
}

function getPedidosCompletos() {
  const sheetPedidos = SS.getSheetByName("PEDIDOS");
  const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
  const dataP = sheetPedidos.getDataRange().getValues(); dataP.shift();
  const dataD = sheetDetalle.getDataRange().getValues(); dataD.shift();
  
  return dataP.reverse().map(row => {
    if (!row[0]) return null;
    const id = String(row[0]); 
    const items = dataD.filter(d => String(d[0]) === id).map(d => ({
      id_prod: d[1],
      nombre: d[2],
      detalle: d[3],
      cantidad: d[4],
      subtotal: d[5],
      precio: d[4] ? (d[5] / d[4]) : 0 // Calculamos precio unitario aproximado para el panel
    }));
    let fechaStr = row[1];
    if (row[1] instanceof Date) fechaStr = row[1].toLocaleString();
    return {
      id: id,
      fecha: fechaStr,
      cliente_id: row[2],
      cliente_nombre: row[3],
      vendedor: row[4], 
      total: row[5],    
      estado: row[6] || "Pendiente",
      notas: row[7] || "",
      reparto: row[8] || "", 
      items: items
    };
  }).filter(p => p !== null);
}

function cambiarEstadoPedido(idPedido, nuevoEstado) {
  const sheet = SS.getSheetByName("PEDIDOS");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(idPedido)) {
      sheet.getRange(i + 1, 7).setValue(nuevoEstado); 
      return "OK";
    }
  }
  return "Error: Pedido no encontrado";
}

function leerDatos(nombreHoja) {
  const sheet = SS.getSheetByName(nombreHoja);
  if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  const headers = data[0];
  const rows = data.slice(1);
  return ContentService.createTextOutput(JSON.stringify(rows.map(row => {
    let obj = {}; 
    headers.forEach((h, i) => { 
        if(h) obj[String(h).trim()] = row[i]; // .trim() elimina espacios ocultos
    }); 
    return obj;
  }))).setMimeType(ContentService.MimeType.JSON);
}

function obtenerCatalogoProductos() {
  const sheet = SS.getSheetByName("PRODUCTOS");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {}; 
    headers.forEach((h, i) => { 
        if(h) obj[String(h).trim()] = row[i]; // .trim() asegura que "Imagen " sea "Imagen"
    }); 
    return obj;
  });
}

// =========================================================================
// --- MÓDULO CATÁLOGO (PRODUCTOS) DINÁMICO ---
// =========================================================================

/**
 * Guarda múltiples productos a la vez (Edición Rápida Masiva).
 * Dinámico: busca el nombre de la columna en la Fila 1 y lo actualiza.
 */
function guardarCambiosMasivosProductos(cambios) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheet = SS.getSheetByName('PRODUCTOS');
    const data = sheet.getDataRange().getValues();
    const headers = data[0]; 
    
    cambios.forEach(cambio => {
      const idProd = cambio.ID_Producto;
      const rowIndex = data.findIndex(row => String(row[0]) === String(idProd));
      
      if (rowIndex > -1) {
        const filaReal = rowIndex + 1; 
        const rowData = data[rowIndex]; // Tomamos la fila completa en memoria
        
        headers.forEach((header, colIndex) => {
          if (!header) return; // Evitar columnas vacías
          const headerStr = String(header).trim();
          
          if (cambio[headerStr] !== undefined && headerStr !== 'ID_Producto') {
            rowData[colIndex] = cambio[headerStr]; // Modificamos en memoria
          }
        });
        
        // Escribimos toda la fila modificada de un solo golpe (Rendimiento Óptimo)
        sheet.getRange(filaReal, 1, 1, rowData.length).setValues([rowData]);
      }
    });
    
    return "OK";
  } catch (e) {
    throw new Error("Error guardando masivo: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Guarda un producto nuevo o edita uno individual desde el modal "Nuevo".
 * Dinámico: mapea las columnas automáticamente en base a la primera fila.
 */
function guardarProductoCatalogo(producto) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheet = SS.getSheetByName('PRODUCTOS');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const rowIndex = data.findIndex(row => String(row[0]) === String(producto.ID_Producto));
    
    if (rowIndex > -1) {
      const rowData = data[rowIndex]; // Fila en memoria
      headers.forEach((header, colIndex) => {
          if (!header) return;
          const headerStr = String(header).trim();
          if (producto[headerStr] !== undefined) {
              rowData[colIndex] = producto[headerStr];
          }
      });
      // Sobrescribimos la fila de golpe
      sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Producto nuevo
      if (!producto.ID_Producto || producto.ID_Producto.toLowerCase() === 'auto') {
          producto.ID_Producto = "PROD-" + new Date().getTime().toString().slice(-6); 
      }
      const rowData = headers.map(header => {
        if (!header) return '';
        const headerStr = String(header).trim();
        return producto[headerStr] !== undefined ? producto[headerStr] : '';
      });
      sheet.appendRow(rowData);
    }
    
    return "OK";
  } catch (e) {
    throw new Error("Error guardando producto: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function eliminarProducto(idProducto) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheet = SS.getSheetByName("PRODUCTOS");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(idProducto)) {
        sheet.deleteRow(i + 1);
        return "OK";
      }
    }
    return "No encontrado";
  } finally {
    lock.releaseLock();
  }
}


// =========================================================================
// --- MÓDULO DIRECTORIO (CLIENTES) DINÁMICO ---
// =========================================================================

function guardarClienteDirectorio(cli) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheet = SS.getSheetByName("CLIENTES");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idxId = headers.findIndex(h => String(h).trim() === "ID_Cliente");
    
    if (!cli.ID_Cliente || cli.ID_Cliente.startsWith('NUEVO')) {
        cli.ID_Cliente = "CLI-" + new Date().getTime().toString().slice(-4); 
    }

    const searchId = cli.ID_Original || cli.ID_Cliente; 
    const rowIndex = data.findIndex(row => String(row[idxId]) === String(searchId));

    if (rowIndex > -1) {
       const rowData = data[rowIndex]; // Memoria
       headers.forEach((h, colIdx) => {
           if (!h) return;
           const campo = String(h).trim();
           if (cli[campo] !== undefined) {
               rowData[colIdx] = cli[campo];
           }
       });
       if(cli.ID_Cliente) rowData[idxId] = cli.ID_Cliente;
       
       // Guardado de golpe
       sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
    } else {
       const rowData = headers.map(h => {
          if (!h) return '';
          const campo = String(h).trim();
          return cli[campo] !== undefined ? cli[campo] : '';
       });
       sheet.appendRow(rowData);
    }
    
    return "OK";
  } catch (e) {
    throw new Error("Error guardando cliente: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function eliminarCliente(idCliente) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const sheet = SS.getSheetByName("CLIENTES");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(idCliente)) {
        sheet.deleteRow(i + 1);
        return "OK";
      }
    }
    return "No encontrado";
  } finally {
    lock.releaseLock();
  }
}

// Devuelve el arreglo nativo para que el Panel Web lo lea correctamente
function getClientes() {
  const sheet = SS.getSheetByName("CLIENTES");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {}; 
    headers.forEach((h, i) => { 
        if(h) obj[String(h).trim()] = row[i]; 
    }); 
    return obj;
  });
}