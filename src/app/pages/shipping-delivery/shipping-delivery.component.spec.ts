import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShippingDeliveryComponent } from './shipping-delivery.component';

describe('ShippingDeliveryComponent', () => {
  let component: ShippingDeliveryComponent;
  let fixture: ComponentFixture<ShippingDeliveryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShippingDeliveryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShippingDeliveryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
