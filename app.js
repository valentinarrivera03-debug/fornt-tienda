/* app.js
   Frontend para consumir:
   - productos:  https://tienda-p.onrender.com/projects/api/productos/
   - categorias: https://tienda-p.onrender.com/projects/api/categorias/
   - movimientos: https://tienda-p.onrender.com/projects/api/movimientos/
   - empleados: https://tienda-p.onrender.com/projects/api/empleados/
*/

const API = {
  base: 'https://tienda-p.onrender.com/projects/api',
  productos: 'https://tienda-p.onrender.com/projects/api/productos/',
  categorias: 'https://tienda-p.onrender.com/projects/api/categorias/',
  movimientos: 'https://tienda-p.onrender.com/projects/api/movimientos/',
  empleados: 'https://tienda-p.onrender.com/projects/api/empleados/'
};

let productos = [];
let categorias = [];
let empleados = [];
let movimientos = [];

document.addEventListener('DOMContentLoaded', init);

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

async function init(){
  bindUI();
  await Promise.all([loadProductos(), loadCategorias(), loadEmpleados(), loadMovimientos()]);
  populateFilters();
  renderProductosTable();
  renderMovimientosList();
}

/* ---------- UI bindings ---------- */
function bindUI(){
  qs('#newMovementBtn').addEventListener('click', () => openModal());
  qs('#closeModal').addEventListener('click', closeModal);
  qs('#cancelModal').addEventListener('click', closeModal);
  qs('#movementForm').addEventListener('submit', onSubmitMovement);
  qs('#aplicarFiltros').addEventListener('click', aplicarFiltros);
  qs('#limpiarFiltros').addEventListener('click', limpiarFiltros);
  qs('#verMasMovimientos').addEventListener('click', () => renderMovimientosList(true));
}

/* ---------- Fetchers ---------- */
async function loadProductos(){
  try{
    const res = await fetch(API.productos);
    productos = await res.json();
    // espera un array
    populateProductoSelect();
  }catch(err){
    console.error('Error cargando productos', err);
    productos = [];
  }
}

async function loadCategorias(){
  try{
    const res = await fetch(API.categorias);
    categorias = await res.json();
    populateCategoriaFilter();
  }catch(err){
    console.error('Error cargando categorias', err);
    categorias = [];
  }
}

async function loadEmpleados(){
  try{
    const res = await fetch(API.empleados);
    empleados = await res.json();
    populateEmpleadoFilter();
    populateEmpleadoSelect();
  }catch(err){
    console.error('Error cargando empleados', err);
    empleados = [];
  }
}

async function loadMovimientos(limit = 10){
  try{
    // Si tu API soporta query params para limite, úsalos; si no, se asume que devuelve todos y los truncamos
    const res = await fetch(API.movimientos);
    movimientos = await res.json();
    // orden descendente por fecha si existe campo fecha
    movimientos.sort((a,b) => {
      const da = new Date(a.created_at || a.fecha || a.timestamp || a.date || 0);
      const db = new Date(b.created_at || b.fecha || b.timestamp || b.date || 0);
      return db - da;
    });
    movimientos = movimientos.slice(0, limit);
  }catch(err){
    console.error('Error cargando movimientos', err);
    movimientos = [];
  }
}

