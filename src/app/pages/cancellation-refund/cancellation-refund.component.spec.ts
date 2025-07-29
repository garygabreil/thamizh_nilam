import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CancellationRefundComponent } from './cancellation-refund.component';

describe('CancellationRefundComponent', () => {
  let component: CancellationRefundComponent;
  let fixture: ComponentFixture<CancellationRefundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CancellationRefundComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CancellationRefundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
