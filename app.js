/* app.js - VERSION LIMPIA SIN DEBUG */
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
  console.log('🔄 Iniciando aplicación...');
  
  try {
    bindUI();
    await loadProductos();
    await loadCategorias(); 
    await loadEmpleados();
    await loadMovimientos();
    populateFilters();
    populateEmpleadoSelect();
    renderProductosTable();
    renderMovimientosList();
  } catch (error) {
    console.error('❌ Error en init:', error);
    alert('Error al cargar la aplicación. Revisa la consola para más detalles.');
  }
}

/* ---------- Fetchers ---------- */
async function loadProductos(){
  try{
    const res = await fetch(API.productos);
    
    if(!res.ok){
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    const data = await res.json();
    if (data.results) {
      productos = data.results; 
    } else if (Array.isArray(data)) {
      productos = data; 
    } else {
      productos = [data]; 
    }
    populateProductoSelect();
  }catch(err){
    console.error('❌ Error cargando productos:', err);
    productos = [];
  }
}

async function loadCategorias(){
  try{
    const res = await fetch(API.categorias);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.results) {
      categorias = data.results;
    } else if (Array.isArray(data)) {
      categorias = data;
    } else {
      categorias = [data];
    }
  }catch(err){
    console.error('❌ Error cargando categorías:', err);
    categorias = [];
  }
}

async function loadEmpleados(){
  try{
    const res = await fetch(API.empleados);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.results && Array.isArray(data.results)) {
      empleados = data.results;
    } else if (Array.isArray(data)) {
      empleados = data;
    } else if (data && typeof data === 'object') {
      empleados = [data];
    } else {
      empleados = [];
    }
    populateEmpleadoSelect();
  }catch(err){
    empleados = [];
  }
}

async function loadMovimientos(limit = 10){
  try{
    const res = await fetch(API.movimientos);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.results) {
      movimientos = data.results;
    } else if (Array.isArray(data)) {
      movimientos = data;
    } else {
      movimientos = [data];
    }
    if(movimientos.length > 0 && movimientos[0].fecha_movimiento){
      movimientos.sort((a,b) => new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento));
    }
    if (limit) {
      movimientos = movimientos.slice(0, limit);
    }
  }catch(err){
    console.error('❌ Error cargando movimientos:', err);
    movimientos = [];
  }
}

/* ---------- Renderers ---------- */
function renderProductosTable(){
  const tbody = qs('#productosBody');
  if(!tbody) return;
  tbody.innerHTML = ''
  if(productos.length === 0){
    tbody.innerHTML = '<tr><td colspan="5">No hay productos disponibles</td></tr>';
    return;
  }
  
  // Obtener valores de los filtros
  const filtroCategoria = qs('#categoriaFilter').value;
  const filtroEmpleado = qs('#empleadoFilter').value; // Este filtro no aplica a productos
  
  console.log('🔍 Filtros aplicados:', {
    categoria: filtroCategoria,
    empleado: filtroEmpleado
  });
  
  // Filtrar productos
  let productosFiltrados = productos.filter(p => {
    let pasaFiltro = true;
    
    // Filtrar por categoría (si se seleccionó una)
    if (filtroCategoria) {
      // IMPORTANTE: Comparar como números, no como strings
      const categoriaProducto = parseInt(p.categoria);
      const categoriaFiltro = parseInt(filtroCategoria);
      pasaFiltro = pasaFiltro && (categoriaProducto === categoriaFiltro);
      
      if (categoriaProducto !== categoriaFiltro) {
        console.log(`❌ Producto ${p.nombre} no pasa filtro categoría: ${categoriaProducto} !== ${categoriaFiltro}`);
      }
    }
    
    // El filtro de empleado no aplica a productos, solo a movimientos
    // Si quisieras filtrar productos por empleado, necesitarías una relación
    
    return pasaFiltro;
  });
  
  console.log(`📊 Productos después de filtrar: ${productosFiltrados.length} de ${productos.length}`);
  
  // Mostrar productos filtrados
  for(const p of productosFiltrados){
    const tr = document.createElement('tr');
    const catName = findCategoriaNombre(p);
    tr.innerHTML = `
      <td>${escapeHtml(p.nombre || '—')}</td>
      <td>${escapeHtml(catName)}</td>
      <td>${formatMoney(p.precio_venta)}</td>
      <td><span class="stock-badge ${p.stock_actual <= (p.stock_minimo || 5) ? 'stock-bajo' : ''}">${p.stock_actual ?? 0}</span></td>
      <td>
        <button class="btn" data-action="mov" data-id="${p.id}">Mover</button>
      </td>
    `;
    tbody.appendChild(tr);
  }
  // Si no hay productos después de filtrar
  if (productosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No hay productos que coincidan con los filtros</td></tr>';
  }
  // Add handler for move buttons
  qsa('[data-action="mov"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.dataset.id;
      openModal(id);
    });
  });
}

