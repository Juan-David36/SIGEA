import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaService } from '../../core/services/categoria.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import type { Categoria } from '../../core/models/categoria.model';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.scss',
})
export class CategoriasComponent implements OnInit {
  private categoriaService = inject(CategoriaService);
  private ui = inject(UiFeedbackService);

  categorias = signal<Categoria[]>([]);
  loading = signal(true);
  saving = signal(false);
  actionPending = signal<Record<string, boolean>>({});
  error = signal('');
  modalOpen = signal(false);
  editingId = signal<number | null>(null);
  searchTerm = signal('');
  filterEstado = signal<'todos' | 'activas' | 'inactivas'>('todos');

  form = {
    nombre: '',
    descripcion: '',
  };

  totalActivas   = computed(() => this.categorias().filter(c => c.activo).length);
  totalInactivas  = computed(() => this.categorias().filter(c => !c.activo).length);

  filteredCategorias = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const estado = this.filterEstado();

    return this.categorias().filter((categoria) => {
      const pasaBusqueda = !q
        || categoria.nombre.toLowerCase().includes(q)
        || (categoria.descripcion ?? '').toLowerCase().includes(q);
      const pasaEstado = estado === 'todos'
        || (estado === 'activas' && categoria.activo)
        || (estado === 'inactivas' && !categoria.activo);
      return pasaBusqueda && pasaEstado;
    });
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.error.set('');
    this.categoriaService.listarTodas().subscribe({
      next: (categorias) => {
        const ordenadas = [...categorias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        this.categorias.set(ordenadas);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'No se pudieron cargar las categorías.');
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = { nombre: '', descripcion: '' };
    this.error.set('');
    this.modalOpen.set(true);
  }

  openEdit(categoria: Categoria): void {
    this.editingId.set(categoria.id);
    this.form = {
      nombre: categoria.nombre,
      descripcion: categoria.descripcion ?? '',
    };
    this.error.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.saving.set(false);
    this.error.set('');
  }

  submitForm(): void {
    if (!this.form.nombre.trim()) {
      this.error.set('El nombre de la categoría es obligatorio.');
      return;
    }

    this.saving.set(true);
    const request = this.editingId() == null
      ? this.categoriaService.crear(this.form)
      : this.categoriaService.actualizar(this.editingId()!, this.form);

    request.subscribe({
      next: () => {
        const titulo = this.editingId() == null ? 'Categoría creada' : 'Categoría actualizada';
        const mensaje = this.editingId() == null
          ? `La categoría ${this.form.nombre} fue registrada.`
          : `La categoría ${this.form.nombre} fue actualizada.`;
        this.saving.set(false);
        this.closeModal();
        this.cargar();
        this.ui.success(mensaje, titulo);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo guardar la categoría.');
      },
    });
  }

  async activar(categoria: Categoria): Promise<void> {
    await this.runStateChange('activar', categoria, () => this.categoriaService.activar(categoria.id), 'Categoría activada');
  }

  async desactivar(categoria: Categoria): Promise<void> {
    const ok = await this.ui.confirm(`¿Desactivar la categoría ${categoria.nombre}?`, {
      title: 'Desactivar categoría',
      confirmText: 'Desactivar',
      tone: 'warning',
    });
    if (!ok) return;

    await this.runStateChange('desactivar', categoria, () => this.categoriaService.desactivar(categoria.id), 'Categoría desactivada');
  }

  estadoBadgeClass(activo: boolean): string {
    return activo ? 'badge-success' : 'badge-danger';
  }

  private async runStateChange(
    action: 'activar' | 'desactivar',
    categoria: Categoria,
    requestFactory: () => import('rxjs').Observable<Categoria>,
    title: string,
  ): Promise<void> {
    const key = `${action}-${categoria.id}`;
    if (this.actionPending()[key]) return;

    this.actionPending.update((state) => ({ ...state, [key]: true }));
    requestFactory().subscribe({
      next: () => {
        this.actionPending.update((state) => {
          const nextState = { ...state };
          delete nextState[key];
          return nextState;
        });
        this.cargar();
        this.ui.success(`La categoría ${categoria.nombre} fue ${action === 'activar' ? 'activada' : 'desactivada'}.`, title);
      },
      error: (err) => {
        this.actionPending.update((state) => {
          const nextState = { ...state };
          delete nextState[key];
          return nextState;
        });
        this.ui.error(err.error?.message ?? 'No se pudo actualizar el estado de la categoría.', 'Categorías');
      },
    });
  }
}
