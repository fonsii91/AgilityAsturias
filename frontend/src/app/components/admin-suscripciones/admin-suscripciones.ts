import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Feature {
  id: number;
  slug: string;
  name: string;
  type: string;
  description: string;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  price: string;
  description: string;
  is_active: boolean;
  features?: Feature[];
}

@Component({
  selector: 'app-admin-suscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './admin-suscripciones.html',
  styleUrls: ['./admin-suscripciones.css']
})
export class AdminSuscripcionesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  plans = signal<Plan[]>([]);
  features = signal<Feature[]>([]);
  isLoading = signal<boolean>(true);

  // New Plan form state
  showNewPlanForm = signal<boolean>(false);
  newPlan = signal<Partial<Plan>>({
    name: '',
    slug: '',
    price: '0.00',
    description: '',
    is_active: true
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [plansData, featuresData] = await Promise.all([
        this.http.get<Plan[]>(`${this.apiUrl}/plans`).toPromise(),
        this.http.get<Feature[]>(`${this.apiUrl}/features`).toPromise()
      ]);
      
      this.plans.set(plansData || []);
      this.features.set(featuresData || []);
    } catch (error) {
      console.error('Error loading subscriptions data', error);
      alert('Error al cargar datos. Comprueba la consola.');
    } finally {
      this.isLoading.set(false);
    }
  }

  hasFeature(plan: Plan, featureId: number): boolean {
    return !!plan.features?.find(f => f.id === featureId);
  }

  async toggleFeature(plan: Plan, feature: Feature) {
    const hasIt = this.hasFeature(plan, feature.id);
    let currentFeatureIds = plan.features?.map(f => f.id) || [];

    if (hasIt) {
      currentFeatureIds = currentFeatureIds.filter(id => id !== feature.id);
    } else {
      currentFeatureIds.push(feature.id);
    }

    // Optimistic UI update
    const updatedFeatures = hasIt 
        ? plan.features?.filter(f => f.id !== feature.id) || []
        : [...(plan.features || []), feature];
    
    this.updatePlanInList(plan.id, { ...plan, features: updatedFeatures });

    try {
      await this.http.put(`${this.apiUrl}/plans/${plan.id}/features`, {
        feature_ids: currentFeatureIds
      }).toPromise();
    } catch (error) {
      console.error('Error toggling feature', error);
      alert('Error al guardar los cambios.');
      this.loadData(); // Revert
    }
  }

  updatePlanInList(planId: number, updatedPlan: Plan) {
    this.plans.update(plans => plans.map(p => p.id === planId ? updatedPlan : p));
  }

  toggleNewPlanForm() {
    this.showNewPlanForm.update(v => !v);
  }

  async createPlan() {
    try {
      const created = await this.http.post<Plan>(`${this.apiUrl}/plans`, this.newPlan()).toPromise();
      if (created) {
        this.plans.update(plans => [...plans, created]);
        this.showNewPlanForm.set(false);
        this.newPlan.set({ name: '', slug: '', price: '0.00', description: '', is_active: true });
      }
    } catch (error) {
      console.error('Error creating plan', error);
      alert('Error al crear el plan. Asegúrate de que el slug es único.');
    }
  }
}
