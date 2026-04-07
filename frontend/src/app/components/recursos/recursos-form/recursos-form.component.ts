import { Component, OnInit, signal } from '@angular/core';

import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ResourceService, RESOURCE_CATEGORIES, RESOURCE_LEVELS } from '../../../services/resource.service';

@Component({
  selector: 'app-recursos-form',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './recursos-form.component.html',
  styleUrls: ['./recursos-form.component.scss']
})
export class RecursosFormComponent implements OnInit {
  resourceForm: FormGroup;
  categories = RESOURCE_CATEGORIES;
  levels = RESOURCE_LEVELS;
  
  isEditing = signal(false);
  resourceId = signal<number | null>(null);
  selectedFile = signal<File | null>(null);
  isSubmitting = signal(false);

  constructor(
    private fb: FormBuilder,
    private resourceService: ResourceService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resourceForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      type: ['document', Validators.required],
      category: ['', Validators.required],
      level: ['', Validators.required],
      url: ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.resourceId.set(+id);
      this.resourceService.getResources().subscribe((resources: any[]) => {
          const res = resources.find((r: any) => r.id === this.resourceId());
          if (res) {
              this.resourceForm.patchValue({
                  title: res.title,
                  description: res.description,
                  type: res.type,
                  category: res.category,
                  level: res.level,
                  url: res.url
              });
          }
      });
    }

    this.resourceForm.get('type')?.valueChanges.subscribe(type => {
      const urlControl = this.resourceForm.get('url');
      if (type === 'video' || type === 'link') {
        urlControl?.setValidators([Validators.required]);
      } else {
        urlControl?.clearValidators();
      }
      urlControl?.updateValueAndValidity();
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
    }
  }

  onSubmit(): void {
    if (this.resourceForm.invalid) return;

    this.isSubmitting.set(true);
    const formData = new FormData();
    const values = this.resourceForm.value;

    formData.append('title', values.title);
    if (values.description) formData.append('description', values.description);
    formData.append('type', values.type);
    formData.append('category', values.category);
    formData.append('level', values.level);

    if (values.type !== 'document' && values.url) {
        formData.append('url', values.url);
    }

    if (values.type === 'document' && this.selectedFile()) {
        formData.append('file', this.selectedFile() as File);
    }

    if (this.isEditing() && this.resourceId()) {
        this.resourceService.updateResource(this.resourceId()!, formData).subscribe({
            next: () => {
                this.router.navigate(['/recursos']);
            },
            error: (err: any) => {
                console.error(err);
                setTimeout(() => this.isSubmitting.set(false));
            }
        });
    } else {
        this.resourceService.createResource(formData).subscribe({
            next: () => {
                this.router.navigate(['/recursos']);
            },
            error: (err: any) => {
                console.error(err);
                setTimeout(() => this.isSubmitting.set(false));
            }
        });
    }
  }
}
