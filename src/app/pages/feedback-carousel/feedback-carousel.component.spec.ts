import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackCarouselComponent } from './feedback-carousel.component';

describe('FeedbackCarouselComponent', () => {
  let component: FeedbackCarouselComponent;
  let fixture: ComponentFixture<FeedbackCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackCarouselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
