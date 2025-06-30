import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  inject,
} from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

export interface Feedback {
  id: string;
  name: string;
  rating: number;
  feedback: string;
  createdAt: Timestamp | Date;
}

@Component({
  selector: 'app-feedback-carousel',
  standalone: true,
  templateUrl: './feedback-carousel.component.html',
  styleUrls: ['./feedback-carousel.component.css'],
  imports: [CommonModule],
})
export class FeedbackCarouselComponent implements OnInit, OnDestroy {
  @Input() collectionName!: string;
  @Input() title: string = 'Visitor Feedback';

  feedbacks: Feedback[] = [];
  loading = true;
  error: string | null = null;
  currentIndex = 0;
  touchStartX = 0;
  touchEndX = 0;
  interval: number | undefined;
  slidesPerView = 1;

  private firestore = inject(Firestore);
  private unsubscribe: (() => void) | null = null;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.updateSlidesPerView();
    this.fetchFeedbacks();

    this.interval = window.setInterval(() => {
      this.nextSlide();
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateSlidesPerView();
  }

  updateSlidesPerView() {
    const width = window.innerWidth;
    if (width >= 1200) {
      this.slidesPerView = 3;
    } else if (width >= 768) {
      this.slidesPerView = 2;
    } else {
      this.slidesPerView = 1;
    }
  }

  fetchFeedbacks() {
    if (!this.collectionName) {
      this.error = 'No collection specified';
      this.loading = false;
      return;
    }

    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, orderBy('createdAt', 'desc'), limit(10));

    this.unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        this.feedbacks = snapshot.docs.map((doc) => ({
          ...(doc.data() as Feedback),
          id: doc.id,
        }));
        this.loading = false;
      },
      (error) => {
        this.error = 'Failed to load feedbacks. Please try again later.';
        this.loading = false;
        console.error(
          `Error fetching feedbacks from ${this.collectionName}:`,
          error
        );
      }
    );
  }

  nextSlide() {
    if (this.feedbacks.length <= this.slidesPerView) return;
    this.currentIndex =
      (this.currentIndex + 1) %
      (this.feedbacks.length - this.slidesPerView + 1);
  }

  prevSlide() {
    if (this.feedbacks.length <= this.slidesPerView) return;
    this.currentIndex =
      (this.currentIndex -
        1 +
        (this.feedbacks.length - this.slidesPerView + 1)) %
      (this.feedbacks.length - this.slidesPerView + 1);
  }

  goToSlide(index: number) {
    this.currentIndex = index;
  }

  handleTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  handleTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  handleSwipe() {
    const swipeThreshold = 50;
    const swipeDistance = this.touchEndX - this.touchStartX;

    if (swipeDistance < -swipeThreshold) {
      this.nextSlide();
    } else if (swipeDistance > swipeThreshold) {
      this.prevSlide();
    }
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getRatingStars(rating: number): ('fill' | 'half' | 'empty')[] {
    return Array.from({ length: 5 }, (_, i) => {
      if (i < Math.floor(rating)) return 'fill';
      if (i === Math.floor(rating) && rating % 1 >= 0.5) return 'half';
      return 'empty';
    });
  }

  formatDate(date: Date | Timestamp): string {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : date.toDate();
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
