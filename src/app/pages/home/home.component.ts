import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeroVideoComponent } from '../hero-video/hero-video.component';
import { FeedbackCombinedCarouselComponent } from '../feedback-combined-carousel/feedback-combined-carousel.component';

interface FarmImage {
  src: string;
  alt: string;
  category: string;
  type?: 'square' | 'landscape' | 'portrait'; // Add this property
}

@Component({
  selector: 'app-home',
  imports: [
    RouterModule,
    CommonModule,
    HeroVideoComponent,
    FeedbackCombinedCarouselComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  filters = [
    { label: 'All', value: 'all' },
    { label: 'Trees', value: 'trees' },
    { label: 'School Visits', value: 'school_trips' },
    { label: 'Vegetables', value: 'vegetables' },
  ];

  activeFilter = 'all';

  farmImages: FarmImage[] = [
    {
      src: '../../../assets/farm_gallary_1.JPG',
      alt: 'Farm view',
      category: 'trees',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_2.JPG',
      alt: 'Farm trees',
      category: 'trees',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_3.JPG',
      alt: 'Farm produce',
      category: 'trees',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_4.JPG',
      alt: 'Farm products',
      category: 'vegetables',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_5.JPG',
      alt: 'Farm vegetables',
      category: 'vegetables',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_6.JPG',
      alt: 'Farm fruits',
      category: 'vegetables',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_7.JPG',
      alt: 'Farm fruits',
      category: 'trees',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_9.jpg',
      alt: 'Farm fruits',
      category: 'school_trips',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_10.jpg',
      alt: 'School visit',
      category: 'school_trips',
      type: 'landscape',
    },
    {
      src: '../../../assets/farm_gallary_11.jpg',
      alt: 'School activity',
      category: 'school_trips',
      type: 'landscape',
    },
  ];

  filteredImages = [...this.farmImages];
  activeIndex = 0;
  lightboxActive = false;

  // Celebrity Video Properties
  @ViewChild('celebrityVideo') videoElement!: ElementRef<HTMLVideoElement>;
  isMuted = true;
  isPlaying = false;
  currentTime = 0;
  duration = 0;
  videoProgress = 0;

  filterImages(category: string) {
    this.activeFilter = category;
    if (category === 'all') {
      this.filteredImages = [...this.farmImages];
    } else {
      this.filteredImages = this.farmImages.filter(
        (img) => img.category === category
      );
    }
  }

  openLightbox(index: number) {
    this.activeIndex = index;
    this.lightboxActive = true;
    document.body.classList.add('modal-open');
  }

  closeLightbox() {
    this.lightboxActive = false;
    document.body.classList.remove('modal-open');
  }

  nextImage() {
    this.activeIndex = (this.activeIndex + 1) % this.filteredImages.length;
  }

  prevImage() {
    this.activeIndex =
      (this.activeIndex - 1 + this.filteredImages.length) %
      this.filteredImages.length;
  }

  // Celebrity Video Methods
  toggleMute() {
    if (this.videoElement) {
      this.videoElement.nativeElement.muted =
        !this.videoElement.nativeElement.muted;
      this.isMuted = this.videoElement.nativeElement.muted;
    }
  }

  togglePlay() {
    if (this.videoElement) {
      if (this.isPlaying) {
        this.videoElement.nativeElement.pause();
      } else {
        this.videoElement.nativeElement.play();
      }
      this.isPlaying = !this.isPlaying;
    }
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  ngOnInit() {
    fetch('assets/main.mp4')
      .then((res) => console.log('MP4 accessible:', res.ok))
      .catch((err) => console.error('MP4 error:', err));

    fetch('assets/main_web.webm')
      .then((res) => console.log('WebM accessible:', res.ok))
      .catch((err) => console.error('WebM error:', err));

    // Set up video event listeners
    setTimeout(() => {
      if (this.videoElement) {
        const video = this.videoElement.nativeElement;
        video.muted = true;

        video.addEventListener('loadedmetadata', () => {
          this.duration = video.duration;
        });

        video.addEventListener('timeupdate', () => {
          this.currentTime = video.currentTime;
          this.videoProgress = (video.currentTime / video.duration) * 100 || 0;
        });

        video.addEventListener('play', () => {
          this.isPlaying = true;
        });

        video.addEventListener('pause', () => {
          this.isPlaying = false;
        });
      }
    }, 100);
  }

  @HostListener('click', ['$event'])
  public onClick(event: MouseEvent): void {
    // Handle clicks on nav links
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'A' &&
      target.getAttribute('href')?.startsWith('#')
    ) {
      event.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        this.scrollTo(href.substring(1));
      }
    }
  }

  private scrollTo(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      const navbarHeight =
        document.querySelector('.navbar')?.clientHeight || 70;
      const yOffset = -navbarHeight;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });

      // Close the navbar if mobile
      const navbarToggler = document.querySelector('.navbar-toggler');
      if (navbarToggler?.getAttribute('aria-expanded') === 'true') {
        const navbarContent = document.getElementById('navbarContent');
        navbarToggler.setAttribute('aria-expanded', 'false');
        navbarContent?.classList.remove('show');
      }
    }
  }
}
