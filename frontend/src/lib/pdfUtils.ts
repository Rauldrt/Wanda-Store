
export const printOrders = (rawOrderList: any[], config: any, products: any[], allOrders: any[] = []) => {
    // Filtrar pedidos vacíos (total 0)
    const orderList = rawOrderList.filter(o => (parseFloat(String(o.total).replace(',', '.')) || 0) > 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow || orderList.length === 0) return;

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
                                            const qty = item.cantidad || item.CANTIDAD || 0;
                                            const bul = item.bultos || item.BULTOS || 0;
                                            const uni = item.unidades || item.UNIDADES || 0;

                                            const pId = item.id_prod || item.id_producto || item.id;
                                            const prod = (products || []).find((p: any) => String(p.ID_Producto) === String(pId));
                                            const isKg = item.unidad_medida === 'kg' || prod?.Unidad?.toLowerCase() === 'kg';
                                            const unitLabel = isKg ? 'kg' : 'un';
                                            
                                            const itemIsBulto = item.esBulto === true || 
                                                                String(item.detalle || '').toUpperCase() === 'BULTO' || 
                                                                String(item.formato || item._formato || '').toUpperCase() === 'BULTO' || 
                                                                String(item.nombre || '').toUpperCase().includes('BULTO');

                                            let qtyDisplay = '';
                                            if (item.picking_format) {
                                                qtyDisplay = item.picking_format;
                                            } else if (isKg) {
                                                qtyDisplay = `${parseFloat(String(qty)).toFixed(3)} Kg`;
                                            } else if (bul > 0 || uni > 0) {
                                                if (bul > 0 && uni > 0) qtyDisplay = `${bul} B / ${uni} ${unitLabel}`;
                                                else if (bul > 0) qtyDisplay = `${bul} BUL`;
                                                else qtyDisplay = `${uni} ${unitLabel}`;
                                            } else {
                                                qtyDisplay = itemIsBulto ? `${qty} BUL` : `${qty} ${unitLabel}`;
                                            }

                                            const factor = prod?.UB || prod?.Unidades_Bulto || 1;
                                            const factorDisplay = itemIsBulto ? `x${factor}` : '-';

                                            let displayedPrice = parseFloat(String(item.precio).replace(',', '.')) || 0;
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
