import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { Router, Event, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'thamizh-nilam-thamizh-pannai';
  constructor(
    private router: Router,
    private viewportScroller: ViewportScroller
  ) {
    this.router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    });
  }
}
