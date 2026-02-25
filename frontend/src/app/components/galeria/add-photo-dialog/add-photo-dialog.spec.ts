import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPhotoDialog } from './add-photo-dialog';

describe('AddPhotoDialog', () => {
  let component: AddPhotoDialog;
  let fixture: ComponentFixture<AddPhotoDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPhotoDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPhotoDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