/* ---------- Renderers ---------- */
function renderProductosTable(){
  const tbody = qs('#productosBody');
  tbody.innerHTML = '';
  const filtroCat = qs('#categoriaFilter')?.value || '';
  const filtroEmp = qs('#empleadoFilter')?.value || '';

  let list = productos.slice();

  if(filtroCat) list = list.filter(p => String(p.categoria_id || p.categoria || p.categoria_id?.id || '') === filtroCat);
  // filtro por empleado no tiene sentido aquí (productos), se deja para movimientos

  for(const p of list){
    const tr = document.createElement('tr');
    const catName = findCategoriaNombre(p);
    tr.innerHTML = `
      <td>${escapeHtml(p.nombre || p.name || '—')}</td>
      <td>${escapeHtml(catName)}</td>
      <td>${formatMoney(p.precio)}</td>
      <td><span class="stock-badge">${p.stock ?? 0}</span></td>
      <td>
        <button class="btn" data-action="mov" data-id="${p.id}">Mover</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Add handler for move buttons
  qsa('[data-action="mov"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      openModal(id);
    });
  });
}

function renderMovimientosList(more=false){
  const listEl = qs('#movimientosList');
  listEl.innerHTML = '';
  // Si necesitamos mostrar más, pedimos más movimientos
  loadMovimientos(more ? 50 : 10).then(()=>{
    for(const m of movimientos){
      const li = document.createElement('li');
      li.className = 'mov-item';
      const productoNombre = getProductNameFromMovimiento(m);
      const tipo = (m.tipo || m.type || '').toLowerCase();
      const signo = tipo === 'salida' ? '−' : '+';
      const cantidad = m.cantidad ?? m.cant ?? m.quantity ?? m.qty ?? 0;
      const empleadoNombre = getEmpleadoNombre(m);
      const fecha = formatDate(m.created_at || m.fecha || m.timestamp || '');

      li.innerHTML = `
        <div class="mov-left">
          <strong>${escapeHtml(productoNombre)}</strong>
          <span class="mov-meta">${escapeHtml(empleadoNombre)} • ${escapeHtml(m.tipo || m.type || '')} • ${escapeHtml(m.motivo || m.nota || '')}</span>
        </div>
        <div>
          <div><strong>${signo}${cantidad}</strong></div>
          <div class="mov-meta">${fecha}</div>
        </div>
      `;
      listEl.appendChild(li);
    }
  }).catch(err => console.error(err));
}

/* ---------- Populate selects & filters ---------- */
function populateProductoSelect(){
  const sel = qs('#productoSelect');
  if(!sel) return;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona un producto...';
  placeholder.disabled = true;
  placeholder.selected = true;
  sel.appendChild(placeholder);

  for(const p of productos){
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre || p.name} — stock: ${p.stock ?? 0}`;
    sel.appendChild(opt);
  }
}

function populateEmpleadoSelect(){
  const sel = qs('#empleadoSelect');
  if(!sel) return;
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona un empleado...';
  placeholder.disabled = true;
  placeholder.selected = true;
  sel.appendChild(placeholder);

  for(const e of empleados){
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = `${e.nombre || e.name || e.username || 'Empleado ' + e.id}`;
    sel.appendChild(opt);
  }
}

function populateCategoriaFilter(){
  const sel = qs('#categoriaFilter');
  if(!sel) return;
  sel.innerHTML = '<option value="">Todas las categorías</option>';
  for(const c of categorias){
    const opt = document.createElement('option');
    opt.value = c.id ?? c.pk ?? c.id;
    opt.textContent = c.nombre || c.name || 'Categoría';
    sel.appendChild(opt);
  }
}

function populateEmpleadoFilter(){
  const sel = qs('#empleadoFilter');
  if(!sel) return;
  sel.innerHTML = '<option value="">Todos los empleados</option>';
  for(const e of empleados){
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.nombre || e.name || e.username || 'Empleado ' + e.id;
    sel.appendChild(opt);
  }
}

function populateFilters(){
  populateCategoriaFilter();
  populateEmpleadoFilter();
}

/* ---------- Modal control ---------- */
function openModal(prefillProductId = null){
  qs('#movementModal').setAttribute('aria-hidden','false');
  qs('#productoSelect').value = prefillProductId || '';
  // si no hay empleado, poner el primero
  if(empleados.length && !qs('#empleadoSelect').value){
    qs('#empleadoSelect').value = empleados[0].id;
  }
}

function closeModal(){
  qs('#movementModal').setAttribute('aria-hidden','true');
  qs('#movementForm').reset();
}

