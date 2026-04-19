import { Injectable, signal, inject } from '@angular/core';
import { Dog } from '../../../models/dog.model';
import { DogService } from '../../../services/dog.service';

@Injectable({
  providedIn: 'root'
})
export class DogStateService {
  private dogService = inject(DogService);
  
  // El perro actualmente seleccionado en el dashboard
  public selectedDog = signal<Dog | null>(null);

  constructor() {}

  /**
   * Intenta cargar el perro desde el servicio principal o el backend
   */
  public async loadDog(id: number): Promise<boolean> {
    // 1. Mirar si ya lo tenemos cargado en la lista general de perros
    const dogs = this.dogService.getDogs()();
    const found = dogs.find(d => d.id === id);
    if (found) {
      this.selectedDog.set(found);
      return true;
    }

    // 2. Si no, forzamos carga del servicio web
    const fetchedDogs = await this.dogService.loadUserDogs();
    
    // 3. Volvemos a buscar
    const foundNow = fetchedDogs.find(d => d.id === id);
    if (foundNow) {
      this.selectedDog.set(foundNow);
      return true;
    }
    
    this.selectedDog.set(null);
    return false;
  }

  public setDog(dog: Dog | null) {
    this.selectedDog.set(dog);
  }

  public getDog() {
    return this.selectedDog;
  }
  
  public clear() {
    this.selectedDog.set(null);
  }
}
