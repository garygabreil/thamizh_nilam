import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SchoolTripsComponent } from './school-trips.component';

describe('SchoolTripsComponent', () => {
  let component: SchoolTripsComponent;
  let fixture: ComponentFixture<SchoolTripsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SchoolTripsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SchoolTripsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
