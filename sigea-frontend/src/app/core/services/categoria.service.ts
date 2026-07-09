import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Categoria } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  listarActivas(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  listarTodas(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.apiUrl}/todas`);
  }

  buscarPorId(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
  }

  crear(dto: { nombre: string; descripcion?: string }): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, dto);
  }

  actualizar(id: number, dto: { nombre: string; descripcion?: string }): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.apiUrl}/${id}`, dto);
  }

  activar(id: number): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.apiUrl}/${id}/activar`, {});
  }

  desactivar(id: number): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.apiUrl}/${id}/desactivar`, {});
  }
}
