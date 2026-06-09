
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to generate A4 Remito PDF
const generateRemitoPDF = (order: any, config: any, products: any[]) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const activeItems = (order.items || []).filter((it: any) => {
        const q = parseFloat(String(it.cantidad || it.CANTIDAD || 0).replace(',', '.'));
        return q > 0;
    });

    // Outer border for A4 page
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Draw header box divider
    doc.line(8, 50, 202, 50);

    // Company info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(config?.EMPRESA || 'WANDA DISTRIBUCIONES', 12, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(config?.APP_TAGLINE || 'Online Tendence', 12, 23);
    doc.text(config?.REMITO_DIRECCION || '', 12, 28);
    doc.text(`Tel: ${config?.REMITO_TELEFONO || ''}`, 12, 33);

    // "X" Box in center
    doc.rect(95, 8, 20, 20);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("X", 102, 21);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("DOCUMENTO NO VALIDO\n  COMO FACTURA", 96, 25);

    // Right side: Order info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REMITO", 135, 16);
    doc.setFontSize(10);
    doc.text(`Nº: ${order.id.slice(-8)}`, 135, 22);
    doc.text(`Fecha: ${order.fecha?.split('T')[0] || ''}`, 135, 28);
    doc.text(`Vendedor: ${order.vendedor || 'S/V'}`, 135, 34);

    // Client Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(10, 52, 190, 26, "F");
    doc.rect(10, 52, 190, 26);

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Cliente:", 14, 58);
    doc.setFont("helvetica", "normal");
    doc.text(order.cliente_nombre || '', 28, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Domicilio:", 14, 64);
    doc.setFont("helvetica", "normal");
    doc.text(order.direccion || 'Retiro en Local', 32, 64);

    if (order.notas) {
        doc.setFont("helvetica", "bold");
        doc.text("Notas:", 14, 70);
        doc.setFont("helvetica", "normal");
        doc.text(order.notas, 26, 70, { maxWidth: 170 });
    }

    // Products table using autoTable
    const tableData = activeItems.map((item: any) => {
        let qty = parseFloat(String(item.cantidad || item.CANTIDAD || 0).replace(',', '.'));
        let displayedPrice = parseFloat(String(item.precio || item.PRECIO || 0).replace(',', '.')) || 0;
        
        const pId = item.id_prod || item.id_producto || item.id;
        const prod = (products || []).find((p: any) => String(p.ID_Producto) === String(pId));
        const isKg = item.unidad_medida === 'kg' || prod?.Unidad?.toLowerCase() === 'kg';
        const unitLabel = isKg ? 'kg' : 'un';
        
        const itemIsBulto = item.esBulto === true || 
                            String(item.detalle || '').toUpperCase() === 'BULTO' || 
                            String(item.formato || item._formato || '').toUpperCase() === 'BULTO' || 
                            String(item.nombre || '').toUpperCase().includes('BULTO');

        let qtyDisplay = '';
        if (isKg) {
            qtyDisplay = `${parseFloat(String(qty)).toFixed(3)} Kg`;
        } else {
            const bul = item.bultos || item.BULTOS || 0;
            const uni = item.unidades || item.UNIDADES || 0;
            if (bul > 0 || uni > 0) {
                if (bul > 0 && uni > 0) qtyDisplay = `${bul} B / ${uni} ${unitLabel}`;
                else if (bul > 0) qtyDisplay = `${bul} BUL`;
                else qtyDisplay = `${uni} ${unitLabel}`;
            } else {
                qtyDisplay = itemIsBulto ? `${qty} BUL` : `${qty} ${unitLabel}`;
            }
        }

        const factor = prod?.UB || prod?.Unidades_Bulto || 1;
        const factorDisplay = itemIsBulto ? `x${factor}` : '-';
        const _subtotal = parseFloat(String(item.subtotal).replace(',', '.')) || 0;
        const _descuento = parseFloat(String(item.descuento || 0).replace(',', '.')) || 0;

        return [
            qtyDisplay,
            factorDisplay,
            item.nombre,
            `$${displayedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            _descuento > 0 ? `${_descuento}%` : '-',
            `$${_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ];
    });

    autoTable(doc, {
        startY: 82,
        head: [['CANT', 'FACTOR', 'DESCRIPCION', 'P. UNIT', 'BONIF.', 'TOTAL']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'center', cellWidth: 15 },
            2: { halign: 'left' },
            3: { halign: 'right', cellWidth: 25 },
            4: { halign: 'center', cellWidth: 15 },
            5: { halign: 'right', cellWidth: 25 }
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
            const finalY = data.cursor ? data.cursor.y : 82;
            const footerY = Math.max(finalY + 10, 250);

            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text("ESTE DOCUMENTO NO TIENE VALOR FISCAL. ENTREGA SUJETA A DISPONIBILIDAD DE STOCK. EL RECEPTOR CONFORMA LA RECEPCIÓN DE LA MERCADERÍA.", 10, 280, { maxWidth: 100 });

            doc.rect(130, footerY, 70, 25);
            doc.setFontSize(9);
            doc.text("Subtotal:", 132, footerY + 6);
            doc.text(`$${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 195, footerY + 6, { align: "right" });

            doc.text("Descuentos:", 132, footerY + 12);
            doc.text("$0.00", 195, footerY + 12, { align: "right" });

            doc.line(130, footerY + 16, 200, footerY + 16);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("TOTAL:", 132, footerY + 21);
            doc.text(`$${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 195, footerY + 21, { align: "right" });
        }
    });

    return doc;
};

// Helper to generate 80mm Ticket PDF
const generateTicketPDF = (order: any, config: any, products: any[]) => {
    const activeItems = (order.items || []).filter((it: any) => {
        const q = parseFloat(String(it.cantidad || it.CANTIDAD || 0).replace(',', '.'));
        return q > 0;
    });

    const pageHeight = Math.max(120, 75 + activeItems.length * 10);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, pageHeight]
    });

    // Header
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(config?.EMPRESA || 'WANDA DISTRIBUCIONES', 40, 8, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.text(config?.APP_TAGLINE || '', 40, 12, { align: "center" });
    if (config?.REMITO_DIRECCION) doc.text(config.REMITO_DIRECCION, 40, 16, { align: "center" });
    if (config?.REMITO_TELEFONO) doc.text(`Tel: ${config.REMITO_TELEFONO}`, 40, 20, { align: "center" });

    doc.text("------------------------------------------", 40, 24, { align: "center" });

    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text("COMPROBANTE DE ENTREGA", 5, 29);
    
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(`PEDIDO ID: ${order.id.slice(-8)}`, 5, 34);
    doc.text(`Fecha: ${order.fecha?.split('T')[0] || 'S/D'} ${order.fecha?.split('T')[1]?.slice(0, 5) || ''}`, 5, 38);
    doc.text(`Vendedor: ${order.vendedor || 'S/V'}`, 5, 42);

    doc.text("------------------------------------------", 40, 46, { align: "center" });

    doc.text(`Cliente: ${order.cliente_nombre}`, 5, 51);
    doc.text(`Domicilio: ${order.direccion || 'Retiro en Local'}`, 5, 55);
    if (order.notas) {
        doc.text(`Notas: ${order.notas}`, 5, 59, { maxWidth: 70 });
    }

    doc.text("------------------------------------------", 40, order.notas ? 66 : 63, { align: "center" });

    const startTableY = order.notas ? 69 : 66;

    const tableData = activeItems.map((item: any) => {
        let qty = parseFloat(String(item.cantidad || item.CANTIDAD || 0).replace(',', '.'));
        let displayedPrice = parseFloat(String(item.precio || item.PRECIO || 0).replace(',', '.')) || 0;
        
        const pId = item.id_prod || item.id_producto || item.id;
        const prod = (products || []).find((p: any) => String(p.ID_Producto) === String(pId));
        const isKg = item.unidad_medida === 'kg' || prod?.Unidad?.toLowerCase() === 'kg';
        const unitLabel = isKg ? 'kg' : 'un';
        
        const itemIsBulto = item.esBulto === true || 
                            String(item.detalle || '').toUpperCase() === 'BULTO' || 
                            String(item.formato || item._formato || '').toUpperCase() === 'BULTO' || 
                            String(item.nombre || '').toUpperCase().includes('BULTO');

        let qtyDisplay = '';
        if (isKg) {
            qtyDisplay = `${parseFloat(String(qty)).toFixed(3)}kg`;
        } else {
            const bul = item.bultos || item.BULTOS || 0;
            const uni = item.unidades || item.UNIDADES || 0;
            if (bul > 0 || uni > 0) {
                if (bul > 0 && uni > 0) qtyDisplay = `${bul}B/${uni}${unitLabel}`;
                else if (bul > 0) qtyDisplay = `${bul}B`;
                else qtyDisplay = `${uni}${unitLabel}`;
            } else {
                qtyDisplay = itemIsBulto ? `${qty}B` : `${qty}${unitLabel}`;
            }
        }

        const _subtotal = parseFloat(String(item.subtotal).replace(',', '.')) || 0;
        const _descuento = parseFloat(String(item.descuento || 0).replace(',', '.')) || 0;

        return [
            qtyDisplay,
            `${item.nombre} (P.U: $${displayedPrice.toLocaleString()}${_descuento > 0 ? ` -${_descuento}%` : ''})`,
            `$${_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ];
    });

    autoTable(doc, {
        startY: startTableY,
        head: [['CANT', 'PRODUCTO', 'TOTAL']],
        body: tableData,
        theme: 'plain',
        headStyles: { textColor: [0, 0, 0], fontSize: 8, font: 'courier', fontStyle: 'bold', borderBottom: '1px dashed #000' },
        styles: { fontSize: 8, font: 'courier', cellPadding: 1, textColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 40 },
            2: { halign: 'right', cellWidth: 17 }
        },
        margin: { left: 4, right: 4 },
        didDrawPage: (data) => {
            const finalY = data.cursor ? data.cursor.y : startTableY;
            
            doc.setFont("courier", "normal");
            doc.setFontSize(8);
            doc.text("------------------------------------------", 40, finalY + 4, { align: "center" });

            doc.text("Subtotal:", 5, finalY + 9);
            doc.text(`$${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 75, finalY + 9, { align: "right" });

            doc.setFont("courier", "bold");
            doc.setFontSize(9);
            doc.text("TOTAL:", 5, finalY + 14);
            doc.text(`$${parseFloat(order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 75, finalY + 14, { align: "right" });

            doc.setFont("courier", "normal");
            doc.setFontSize(8);
            doc.text("------------------------------------------", 40, finalY + 18, { align: "center" });

            doc.setFontSize(7);
            doc.text("ESTE DOCUMENTO NO TIENE VALOR FISCAL.", 40, finalY + 23, { align: "center" });
            doc.setFontSize(8);
            doc.setFont("courier", "bold");
            doc.text("¡MUCHAS GRACIAS POR SU COMPRA!", 40, finalY + 28, { align: "center" });
        }
    });

    return doc;
};

export const printOrders = (rawOrderList: any[], config: any, products: any[], allOrders: any[] = [], format: 'remito' | 'ticket' = 'remito') => {
    // Filtrar pedidos vacíos (total 0)
    const orderList = rawOrderList.filter(o => (parseFloat(String(o.total).replace(',', '.')) || 0) > 0);

    if (orderList.length === 0) return;

    // Detectar si es un dispositivo móvil
    const isMobile = typeof window !== 'undefined' && 
                     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
        try {
            const doc = format === 'ticket' 
                ? generateTicketPDF(orderList[0], config, products)
                : generateRemitoPDF(orderList[0], config, products);
            
            const blob = doc.output('blob');
            const fileName = `pedido-${orderList[0].id.slice(-8)}.pdf`;
            const file = new File([blob], fileName, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: `Pedido #${orderList[0].id.slice(-8)}`,
                    text: `Comprobante de Pedido - ${config?.EMPRESA || 'Wanda Store'}`
                }).catch(err => {
                    console.error("Error sharing PDF via Web Share API", err);
                    doc.save(fileName);
                });
            } else {
                // Fallback: abrir en nueva pestaña creando un object URL
                const fileURL = URL.createObjectURL(blob);
                window.open(fileURL, '_blank');
            }
        } catch (e) {
            console.error("Error generating/sharing PDF", e);
            alert("Error al generar el PDF. Inténtalo de nuevo.");
        }
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (format === 'ticket') {
        const html = `
            <html>
            <head>
                <title>Ticket de Entrega</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 6px; color: #000; font-size: 11px; line-height: 1.3; }
                    .ticket-page { page-break-after: always; }
                    .ticket { width: 72mm; max-width: 100%; margin: 0 auto; box-sizing: border-box; }
                    .header { text-align: center; margin-bottom: 8px; }
                    .company { font-size: 14px; font-weight: bold; text-transform: uppercase; }
                    .tagline { font-size: 9px; text-transform: uppercase; margin-bottom: 2px; }
                    .contact { font-size: 9px; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .section-title { font-weight: bold; text-transform: uppercase; font-size: 10px; margin-bottom: 4px; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    .info-val { font-weight: bold; text-align: right; }
                    .table-header { display: flex; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 3px; margin-bottom: 4px; }
                    .item-row { display: flex; margin-bottom: 4px; align-items: flex-start; }
                    .col-qty { width: 15%; text-align: left; }
                    .col-desc { width: 60%; text-align: left; word-break: break-word; }
                    .col-tot { width: 25%; text-align: right; }
                    .price-details { font-size: 9px; color: #555; padding-left: 15%; margin-top: -2px; margin-bottom: 4px; }
                    .total-box { margin-top: 8px; }
                    .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 2px; }
                    .footer-text { text-align: center; font-size: 8px; color: #666; margin-top: 15px; margin-bottom: 25px; line-height: 1.2; text-transform: uppercase; }
                    @media print {
                        @page { size: 80mm auto; margin: 0; }
                        body { width: 72mm; margin: 0; padding: 4px; }
                        .ticket-page { page-break-after: always; }
                    }
                </style>
            </head>
            <body>
                ${orderList.map((order, index) => {
                    const activeItems = (order.items || []).filter((it: any) => {
                        const q = parseFloat(String(it.cantidad || it.CANTIDAD || 0).replace(',', '.'));
                        return q > 0;
                    });
                    
                    return `
                        <div class="ticket-page">
                            <div class="ticket">
                                <div class="header">
                                    <div class="company">${config?.EMPRESA || 'WANDA DISTRIBUCIONES'}</div>
                                    <div class="tagline">${config?.APP_TAGLINE || ''}</div>
                                    <div class="contact">
                                        ${config?.REMITO_DIRECCION ? `<div>${config.REMITO_DIRECCION}</div>` : ''}
                                        ${config?.REMITO_TELEFONO ? `<div>Tel: ${config.REMITO_TELEFONO}</div>` : ''}
                                    </div>
                                </div>
                                
                                <div class="divider"></div>
                                
                                <div class="section-title">Comprobante de Entrega</div>
                                <div class="info-row"><span>PEDIDO ID:</span> <span class="info-val">${order.id.slice(-8)}</span></div>
                                <div class="info-row"><span>Fecha:</span> <span class="info-val">${order.fecha?.split('T')[0] || 'S/D'} ${order.fecha?.split('T')[1]?.slice(0, 5) || ''}</span></div>
                                <div class="info-row"><span>Vendedor:</span> <span class="info-val">${order.vendedor || 'S/V'}</span></div>
                                
                                <div class="divider"></div>
                                
                                <div class="info-row"><span>Cliente:</span> <span class="info-val" style="text-align: right;">${order.cliente_nombre}</span></div>
                                <div class="info-row"><span>Domicilio:</span> <span class="info-val" style="text-align: right;">${order.direccion || 'Retiro en Local'}</span></div>
                                ${order.notas ? `<div style="margin-top: 4px; font-size: 9px;"><strong>Notas:</strong> ${order.notas}</div>` : ''}
                                
                                <div class="divider"></div>
                                
                                <div class="table-header">
                                    <div class="col-qty">CANT</div>
                                    <div class="col-desc">PRODUCTO</div>
                                    <div class="col-tot">TOTAL</div>
                                </div>
                                
                                ${activeItems.map((item: any) => {
                                    let qty = parseFloat(String(item.cantidad || item.CANTIDAD || 0).replace(',', '.'));
                                    let displayedPrice = parseFloat(String(item.precio || item.PRECIO || 0).replace(',', '.')) || 0;
                                    const pId = item.id_prod || item.id_producto || item.id;
                                    const prod = (products || []).find((p: any) => String(p.ID_Producto) === String(pId));
                                    const isKg = item.unidad_medida === 'kg' || prod?.Unidad?.toLowerCase() === 'kg';
                                    const unitLabel = isKg ? 'kg' : 'un';
                                    
                                    const itemIsBulto = item.esBulto === true || 
                                                        String(item.detalle || '').toUpperCase() === 'BULTO' || 
                                                        String(item.formato || item._formato || '').toUpperCase() === 'BULTO' || 
                                                        String(item.nombre || '').toUpperCase().includes('BULTO');

                                    let qtyDisplay = '';
                                    if (isKg) {
                                        qtyDisplay = `${parseFloat(String(qty)).toFixed(3)}kg`;
                                    } else {
                                        const bul = item.bultos || item.BULTOS || 0;
                                        const uni = item.unidades || item.UNIDADES || 0;
                                        if (bul > 0 || uni > 0) {
                                            if (bul > 0 && uni > 0) qtyDisplay = `${bul}B/${uni}${unitLabel}`;
                                            else if (bul > 0) qtyDisplay = `${bul}B`;
                                            else qtyDisplay = `${uni}${unitLabel}`;
                                        } else {
                                            qtyDisplay = itemIsBulto ? `${qty}B` : `${qty}${unitLabel}`;
                                        }
                                    }

                                    const _subtotal = parseFloat(String(item.subtotal).replace(',', '.')) || 0;
                                    const _descuento = parseFloat(String(item.descuento || 0).replace(',', '.')) || 0;
                                    
                                    return `
                                        <div class="item-row">
                                            <div class="col-qty">${qtyDisplay}</div>
                                            <div class="col-desc">${item.nombre}</div>
                                            <div class="col-tot">$${_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                        </div>
                                        <div class="price-details">
                                            P.Unit: $${displayedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            ${_descuento > 0 ? ` | Desc: ${_descuento}%` : ''}
                                        </div>
                                    `;
                                }).join('')}
                                
                                <div class="divider"></div>
                                
                                <div class="total-box">
                                    <div class="info-row"><span>Subtotal:</span> <span>$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                    <div class="total-row"><span>TOTAL:</span> <span>$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                                </div>
                                
                                <div class="divider"></div>
                                
                                <div class="footer-text">
                                    ESTE DOCUMENTO NO TIENE VALOR FISCAL.<br>
                                    ¡MUCHAS GRACIAS POR SU COMPRA!
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
                <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        return;
    }

    const html = `
        <html>
        <head>
            <title>Remitos de Entrega</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #000; line-height: 1.2; }
                .print-page { page-break-after: always; padding: 10px; display: flex; flex-direction: column; gap: 15px; }
                .copy-type {
                    position: absolute; 
                    top: 4px; 
                    right: 12px; 
                    font-size: 10px; 
                    font-weight: bold; 
                    text-transform: uppercase; 
                    color: #999; 
                }
                .remito { 
                    position: relative;
                    border: 2px solid #000; 
                    padding: 8px 12px; 
                    display: flex;
                    flex-direction: column;
                    background: #fff;
                    height: 135mm;
                    box-sizing: border-box;
                }
                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; }
                .company { font-size: 18px; font-weight: 900; text-transform: uppercase; background: #ffea00; display: inline-block; padding: 2px 5px;}
                .company-details { font-size: 9px; margin-top: 2px; text-transform: uppercase; }
                .x-box { border: 2px solid #000; text-align: center; padding: 2px 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 40px; margin-top: 5px;}
                .x-mark { font-size: 26px; font-weight: 900; line-height: 1; margin-bottom: 2px;}
                .x-sub { font-size: 6px; font-weight: bold; text-transform: uppercase; line-height: 1.1;}

                .info-box { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px; font-size: 10px; display: flex; flex-direction: column; gap: 4px; }
                .info-row { display: flex; justify-content: space-between; }

                .table-wrapper { flex: 1; overflow: hidden; display: flex; flex-direction: column;}
                table { width: 100%; border-collapse: collapse; height: 100%; }
                th { border: 1px solid #000; border-top: none; padding: 4px; font-size: 9px; font-weight: 900; text-align: center; }
                th:last-child { border-right: none; }
                td { border-right: 1px solid #000; border-left: 1px solid #000; padding: 2px 4px; font-size: 11px; vertical-align: top; }
                td.num { text-align: right; }
                td.cen { text-align: center; }
                td:first-child { border-left: none; }
                td:last-child { border-right: none; }
                tr.item-row td { border-bottom: none; border-top: none; height: 1%; } /* 1% makes row fit content tightly */
                tr.stretcher-row td { border-bottom: none; border-top: none; height: auto; }

                .footer { border-top: 2px solid #000; margin-top: auto; padding-top: 5px; display: flex; justify-content: space-between; align-items: flex-end; }
                .obs { width: 50%; font-size: 8px; color: #666; }
                .totals-box { width: 45%; display: flex; flex-direction: column; align-items: flex-end;}
                .subtotal-row { display: flex; justify-content: space-between; width: 100%; font-size: 11px; margin-bottom: 2px;}
                .total-row { display: flex; justify-content: space-between; width: 100%; font-size: 13px; font-weight: 900; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;}

                @media print {
                    @page { size: A4; margin: 10mm; }
                    .print-page { padding: 0; margin: 0; gap: 8mm;}
                    .remito { height: 134mm; }
                    .remito.long-format { height: 275mm; }
                }
            </style>
        </head>
        <body>
            ${orderList.map((order, index) => {
                // Filtrar items con cantidad 0
                const activeItems = (order.items || []).filter((it: any) => {
                    const q = parseFloat(String(it.cantidad || it.CANTIDAD || 0).replace(',', '.'));
                    return q > 0;
                });
                const isLong = activeItems.length > 17;
                const copies = ['ORIGINAL', 'DUPLICADO'].map((type) => `
                    <div class="remito ${isLong ? 'long-format' : ''}">
                        <div class="copy-type">${type}</div>
                        <div class="header">
                                <div style="width: 45%;">
                                    <div class="company">${config?.EMPRESA || 'WANDA DISTRIBUCIONES'}</div>
                                    <div class="company-details">${config?.REMITO_DIRECCION || ''}</div>
                                    <div class="company-details">Tel: ${config?.REMITO_TELEFONO || ''}</div>
                                </div>
                                <div style="display: flex; gap: 10px; align-items: center; width: 30%;">
                                    <div class="x-box">
                                        <span class="x-mark">X</span>
                                        <span class="x-sub">Doc. no válido<br>como factura</span>
                                    </div>
                                    <div>
                                        ${(() => {
                                            let orderIdx = index + 1;
                                            if (order.reparto && allOrders.length > 0) {
                                                const inRoute = allOrders.filter(o => o.reparto === order.reparto && (parseFloat(String(o.total).replace(',', '.')) || 0) > 0);
                                                const foundIdx = inRoute.findIndex(o => o.id === order.id);
                                                if (foundIdx !== -1) orderIdx = foundIdx + 1;
                                                return `<div style="font-weight: 900; font-size: 14px; color: #000; border: 2px solid #000; padding: 1px 5px; background: #eee; margin-bottom: 2px;">ORDEN: ${orderIdx}</div>`;
                                            }
                                            return orderList.length > 1 ? `<div style="font-weight: bold; font-size: 9px; color: #555;">Bulto ${index + 1}/${orderList.length}</div>` : '';
                                        })()}
                                        <div style="font-weight: 900; font-size: 10px; margin-top: 1px;">PEDIDO</div>
                                        <div style="font-weight: 900; font-size: 14px; margin-top: -2px;">${order.id.slice(-8)}</div>
                                    </div>
                                </div>
                                <div style="width: 25%; text-align: right; font-size: 10px; font-weight: bold;">
                                    <div>Fecha: ${order.fecha?.split('T')[0] || 'S/D'}</div>
                                    <div style="margin-top:2px;">Vendedor: ${order.vendedor || 'S/V'}</div>
                                </div>
                            </div>
                            
                            <div class="info-box">
                                <div class="info-row">
                                    <div style="width: 70%;"><strong>Señor(es):</strong> ${order.cliente_nombre}</div>
                                    <div style="width: 30%;"><strong>CUIT/DNI:</strong> -</div>
                                </div>
                                <div><strong>Domicilio:</strong> ${order.direccion || 'Sin dirección registrada'}</div>
                                <div class="info-row">
                                    <div style="width: 40%;"><strong>Tip/Resp:</strong> -</div>
                                    <div style="width: 30%;"><strong>Fma pago:</strong> -</div>
                                    <div style="width: 30%; text-align: right;">${order.vendedor || 'S/V'}</div>
                                </div>
                                ${order.notas ? `<div><strong>Notas:</strong> ${order.notas}</div>` : ''}
                            </div>
                            
                            <div class="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th width="12%">CANT.</th>
                                             <th width="8%">FACTOR</th>
                                            <th width="40%">DESCRIPCIÓN</th>
                                            <th width="15%">P. UNIT.</th>
                                            <th width="10%">BONIF.</th>
                                            <th width="15%">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${activeItems.map((item: any) => {
                                            let qty = parseFloat(String(item.cantidad || item.CANTIDAD || 0).replace(',', '.'));
                                            let displayedPrice = parseFloat(String(item.precio || item.PRECIO || 0).replace(',', '.')) || 0;

                                            const bul = item.bultos || item.BULTOS || 0;
                                            const uni = item.unidades || item.UNIDADES || 0;

                                            const pId = item.id_prod || item.id_producto || item.id;
                                            const prod = (products || []).find((p: any) => String(p.ID_Producto) === String(pId));
                                            const isKg = item.unidad_medida === 'kg' || prod?.Unidad?.toLowerCase() === 'kg';
                                            const unitLabel = isKg ? 'kg' : 'un';

                                            // Normalización preventiva para pesables en Remito
                                            // Si el precio indica piezas pero es pesable, convertimos a kilaje estimado para el remito
                                            if (isKg && prod && !item._pesableTratado) {
                                                const weightAvg = parseFloat(String(prod.Peso || prod.Peso_Promedio || "1").replace(',', '.'));
                                                const priceKg = parseFloat(String(prod.Precio_Unitario || "0").replace(',', '.'));
                                                const piecePrice = priceKg * weightAvg;
                                                const diffKg = Math.abs(displayedPrice - priceKg);
                                                const diffPiece = Math.abs(displayedPrice - piecePrice);

                                                // Solo normalizamos si el precio actual está más cerca del precio por PIEZA que del precio por KG
                                                // y si no parece estar ya en formato de peso real (comparado con priceKg)
                                                if (weightAvg > 0 && diffKg > 0.1 && (diffPiece < diffKg || (displayedPrice > priceKg * 1.5 && weightAvg > 1.1))) {
                                                    qty = qty * weightAvg;
                                                    displayedPrice = priceKg;
                                                }
                                            }
                                            
                                            const itemIsBulto = item.esBulto === true || 
                                                                String(item.detalle || '').toUpperCase() === 'BULTO' || 
                                                                String(item.formato || item._formato || '').toUpperCase() === 'BULTO' || 
                                                                String(item.nombre || '').toUpperCase().includes('BULTO');

                                            let qtyDisplay = '';
                                            if (isKg) {
                                                // Para productos pesables, priorizamos siempre mostrar el kilaje (estimado o corregido)
                                                qtyDisplay = `${parseFloat(String(qty)).toFixed(3)} Kg`;
                                            } else if (item.picking_format) {
                                                qtyDisplay = item.picking_format;
                                            } else if (bul > 0 || uni > 0) {
                                                if (bul > 0 && uni > 0) qtyDisplay = `${bul} B / ${uni} ${unitLabel}`;
                                                else if (bul > 0) qtyDisplay = `${bul} BUL`;
                                                else qtyDisplay = `${uni} ${unitLabel}`;
                                            } else {
                                                qtyDisplay = itemIsBulto ? `${qty} BUL` : `${qty} ${unitLabel}`;
                                            }

                                            const factor = prod?.UB || prod?.Unidades_Bulto || 1;
                                            const factorDisplay = itemIsBulto ? `x${factor}` : '-';

                                            // El displayedPrice ya se calculó arriba contemplando normalización de pesables
                                            // let displayedPrice = parseFloat(String(item.precio).replace(',', '.')) || 0;
                                            const _subtotal = parseFloat(String(item.subtotal).replace(',', '.')) || 0;
                                            const _descuento = parseFloat(String(item.descuento || 0).replace(',', '.')) || 0;
                                            const expectedSubT = displayedPrice * qty * (1 - _descuento / 100);
                                            
                                            if (itemIsBulto && factor > 1 && qty > 0) {
                                                const priceIfWasUnit = (displayedPrice * factor) * qty * (1 - _descuento / 100);
                                                if (Math.abs(_subtotal - priceIfWasUnit) < Math.abs(_subtotal - expectedSubT)) {
                                                     displayedPrice = displayedPrice * factor;
                                                }
                                            }

                                            return `
                                                <tr class="item-row">
                                                    <td class="cen">${qtyDisplay}</td>
                                                    <td class="cen" style="color: #666; font-size: 9px;">${factorDisplay}</td>
                                                    <td>${item.nombre}</td>
                                                    <td class="num">$${displayedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                    <td class="cen">${_descuento > 0 ? `${_descuento}%` : '-'}</td>
                                                    <td class="num">$${_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            `;
                                        }).join('')}
                                        ${Array(Math.max(0, 17 - activeItems.length)).fill(0).map(() => `
                                            <tr class="item-row">
                                                <td class="cen">&nbsp;</td>
                                                <td class="cen">&nbsp;</td>
                                                <td>&nbsp;</td>
                                                <td class="num">&nbsp;</td>
                                                <td class="cen">&nbsp;</td>
                                                <td class="num">&nbsp;</td>
                                            </tr>
                                        `).join('')}
                                        <tr class="stretcher-row">
                                            <td class="cen"></td>
                                            <td class="cen"></td>
                                            <td></td>
                                            <td class="num"></td>
                                            <td class="cen"></td>
                                            <td class="num"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="footer">
                                <div class="obs">
                                    ESTE DOCUMENTO NO TIENE VALOR FISCAL. ENTREGA SUJETA A DISPONIBILIDAD DE STOCK. EL RECEPTOR CONFORMA LA RECEPCIÓN DE LA MERCADERÍA.
                                </div>
                                <div class="totals-box">
                                    <div class="subtotal-row">
                                        <span>Subtotal:</span>
                                        <span>$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div class="subtotal-row">
                                        <span>Descuentos:</span>
                                        <span>$0</span>
                                    </div>
                                    <div class="total-row">
                                        <span>TOTAL:</span>
                                        <span>$${(parseFloat(String(order.total).replace(',', '.')) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `);

                if (isLong) {
                    return copies.map(copy => `<div class="print-page">${copy}</div>`).join('');
                } else {
                    return `<div class="print-page">${copies.join('')}</div>`;
                }
            }).join('')}

            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