/* ---------- Form submit: registrar movimiento ---------- */
async function onSubmitMovement(e){
  e.preventDefault();
  const productoId = qs('#productoSelect').value;
  const empleadoId = qs('#empleadoSelect').value;
  const tipo = qs('#tipoMovimiento').value;
  const cantidad = Number(qs('#cantidad').value);
  const motivo = qs('#motivo').value;

  if(!productoId || !empleadoId || !tipo || !cantidad || cantidad <= 0){
    alert('Completa los campos obligatorios.');
    return;
  }

  const payload = {
    producto_id: productoId,
    empleado_id: empleadoId,
    tipo: tipo,
    cantidad: cantidad,
    motivo: motivo || ''
  };

  try{
    // 1) Crear movimiento
    const res = await fetch(API.movimientos, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });

    if(!res.ok){
      const errText = await res.text();
      throw new Error('Error creando movimiento: ' + errText);
    }

    const created = await res.json();
    console.log('Movimiento creado:', created);

    // 2) Intentar actualizar stock del producto localmente en el servidor (si la API lo permite)
    const producto = productos.find(p => String(p.id) === String(productoId));
    if(producto){
      let nuevoStock = Number(producto.stock ?? 0);
      if(tipo === 'salida') nuevoStock -= cantidad;
      else nuevoStock += cantidad;
      if(nuevoStock < 0) nuevoStock = 0;

      // Intentamos hacer PATCH a la ruta producto específico
      try{
        const patchUrl = API.productos + productoId + '/';
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ stock: nuevoStock })
        });
        if(!patchRes.ok){
          // intentar PUT sin slash (por si la API difiere)
          const altUrl = API.productos + productoId;
          await fetch(altUrl, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ stock: nuevoStock })
          }).catch(()=>{});
        }
      }catch(patchErr){
        // Si falla, no rompemos el flujo: la API podría actualizar stock automáticamente en backend
        console.warn('No se pudo hacer PATCH de stock (no crítico):', patchErr);
      }
    }

    // 3) Refrescar datos
    await Promise.all([loadProductos(), loadMovimientos()]);
    renderProductosTable();
    renderMovimientosList();

    closeModal();
    alert('Movimiento registrado correctamente.');
  }catch(err){
    console.error(err);
    alert('Error al registrar movimiento: ' + (err.message || err));
  }
}

/* ---------- Filtros ---------- */
function aplicarFiltros(){
  renderProductosTable();
}

function limpiarFiltros(){
  qs('#categoriaFilter').value = '';
  qs('#empleadoFilter').value = '';
  renderProductosTable();
}

/* ---------- Helpers ---------- */
function findCategoriaNombre(producto){
  if(!producto) return '';
  // intenta varios campos
  const catId = producto.categoria_id ?? producto.categoria ?? producto.categoria_id?.id ?? null;
  if(!catId) return producto.categoria_nombre || producto.categoriaName || '—';
  const c = categorias.find(x => String(x.id) === String(catId) || String(x.pk) === String(catId));
  return c ? (c.nombre || c.name) : (producto.categoria_nombre || producto.categoriaName || '—');
}

function getProductNameFromMovimiento(m){
  return m.producto_nombre || m.producto?.nombre || m.producto?.name || productos.find(p => String(p.id) === String(m.producto_id))?.nombre || 'Producto';
}

function getEmpleadoNombre(m){
  return m.empleado_nombre || m.empleado?.nombre || empleados.find(e => String(e.id) === String(m.empleado_id))?.nombre || 'Empleado';
}

function formatMoney(val){
  if(val == null || val === '') return '—';
  const num = Number(val);
  if(isNaN(num)) return String(val);
  return '$' + num.toLocaleString('es-CO');
}

function formatDate(d){
  if(!d) return '';
  const dt = new Date(d);
  if(isNaN(dt)) return String(d);
  return dt.toLocaleString('es-CO', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

function escapeHtml(str){
  if(str == null) return '';
  return String(str).replace(/[&<>"'`=\/]/g, s => {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[s];
  });
}
