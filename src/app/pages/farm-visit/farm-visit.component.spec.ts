import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmVisitComponent } from './farm-visit.component';

describe('FarmVisitComponent', () => {
  let component: FarmVisitComponent;
  let fixture: ComponentFixture<FarmVisitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmVisitComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FarmVisitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
