import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ElementRef,
  inject,
  Input,
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
  source?: string; // Added to track which collection the feedback came from
}

@Component({
  selector: 'app-feedback-combined-carousel',
  standalone: true,
  templateUrl: './feedback-combined-carousel.component.html',
  styleUrls: ['./feedback-combined-carousel.component.css'],
  imports: [CommonModule],
})
export class FeedbackCombinedCarouselComponent implements OnInit, OnDestroy {
  @Input() collectionNames: string[] = []; // Array of collection names
  @Input() titles: string[] = []; // Optional titles for each collection
  @Input() combinedTitle: string = 'All Feedbacks';

  feedbacks: Feedback[] = [];
  loading = true;
  error: string | null = null;
  currentIndex = 0;
  touchStartX = 0;
  touchEndX = 0;
  interval: number | undefined;
  slidesPerView = 1;

  private firestore = inject(Firestore);
  private unsubscribes: (() => void)[] = [];

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.updateSlidesPerView();
    this.fetchAllFeedbacks();

    this.interval = window.setInterval(() => {
      this.nextSlide();
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.unsubscribeAll();
  }

  private unsubscribeAll() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
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

  fetchAllFeedbacks() {
    if (!this.collectionNames || this.collectionNames.length === 0) {
      this.error = 'No collections specified';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.feedbacks = [];
    this.unsubscribeAll();

    let collectionsLoaded = 0;
    const totalCollections = this.collectionNames.length;

    this.collectionNames.forEach((collectionName, index) => {
      const ref = collection(this.firestore, collectionName);
      const q = query(ref, orderBy('createdAt', 'desc'), limit(10));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const newFeedbacks = snapshot.docs.map((doc) => ({
            ...(doc.data() as Feedback),
            id: doc.id,
            source: this.titles[index] || collectionName,
          }));

          // Filter out duplicates and merge with existing feedbacks
          this.feedbacks = [
            ...this.feedbacks.filter(
              (f) => !newFeedbacks.some((nf) => nf.id === f.id)
            ),
            ...newFeedbacks,
          ].sort((a, b) => {
            const dateA =
              a.createdAt instanceof Timestamp
                ? a.createdAt.toDate()
                : a.createdAt;
            const dateB =
              b.createdAt instanceof Timestamp
                ? b.createdAt.toDate()
                : b.createdAt;
            return dateB.getTime() - dateA.getTime();
          });

          collectionsLoaded++;
          if (collectionsLoaded === totalCollections) {
            this.loading = false;
          }
        },
        (error) => {
          this.error = `Failed to load feedbacks from ${collectionName}.`;
          console.error(
            `Error fetching feedbacks from ${collectionName}:`,
            error
          );
          collectionsLoaded++;
          if (collectionsLoaded === totalCollections) {
            this.loading = false;
          }
        }
      );

      this.unsubscribes.push(unsubscribe);
    });
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
