/**
 * WANDA API - Google Sheets Backend
 * Versión optimizada para Next.js / React
 * CON PROTECCIÓN DE CONCURRENCIA PROFESIONAL
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

// --- CONFIGURACIÓN DE SEGURIDAD ---
const API_KEY = "WANDA_SECRET_KEY_2024"; // Cambiar por algo más seguro

function doGet(e) {
  const action = e.parameter.action;
  const key = e.parameter.key;

  // Validación de API KEY básica
  if (key !== API_KEY && action !== 'check') {
    return createResponse({ error: "No autorizado" }, 403);
  }

  try {
    switch (action) {
      case 'check':
        return createResponse({ status: "online", version: "2.1.0" });
      case 'get_catalog':
        return createResponse(obtenerCatalogoProductos());
      case 'get_clients':
        return createResponse(getClientes());
      case 'get_orders':
        return createResponse(getPedidosCompletos());
      case 'get_all':
        return createResponse({
          products: obtenerCatalogoProductos(),
          clients: getClientes(),
          orders: getPedidosCompletos(),
          config: obtenerConfiguracion(),
          liquidaciones: getLiquidaciones()
        });
      case 'get_config':
        return createResponse(obtenerConfiguracion());
      default:
        return createResponse({ error: "Acción no válida" }, 400);
    }
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const payload = JSON.parse(rawData);
    
    // Validación de API KEY en el body
    if (payload.key !== API_KEY) {
      return createResponse({ error: "No autorizado" }, 403);
    }

    const action = payload.action;
    const data = payload.data;

    switch (action) {
      case 'create_order':
        return createResponse(procesarPedido(data));
      case 'update_order_status':
        return createResponse({ result: cambiarEstadoPedido(data.id, data.status) });
      case 'save_product':
        return createResponse({ result: guardarProductoCatalogo(data) });
      case 'save_client':
        return createResponse({ result: guardarClienteDirectorio(data) });
      case 'asignar_reparto_masivo':
        return createResponse({ result: asignarRepartoMasivo(data.ids, data.reparto) });
      case 'liberar_reparto':
        return createResponse({ result: liberarReparto(data.reparto) });
      case 'guardar_correccion_pedido':
        return createResponse({ result: guardarCorreccionPedido(data) });
      case 'liquidar_ruta':
        return createResponse({ result: liquidarRuta(data) });
      case 'revert_liquidacion':
        return createResponse({ result: revertirLiquidacion(data.id) });
      case 'save_config':
        return createResponse({ result: guardarConfiguracion(data) });
      case 'delete_product':
        return createResponse({ result: eliminarProducto(data.id) });
      case 'bulk_update_products':
        return createResponse({ result: guardarCambiosMasivosProductos(data) });
      case 'delete_client':
        return createResponse({ result: eliminarCliente(data.id) });
      default:
        return createResponse({ error: "Acción POST no reconocida" }, 400);
    }
  } catch (err) {
    return createResponse({ error: err.toString() }, 500);
  }
}

// Helper para respuestas JSON con soporte CORS
function createResponse(data, code = 200) {
  const out = JSON.stringify(data);
  return ContentService.createTextOutput(out)
    .setMimeType(ContentService.MimeType.JSON);
}

// --- REUTILIZACIÓN DE LÓGICA EXISTENTE (MODIFICADA PARA RETORNAR DATOS) ---

function limpiarH(h) {
  if (!h) return "";
  return String(h).split('(')[0].trim().replace(/\s+/g, '_');
}

function parseDateForFrontend(dateVal, timeVal) {
  if (dateVal instanceof Date) {
    return dateVal.toISOString();
  }
  if (typeof dateVal === 'string' && dateVal.includes('/')) {
    const p = dateVal.split('/');
    if (p.length >= 3) {
      const dd = p[0].padStart(2, '0');
      const mm = p[1].padStart(2, '0');
      const yy = p[2].substring(0, 4);
      let h = "00:00:00";
      if (timeVal instanceof Date) {
        h = Utilities.formatDate(timeVal, Session.getScriptTimeZone(), "HH:mm:ss");
      } else if (timeVal) {
        h = String(timeVal);
      }
      return `${yy}-${mm}-${dd}T${h}`;
    }
  }
  return String(dateVal);
}

function getPedidosCompletos() {
  const sheetPedidos = SS.getSheetByName("PEDIDOS");
  const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
  if (!sheetPedidos || !sheetDetalle) return [];

  const dataP = sheetPedidos.getDataRange().getValues().slice(1);
  const dataD = sheetDetalle.getDataRange().getValues().slice(1);
  
  const detalleMap = {};
  dataD.forEach(d => {
    const id = String(d[0]);
    if (!detalleMap[id]) detalleMap[id] = [];
    detalleMap[id].push({
      id_prod: d[1],
      nombre: d[2],
      detalle: d[3],
      cantidad: d[4],
      subtotal: d[5],
      precio: d[4] ? (d[5] / d[4]) : 0
    });
  });
  
  return dataP.reverse().map(row => {
    if (!row[0]) return null;
    const id = String(row[0]); 
    return {
      id: id,
      fecha: parseDateForFrontend(row[1], row[9]),
      cliente_id: row[2],
      cliente_nombre: row[3],
      vendedor: row[4], 
      total: row[5],    
      estado: row[6] || "Pendiente",
      reparto: row[7] || "",
      notas: row[8] || "",
      gps: row[10] || "",
      items: detalleMap[id] || []
    };
  }).filter(p => p !== null);
}

function obtenerCatalogoProductos() {
  const sheet = SS.getSheetByName("PRODUCTOS");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headersLimpios = data[0].map(h => limpiarH(h));
  return data.slice(1).map(row => {
    let obj = {};
    headersLimpios.forEach((h, i) => { if(h) obj[h] = row[i]; });
    return obj;
  });
}

function getClientes() {
  const sheet = SS.getSheetByName("CLIENTES");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const headersLimpios = data[0].map(h => limpiarH(h));
  return data.slice(1).map(row => {
    let obj = {};
    headersLimpios.forEach((h, i) => { if(h) obj[h] = row[i]; });
    return obj;
  });
}

// --- 4. CEREBRO DE ESCRITURA (POST) CON LOCKSERVICE ---

function guardarCambiosMasivosProductos(cambios) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); 
    const sheet = SS.getSheetByName('PRODUCTOS');
    const data = sheet.getDataRange().getValues();
    const headersLimpios = data[0].map(h => limpiarH(h)); 
    
    cambios.forEach(cambio => {
      const idProd = String(cambio.ID_Producto || cambio.id || "");
      if (!idProd) return;
      const rowIndex = data.findIndex(row => String(row[0]) === idProd);
      
      if (rowIndex > -1) {
        const rowData = data[rowIndex];
        headersLimpios.forEach((hLimpio, colIndex) => {
          const key = Object.keys(cambio).find(k => limpiarH(k).toLowerCase() === hLimpio.toLowerCase());
          if (key && hLimpio !== 'ID_Producto') {
            rowData[colIndex] = cambio[key];
          }
        });
        sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
      }
    });
    return "OK";
  } finally {
    lock.releaseLock();
  }
}

function guardarProductoCatalogo(producto) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName('PRODUCTOS');
    const data = sheet.getDataRange().getValues();
    const headersLimpios = data[0].map(h => limpiarH(h));
    const rowIndex = data.findIndex(row => String(row[0]) === String(producto.ID_Producto));
    
    if (rowIndex > -1) {
      const rowData = data[rowIndex];
      headersLimpios.forEach((hLimpio, i) => {
        const key = Object.keys(producto).find(k => limpiarH(k).toLowerCase() === hLimpio.toLowerCase());
        if (key) rowData[i] = producto[key];
      });
      sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
    } else {
      if (!producto.ID_Producto || producto.ID_Producto === 'Auto') {
        producto.ID_Producto = "PROD-" + new Date().getTime().toString().slice(-6);
        const tz = Session.getScriptTimeZone();
        producto.Fecha_Registro = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");
        producto.Hora_Registro = Utilities.formatDate(new Date(), tz, "HH:mm:ss");
      }
      const newRow = data[0].map((hOriginal, i) => {
        const hLimpio = headersLimpios[i];
        const key = Object.keys(producto).find(k => limpiarH(k).toLowerCase() === hLimpio.toLowerCase());
        return key ? producto[key] : "";
      });
      sheet.appendRow(newRow);
    }
    return "OK";
  } finally {
    lock.releaseLock();
  }
}

function eliminarProducto(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName("PRODUCTOS");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return "OK";
      }
    }
    return "No encontrado";
  } finally {
    lock.releaseLock();
  }
}

function guardarClienteDirectorio(cli) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName("CLIENTES");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    if (!cli.ID_Cliente) {
      cli.ID_Cliente = "CLI-" + new Date().getTime().toString().slice(-4);
      const tz = Session.getScriptTimeZone();
      cli.Fecha_Registro = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");
      cli.Hora_Registro = Utilities.formatDate(new Date(), tz, "HH:mm:ss");
    }
    
    const rowIndex = data.findIndex(row => String(row[0]) === String(cli.ID_Cliente));
    if (rowIndex > -1) {
      const rowData = data[rowIndex];
      headers.forEach((h, i) => {
        const hStr = String(h).trim();
        if (cli[hStr] !== undefined) rowData[i] = cli[hStr];
      });
      sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(headers.map(h => cli[String(h).trim()] || ""));
    }
    return "OK";
  } finally {
    lock.releaseLock();
  }
}

function cambiarEstadoPedido(id, status) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName("PEDIDOS");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.getRange(i + 1, 7).setValue(status);
        return "OK";
      }
    }
    return "Error";
  } finally {
    lock.releaseLock();
  }
}

function asignarRepartoMasivo(ids, route) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName("PEDIDOS");
    const data = sheet.getDataRange().getValues();
    
    // We only update column G (Estado) and H (Reparto) 
    // Data indices: 6 is G, 7 is H.
    const updates = [];
    
    for (let i = 1; i < data.length; i++) {
        const rowId = String(data[i][0]);
        let estado = data[i][6];
        let reparto = data[i][7];
        
        if (ids.map(String).includes(rowId)) {
            estado = "En Preparación";
            reparto = route;
        }
        updates.push([estado, reparto]);
    }
    
    if (updates.length > 0) {
        // Mapeo a Filas (Empieza en fila 2). Columnas (7 = G, 8 = H)
        sheet.getRange(2, 7, updates.length, 2).setValues(updates);
    }
    
    return "OK";
  } catch (e) {
    return "ERROR: " + e.toString();
  } finally {
    lock.releaseLock();
  }
}

function liberarReparto(reparto) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName("PEDIDOS");
    const data = sheet.getDataRange().getValues();
    
    const updates = [];
    for (let i = 1; i < data.length; i++) {
        let estado = data[i][6];
        let rep = data[i][7];
        
        if (String(rep) === String(reparto)) {
            estado = "Pendiente";
            rep = "";
        }
        updates.push([estado, rep]);
    }

    if (updates.length > 0) {
        sheet.getRange(2, 7, updates.length, 2).setValues(updates);
    }
    
    return "OK";
  } catch(e) {
    return "ERROR: " + e.toString();
  } finally {
    lock.releaseLock();
  }
}

function guardarCorreccionPedido(pedidoEditado) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheetDetalle = SS.getSheetByName("DETALLE_PEDIDOS");
    const sheetPedidos = SS.getSheetByName("PEDIDOS");
    const sheetProductos = SS.getSheetByName("PRODUCTOS");
    
    const dataDetalle = sheetDetalle.getDataRange().getValues();
    const dataProductos = sheetProductos.getDataRange().getValues();
    const headersProd = dataProductos[0];
    const sIdx = headersProd.findIndex(h => String(h).toLowerCase().includes("stock"));

    // 1. Actualizar Detalle y preparar ajustes de stock
    pedidoEditado.items.forEach(item => {
      for (let i = 1; i < dataDetalle.length; i++) {
        if (String(dataDetalle[i][0]) === String(pedidoEditado.id) && String(dataDetalle[i][1]) === String(item.id_prod)) {
          const cantAnterior = parseFloat(dataDetalle[i][4]) || 0;
          const cantNueva = parseFloat(item.cantidad) || 0;
          const diferencia = cantAnterior - cantNueva; 

          sheetDetalle.getRange(i + 1, 5).setValue(cantNueva);
          sheetDetalle.getRange(i + 1, 6).setValue(parseFloat(item.cantidad) * parseFloat(item.precio));
          
          if (diferencia !== 0 && sIdx > -1) {
             for (let j = 1; j < dataProductos.length; j++) {
               if (String(dataProductos[j][0]) === String(item.id_prod)) {
                 const stockActual = parseFloat(dataProductos[j][sIdx]) || 0;
                 sheetProductos.getRange(j + 1, sIdx + 1).setValue(stockActual + diferencia);
                 break;
               }
             }
          }
          break;
        }
      }
    });

    // 2. Actualizar Encabezado
    const dataPedidos = sheetPedidos.getDataRange().getValues();
    for (let i = 1; i < dataPedidos.length; i++) {
      if (String(dataPedidos[i][0]) === String(pedidoEditado.id)) {
        sheetPedidos.getRange(i + 1, 6).setValue(pedidoEditado.total);
        break;
      }
    }
    return "OK";
  } finally {
    lock.releaseLock();
  }
}

function procesarPedido(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    
    // GENERACIÓN DE ID PROFESIONAL (Evita colisiones)
    const vendPrefix = (datos.vendedor || "WEB").substring(0, 3).toUpperCase();
    const randSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const idPedido = vendPrefix + "-" + new Date().getTime() + "-" + randSuffix;

    const sheetP = SS.getSheetByName("PEDIDOS");
    const sheetD = SS.getSheetByName("DETALLE_PEDIDOS");
    
    let clienteId = datos.cliente.ID_Cliente || datos.cliente.id || "";
    const clienteNombre = datos.cliente.Nombre_Negocio || datos.cliente.nombre || "Cliente Sin Nombre";

    if (datos.cliente.Es_Online && datos.cliente.Email) {
       registrarClienteOnline(datos.cliente);
       clienteId = datos.cliente.Email;
    }
    
    let notas = datos.notas || "";
    if (datos.cliente.Es_Online) {
       notas = "[ONLINE] " + 
               " Tel: " + (datos.cliente.Telefono || "-") + 
               " | Dir: " + (datos.cliente.Direccion || "-") + 
               " | GPS: " + (datos.cliente.Ubicacion || "-") + 
               " | Notas: " + notas;
    }
    
    const d = new Date();
    const tz = Session.getScriptTimeZone();
    const f = Utilities.formatDate(d, tz, "dd/MM/yyyy");
    const h = Utilities.formatDate(d, tz, "HH:mm:ss");

    sheetP.appendRow([idPedido, f, clienteId, clienteNombre, datos.vendedor || "Web", datos.total, "Pendiente", "", notas, h, datos.gps || ""]);
    
    datos.items.forEach(item => {
      const idItem = item.id_producto || item.id || "";
      const detalle = item.descripcion || item.detalle || "";
      sheetD.appendRow([idPedido, idItem, item.nombre, detalle, item.cantidad, item.subtotal]);
    });
    
    actualizarStock(datos.items, -1);
    return { result: "success", id: idPedido };
  } finally {
    lock.releaseLock();
  }
}

function registrarClienteOnline(cliente) {
  const sheet = SS.getSheetByName("CLIENTES");
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const existe = data.some(row => String(row[0]).toLowerCase() === String(cliente.Email).toLowerCase());
  
  if (!existe) {
    const tz = Session.getScriptTimeZone();
    const f = Utilities.formatDate(new Date(), tz, "dd/MM/yyyy");
    const h = Utilities.formatDate(new Date(), tz, "HH:mm:ss");
    sheet.appendRow([cliente.Email, cliente.Nombre_Negocio, cliente.Nombre_Negocio, "Pedido Online", "", "", "", f, h]);
  }
}

function actualizarStock(items, mult) {
  const sheet = SS.getSheetByName("PRODUCTOS");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const sIdx = headers.findIndex(h => String(h).toLowerCase().includes("stock"));
  
  items.forEach(item => {
    actualizarStockSingle(item.id_producto || item.id || item.id_prod, item.cantidad * mult, data, sheet, sIdx);
  });
}

function actualizarStockSingle(idProd, cantidad, dataInput, sheetInput, sIdxInput) {
  const sheet = sheetInput || SS.getSheetByName("PRODUCTOS");
  const data = dataInput || sheet.getDataRange().getValues();
  let sIdx = sIdxInput;
  
  if (sIdx === undefined) {
    const headers = data[0];
    sIdx = headers.findIndex(h => String(h).toLowerCase().includes("stock"));
  }
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(idProd)) {
      const current = parseFloat(data[i][sIdx]) || 0;
      sheet.getRange(i + 1, sIdx + 1).setValue(current + cantidad);
      break;
    }
  }
}

function obtenerConfiguracion() {
  const sheet = SS.getSheetByName("CONFIG");
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  let config = {};
  data.forEach(row => {
    if(row[0]) config[row[0]] = row[1];
  });
  return config;
}

function guardarConfiguracion(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    let sheet = SS.getSheetByName("CONFIG");
    if (!sheet) {
      sheet = SS.insertSheet("CONFIG");
      sheet.appendRow(["CLAVE", "VALOR"]);
    }
    
    const data = sheet.getDataRange().getValues();
    Object.keys(datos).forEach(key => {
      const idx = data.findIndex(row => row[0] === key);
      if (idx > -1) {
        sheet.getRange(idx + 1, 2).setValue(datos[key]);
      } else {
        sheet.appendRow([key, datos[key]]);
      }
    });
    return "OK";
  } finally {
    lock.releaseLock();
  }
}

function liquidarRuta(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    const sheetP = SS.getSheetByName("PEDIDOS");
    const sheetD = SS.getSheetByName("DETALLE_PEDIDOS");
    let sheetL = SS.getSheetByName("LIQUIDACIONES");
    
    if (!sheetL) {
      sheetL = SS.insertSheet("LIQUIDACIONES");
      sheetL.appendRow(["ID_LIQ", "FECHA", "REPARTO", "CHOFER", "EFECTIVO", "TRANSF", "GASTOS", "TOTAL_NETO", "OBS", "ORDENES_JSON"]);
    }

    const liqId = "LIQ-" + new Date().getTime();
    
    // 1. Procesar cada pedido
    data.ordenes.forEach(ord => {
       if (ord.estado === 'Entregado') {
         actualizarEstadoDirecto(ord.id, "Entregado", sheetP);
       } else if (ord.estado === 'Rechazado') {
         // Si es rechazado, volvemos los items al stock
         const items = obtenerItemsPedido(ord.id, sheetD);
         actualizarStock(items, 1); // mult=1 para sumar al stock
         actualizarEstadoDirecto(ord.id, "Rechazado", sheetP);
       } else if (ord.estado === 'Parcial') {
         // Ajustamos stock por la diferencia y actualizamos detalle
         guardarCorreccionPedidoInternal(ord, sheetP, sheetD);
         actualizarEstadoDirecto(ord.id, "Entregado Parcial", sheetP);
       }
    });

    // 2. Guardar resumen de liquidación
    const gastosTotal = (data.gastos || []).reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);
    const efectivo = parseFloat(data.pagos.efectivo) || 0;
    const transferencia = parseFloat(data.pagos.transferencia) || 0;
    
    sheetL.appendRow([
      liqId, 
      new Date(), 
      data.reparto, 
      data.chofer || "", 
      efectivo, 
      transferencia, 
      gastosTotal,
      (efectivo + transferencia) - gastosTotal,
      data.notas || "",
      JSON.stringify({ ordenes: data.ordenes || [] })
    ]);

    return "OK";
  } catch (e) {
    return "Error: " + e.toString();
  } finally {
    lock.releaseLock();
  }
}

function actualizarEstadoDirecto(id, status, sheetP) {
  const data = sheetP.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheetP.getRange(i + 1, 7).setValue(status);
      sheetP.getRange(i + 1, 9).setValue(""); // Limpiar Reparto para "cerrar" la ruta
      break;
    }
  }
}

function obtenerItemsPedido(orderId, sheetD) {
  const data = sheetD.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(orderId)) {
      items.push({
        id: data[i][1],
        nombre: data[i][2],
        cantidad: parseFloat(data[i][4]) || 0
      });
    }
  }
  return items;
}

function guardarCorreccionPedidoInternal(pedidoEditado, sheetP, sheetD) {
    const sheetProductos = SS.getSheetByName("PRODUCTOS");
    const dataDetalle = sheetD.getDataRange().getValues();
    const dataProductos = sheetProductos.getDataRange().getValues();
    const headersProd = dataProductos[0];
    const sIdx = headersProd.findIndex(h => String(h).toLowerCase().includes("stock"));

    // 1. Actualizar Detalle y preparar ajustes de stock
    pedidoEditado.items.forEach(item => {
      for (let i = 1; i < dataDetalle.length; i++) {
        if (String(dataDetalle[i][0]) === String(pedidoEditado.id) && String(dataDetalle[i][1]) === String(item.id_prod || item.id)) {
          const cantAnterior = parseFloat(dataDetalle[i][4]) || 0;
          const cantNueva = parseFloat(item.cantidad) || 0;
          const diferencia = cantAnterior - cantNueva; 

          sheetD.getRange(i + 1, 5).setValue(cantNueva);
          sheetD.getRange(i + 1, 6).setValue(parseFloat(item.cantidad) * parseFloat(item.precio));
          
          if (diferencia !== 0 && sIdx > -1) {
             for (let j = 1; j < dataProductos.length; j++) {
               if (String(dataProductos[j][0]) === String(item.id_prod || item.id)) {
                 const stockActual = parseFloat(dataProductos[j][sIdx]) || 0;
                 sheetProductos.getRange(j + 1, sIdx + 1).setValue(stockActual + diferencia);
                 break;
               }
             }
          }
          break;
        }
      }
    });

    // 2. Actualizar Encabezado (Total)
    const dataPedidos = sheetP.getDataRange().getValues();
    for (let i = 1; i < dataPedidos.length; i++) {
      if (String(dataPedidos[i][0]) === String(pedidoEditado.id)) {
        sheetP.getRange(i + 1, 6).setValue(pedidoEditado.total);
        break;
      }
    }
}

function eliminarCliente(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheet = SS.getSheetByName("CLIENTES");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return "OK";
      }
    }
    return "No encontrado";
  } finally {
    lock.releaseLock();
  }
}

function getLiquidaciones() {
  const sheet = SS.getSheetByName("LIQUIDACIONES");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const startIdx = Math.max(1, data.length - 50); // Get last 50
  return data.slice(startIdx).map(row => {
    let ordenesParsed = [];
    try {
      if (row[9]) ordenesParsed = JSON.parse(row[9]).ordenes || [];
    } catch(e) {}
    return {
      id_liq: row[0],
      fecha: row[1],
      reparto: row[2],
      chofer: row[3],
      efectivo: row[4],
      transf: row[5],
      gastos: row[6],
      total_neto: row[7],
      obs: row[8],
      ordenes: ordenesParsed
    };
  }).reverse();
}

function revertirLiquidacion(id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const sheetL = SS.getSheetByName("LIQUIDACIONES");
    if (!sheetL) return "Error: No existe la pestaña LIQUIDACIONES";
    const dataL = sheetL.getDataRange().getValues();
    
    let liqRowIdx = -1;
    let liqData = null;
    for (let i = 1; i < dataL.length; i++) {
      if (String(dataL[i][0]) === String(id)) {
        liqRowIdx = i + 1;
        liqData = dataL[i];
        break;
      }
    }
    if (liqRowIdx === -1) return "Error: Liquidación no encontrada";
    
    const reparto = liqData[2];
    let ordenesJson = [];
    try {
      if (liqData[9]) ordenesJson = JSON.parse(liqData[9]).ordenes || [];
    } catch(e) {}
    
    const sheetP = SS.getSheetByName("PEDIDOS");
    const sheetD = SS.getSheetByName("DETALLE_PEDIDOS");
    
    ordenesJson.forEach(ord => {
       if (ord.estado === 'Rechazado') {
         // Se sumó al stock, ahora lo restamos
         const items = obtenerItemsPedido(ord.id, sheetD);
         actualizarStock(items, -1);
       }
       actualizarEstadoDirectoRevert(ord.id, "En Preparación", reparto, sheetP);
    });
    
    sheetL.deleteRow(liqRowIdx);
    return "OK";
  } catch(e) {
    return "Error: " + e.toString();
  } finally {
    lock.releaseLock();
  }
}

function actualizarEstadoDirectoRevert(id, status, routeName, sheetP) {
  const data = sheetP.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheetP.getRange(i + 1, 7).setValue(status);
      sheetP.getRange(i + 1, 9).setValue(routeName);
      break;
    }
  }
}
