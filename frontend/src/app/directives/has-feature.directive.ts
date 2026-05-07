import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { TenantService } from '../services/tenant.service';

@Directive({
  selector: '[hasFeature]',
  standalone: true
})
export class HasFeatureDirective {
  private tenantService = inject(TenantService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  
  private featureSlug: string = '';
  private hasView = false;

  @Input() set hasFeature(featureSlug: string) {
    this.featureSlug = featureSlug;
    this.updateView();
  }

  constructor() {
    // React to signal changes if the tenant info reloads
    effect(() => {
      // Access the signal to create dependency
      this.tenantService.tenantInfo();
      this.updateView();
    });
  }

  private updateView() {
    if (!this.featureSlug) return;
    
    const hasAccess = this.tenantService.hasFeature(this.featureSlug);
    
    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
