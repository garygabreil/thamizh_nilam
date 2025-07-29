import { Routes } from '@angular/router';
import { FarmStayComponent } from './pages/farm-stay/farm-stay.component';
import { HomeComponent } from './pages/home/home.component';
import { PhotoshootComponent } from './pages/photoshoot/photoshoot.component';
import { WorkshopComponent } from './pages/workshop/workshop.component';
import { SchoolTripsComponent } from './pages/school-trips/school-trips.component';
import { FarmVisitComponent } from './pages/farm-visit/farm-visit.component';
import { FeedbackCarouselComponent } from './pages/feedback-carousel/feedback-carousel.component';
import { FeedbackFormComponent } from './pages/feedback-form/feedback-form.component';
import { PrivacyPolicyComponent } from './pages/privacy-policy/privacy-policy.component';
import { TermsConditionsComponent } from './pages/terms-conditions/terms-conditions.component';
import { CancellationRefundComponent } from './pages/cancellation-refund/cancellation-refund.component';
import { ShippingDeliveryComponent } from './pages/shipping-delivery/shipping-delivery.component';

export const routes: Routes = [
  { path: 'farm-stay', component: FarmStayComponent },
  { path: 'photoshoots', component: PhotoshootComponent },
  { path: 'workshops', component: WorkshopComponent },
  { path: 'school-trips', component: SchoolTripsComponent },
  { path: 'farm-visit', component: FarmVisitComponent },
  { path: 'fd', component: FeedbackCarouselComponent },
  { path: 'feedback', component: FeedbackFormComponent },
  { path: '', component: HomeComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  { path: 'terms-conditions', component: TermsConditionsComponent },
  { path: 'cancellation-refund', component: CancellationRefundComponent },
  { path: 'shipping-delivery', component: ShippingDeliveryComponent },
];
