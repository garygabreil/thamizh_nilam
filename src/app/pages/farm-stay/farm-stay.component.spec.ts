import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmStayComponent } from './farm-stay.component';

describe('FarmStayComponent', () => {
  let component: FarmStayComponent;
  let fixture: ComponentFixture<FarmStayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmStayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FarmStayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