function renderMovimientosList(more = false){
  const listEl = qs('#movimientosList');
  if(!listEl) return;
  listEl.innerHTML = '';
  if(movimientos.length === 0){
    listEl.innerHTML = '<li>No hay movimientos recientes</li>';
    return;
  }
  const displayMovimientos = more ? movimientos : movimientos.slice(0, 10);
  for(const m of displayMovimientos){
    const li = document.createElement('li');
    li.className = 'mov-item';
    const productoNombre = getProductNameFromMovimiento(m);
    const tipo = (m.tipo || '').toLowerCase();
    const signo = tipo === 'salida' ? '−' : '+';
    const cantidad = m.cantidad ?? 0;
    const empleadoNombre = getEmpleadoNombre(m);
    const fecha = formatDate(m.fecha_movimiento || m.fecha || '');
    li.innerHTML = `
      <div class="mov-left">
        <strong>${escapeHtml(productoNombre)}</strong>
        <span class="mov-meta">${escapeHtml(empleadoNombre)} • ${escapeHtml(m.tipo || '')} • ${escapeHtml(m.motivo || '')}</span>
      </div>
      <div>
        <div><strong>${signo}${cantidad}</strong></div>
        <div class="mov-meta">${fecha}</div>
      </div>
    `;
    listEl.appendChild(li);
  }
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
    opt.textContent = `${p.nombre} — stock: ${p.stock_actual ?? 0}`;
    sel.appendChild(opt);
  }
}
function populateEmpleadoSelect(){
  const sel = qs('#empleadoSelect');
  if(!sel) {
    return;
  }
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecciona un empleado...';
  placeholder.disabled = true;
  placeholder.selected = true;
  sel.appendChild(placeholder);
  if(empleados.length === 0) {
    console.log('⚠️ No hay empleados para mostrar en el select');
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No hay empleados disponibles';
    opt.disabled = true;
    sel.appendChild(opt);
    return;
  }
  for(const e of empleados){
    const opt = document.createElement('option');
    opt.value = e.id;
    const nombre = e.nombre_completo || `Empleado ${e.id}`;
    opt.textContent = `${nombre} (${e.codigo_empleado})`;
    
    console.log(`➕ Agregando empleado al select:`, {id: e.id, nombre: nombre});
    sel.appendChild(opt);
  }
  
}
function populateCategoriaFilter(){
  const sel = qs('#categoriaFilter');
  if(!sel) return;
  
  sel.innerHTML = '<option value="">Todas las categorías</option>';
  for(const c of categorias){
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
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
    opt.textContent = e.nombre_completo || e.nombre || 'Empleado ' + e.id;
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
  
  if(prefillProductId){
    qs('#productoSelect').value = prefillProductId;
  }
  // Forzar la selección del primer empleado si existe
  if(empleados.length > 0 && qs('#empleadoSelect')){
    const empleadoSelect = qs('#empleadoSelect');
    if(!empleadoSelect.value && empleados[0].id){
      empleadoSelect.value = empleados[0].id;
      console.log('👤 Empleado seleccionado por defecto:', empleados[0].id);
    }
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
  const tipoAPI = tipo === 'ingreso' ? 'ENTRADA' : 'SALIDA';
  const payload = {
    producto: productoId,
    empleado: empleadoId,
    tipo: tipoAPI, 
    cantidad: cantidad,
    motivo: motivo || 'Movimiento registrado'
  };
  try{
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
    // Refrescar datos
    await Promise.all([loadProductos(), loadMovimientos()]);
    renderProductosTable();
    renderMovimientosList();
    closeModal();
    alert('✅ Movimiento registrado correctamente.');
  }catch(err){
    alert('❌ Error al registrar movimiento: ' + err.message);
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
/* ---------- Helpers ---------- */
function findCategoriaNombre(producto){
  if(!producto) return '—';
  const catId = producto.categoria;
  if(!catId) return '—';
  const c = categorias.find(x => x.id === catId);
  return c ? c.nombre : '—';
}
function getProductNameFromMovimiento(m){
  const producto = productos.find(p => p.id === m.producto);
  return producto ? producto.nombre : 'Producto ' + m.producto;
}
function getEmpleadoNombre(m){
  const empleado = empleados.find(e => e.id === m.empleado);
  return empleado ? (empleado.nombre_completo || empleado.nombre) : 'Empleado ' + m.empleado;
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
  return dt.toLocaleString('es-CO', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}
function escapeHtml(str){
  if(str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}