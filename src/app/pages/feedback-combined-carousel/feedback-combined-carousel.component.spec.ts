import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackCombinedCarouselComponent } from './feedback-combined-carousel.component';

describe('FeedbackCombinedCarouselComponent', () => {
  let component: FeedbackCombinedCarouselComponent;
  let fixture: ComponentFixture<FeedbackCombinedCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackCombinedCarouselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackCombinedCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
