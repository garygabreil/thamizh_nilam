import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  AfterViewInit,
  HostListener,
} from '@angular/core';

@Component({
  selector: 'app-hero-video',
  templateUrl: './hero-video.component.html',
  styleUrls: ['./hero-video.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class HeroVideoComponent implements AfterViewInit {
  @ViewChild('heroVideo') heroVideo!: ElementRef<HTMLVideoElement>;

  // Input properties for customization
  @Input() title: string = 'Welcome to Thamizh Nilam';
  @Input() description: string =
    'Experience the beauty of sustainable farming in Tamil Nadu';
  @Input() buttonText: string = 'Explore Our Farm';
  @Input() buttonLink: string = '#about';
  @Input() posterImage: string = './assets/farm_gallary_1.JPG';
  @Input() videoSources = {
    desktop: './assets/main_2.mp4',
    mobile: './assets/main_2.mp4',
  };

  isMobile = false;
  showPlayButton = false;
  videoLoaded = false;
  isMuted = true;

  ngAfterViewInit() {
    this.checkIfMobile();
    this.setupVideo();
  }

  @HostListener('window:resize')
  checkIfMobile() {
    this.isMobile = window.innerWidth < 768;
  }

  setupVideo() {
    if (this.heroVideo) {
      this.heroVideo.nativeElement.muted = this.isMuted;
      this.heroVideo.nativeElement.volume = 0;

      // Autoplay handling
      this.playVideo().catch(() => {
        this.showPlayButton = true;
      });
    }
  }

  async playVideo() {
    try {
      await this.heroVideo.nativeElement.play();
      this.showPlayButton = false;
    } catch (err) {
      this.showPlayButton = true;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const video = this.heroVideo.nativeElement;
    video.muted = this.isMuted;
    video.volume = this.isMuted ? 0 : 1;
  }

  onVideoError() {
    console.error('Video failed to load');
    const heroSection = this.heroVideo.nativeElement.parentElement;
    if (heroSection) {
      heroSection.style.backgroundImage = `url(${this.posterImage})`;
    }
  }
}
