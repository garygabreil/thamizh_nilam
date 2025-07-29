import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  Functions,
  FunctionsModule,
  httpsCallable,
} from '@angular/fire/functions';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  serverTimestamp,
  FieldValue,
  onSnapshot,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { FeedbackCarouselComponent } from '../feedback-carousel/feedback-carousel.component';

interface Booking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  guests: number;
  packageType: string;
  checkin: string;
  checkout: string;
  specialRequests?: string;
  createdAt: FieldValue;
  packageName: string;
  packagePrice: number;
  totalAmount: number;
}

interface CalendarDay {
  dayOfMonth: number;
  date: Date;
  isCurrentMonth: boolean;
  isBooked: boolean;
  isAvailable: boolean;
  isSelected: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-farm-visit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FunctionsModule,
    FeedbackCarouselComponent,
  ],
  templateUrl: './farm-visit.component.html',
  styleUrls: ['./farm-visit.component.css'],
})
export class FarmVisitComponent implements OnInit, OnDestroy {
  currentMonthDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  currentMonthYear: string = '';
  private selectedDate: Date | null = null;

  bookingForm: FormGroup;
  visitPackages = [
    { id: 'basic', name: 'Farm Visit', price: 200, minGuests: 1 },
    {
      id: 'activities',
      name: 'Farm Visit with Activities',
      price: 850,
      minGuests: 8,
    },
    { id: 'full', name: 'Full Farm Experience', price: 1500, minGuests: 8 },
  ];

  isLoading = false;
  isSuccess = false;
  selectedPackage: any = null;
  showTotal = false;
  showGuestError = false;
  totalAmount: number = 0;

  private firestore: Firestore = inject(Firestore);
  private bookingsCollection = collection(
    this.firestore,
    'farm-visit-bookings'
  );
  private bookedDatesSet = new Set<string>();
  private firestoreUnsubscribe: (() => void) | undefined;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private functions: Functions
  ) {
    this.bookingForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      guests: [1, [Validators.required, Validators.min(1)]],
      packageType: ['', Validators.required],
      checkin: ['', Validators.required],
      specialRequests: [''],
      packageName: [''],
      packagePrice: [0],
      totalAmount: [0],
    });
  }

  ngOnInit(): void {
    this.currentMonthDate = new Date();
    this.currentMonthDate.setDate(1);
    this.updateCurrentMonthYear();
    this.buildCalendar();
    this.fetchBookedDates();

    this.bookingForm.get('packageType')?.valueChanges.subscribe((value) => {
      if (value) {
        const selectedPkg = this.visitPackages.find((p) => p.id === value);
        if (selectedPkg) {
          this.bookingForm
            .get('guests')
            ?.setValidators([
              Validators.required,
              Validators.min(selectedPkg.minGuests),
            ]);
          this.bookingForm.get('guests')?.updateValueAndValidity();

          this.bookingForm.patchValue(
            {
              packageName: selectedPkg.name,
              packagePrice: selectedPkg.price,
            },
            { emitEvent: false }
          );

          this.updateTotalAmount();
        }
      }
    });

    this.bookingForm.get('guests')?.valueChanges.subscribe(() => {
      this.validateGuestCount();
      this.updateTotalAmount();
    });
  }

  private updateTotalAmount(): void {
    const guests = this.bookingForm.get('guests')?.value || 0;
    const packagePrice = this.bookingForm.get('packagePrice')?.value || 0;
    const total = guests * packagePrice;

    this.bookingForm.patchValue(
      {
        totalAmount: total,
      },
      { emitEvent: false }
    );

    this.totalAmount = total;
    this.showTotal = packagePrice > 0 && guests > 0;
  }

  private validateGuestCount(): void {
    const packageType = this.bookingForm.get('packageType')?.value;
    const guests = this.bookingForm.get('guests')?.value;

    if (packageType) {
      const selectedPkg = this.visitPackages.find((p) => p.id === packageType);
      if (selectedPkg) {
        this.showGuestError = guests < selectedPkg.minGuests;
      }
    } else {
      this.showGuestError = false;
    }
  }

  selectPackage(packageId: string): void {
    const selectedPackage = this.visitPackages.find((p) => p.id === packageId);
    if (selectedPackage) {
      this.selectedPackage = selectedPackage;
      this.bookingForm.patchValue({
        packageType: selectedPackage.id,
        packageName: selectedPackage.name,
        packagePrice: selectedPackage.price,
      });
      this.updateTotalAmount();
      document
        .getElementById('booking-form')
        ?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  ngOnDestroy(): void {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
    }
  }

  selectDate(day: CalendarDay): void {
    if (!day.isCurrentMonth || day.isBooked || day.isPast) return;

    const selectedDate = day.date;
    const dateStr = this.formatDateToYYYYMMDD(selectedDate);

    this.selectedDate = selectedDate;
    this.bookingForm.patchValue({
      checkin: dateStr,
    });

    this.updateCalendarHighlights();
  }

  updateCalendarHighlights(): void {
    const selectedDateStr = this.selectedDate
      ? this.formatDateToYYYYMMDD(this.selectedDate)
      : null;

    this.calendarDays.forEach((day) => {
      const dayStr = this.formatDateToYYYYMMDD(day.date);
      day.isSelected = dayStr === selectedDateStr;
    });
  }

  updateCurrentMonthYear(): void {
    this.currentMonthYear = `${
      this.monthNames[this.currentMonthDate.getMonth()]
    } ${this.currentMonthDate.getFullYear()}`;
  }

  fetchBookedDates(): void {
    const firstDayOfMonth = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() + 1,
      0
    );

    const q = query(
      this.bookingsCollection,
      where('checkin', '<=', this.formatDateToYYYYMMDD(lastDayOfMonth))
    );

    this.firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
      this.bookedDatesSet.clear();
      snapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        const checkin = new Date(booking.checkin);
        const checkout = new Date(booking.checkout);

        if (checkout >= firstDayOfMonth) {
          const currentDate = new Date(checkin);
          while (currentDate <= checkout) {
            this.bookedDatesSet.add(this.formatDateToYYYYMMDD(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
      this.buildCalendar();
    });
  }

  buildCalendar(): void {
    this.calendarDays = [];
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay();

    // Previous month days
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayDate = new Date(year, month, 0 - (firstDayOfWeek - 1 - i));
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, false, today)
      );
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, true, today)
      );
    }

    // Next month days
    const totalDaysInGrid = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    let nextMonthDayCounter = 1;
    for (let i = this.calendarDays.length; i < totalDaysInGrid; i++) {
      const dayDate = new Date(year, month + 1, nextMonthDayCounter++);
      this.calendarDays.push(
        this.createCalendarDayObject(dayDate, false, today)
      );
    }

    this.updateCalendarHighlights();
  }

  createCalendarDayObject(
    date: Date,
    isCurrentMonth: boolean,
    today: Date
  ): CalendarDay {
    const dateStr = this.formatDateToYYYYMMDD(date);
    const isPast = date < today;
    const isBooked = this.bookedDatesSet.has(dateStr);
    return {
      date: date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: isCurrentMonth,
      isBooked: isBooked,
      isSelected: false,
      isCheckIn: false,
      isCheckOut: false,
      isPast: isPast,
      isAvailable: isCurrentMonth && !isBooked && !isPast,
    };
  }

  formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  prevMonth(): void {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() - 1);
    this.updateCurrentMonthYear();
    this.fetchBookedDates();
  }

  nextMonth(): void {
    this.currentMonthDate.setMonth(this.currentMonthDate.getMonth() + 1);
    this.updateCurrentMonthYear();
    this.fetchBookedDates();
  }

  async onBookingSubmit(): Promise<void> {
    if (this.bookingForm.invalid || this.showGuestError) {
      this.bookingForm.markAllAsTouched();
      alert('Please fill all required fields correctly.');
      return;
    }

    this.isLoading = true;

    try {
      const formValue = this.bookingForm.value;
      const bookingData: Booking = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        guests: formValue.guests,
        packageType: formValue.packageType,
        packageName: formValue.packageName,
        packagePrice: formValue.packagePrice,
        checkin: formValue.checkin,
        checkout: formValue.checkin,
        specialRequests: formValue.specialRequests || 'None',
        totalAmount: formValue.totalAmount,
        createdAt: serverTimestamp(),
      };

      await addDoc(this.bookingsCollection, bookingData);

      try {
        await httpsCallable(this.functions, 'handleFarmVisitBooking')();
      } catch (err) {
        console.log(err);
      }
      this.isSuccess = true;
      setTimeout(() => this.bookingForm.reset(), 3000);
    } catch (error) {
      console.error('Booking process failed:', error);
      alert('Booking failed. Please try again or contact support.');
    } finally {
      this.isLoading = false;
    }
  }

  get f() {
    return this.bookingForm.controls;
  }

  goBack() {
    this.router.navigate(['']);
  }

  getToday(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  scrollToReservation() {
    const element = document.getElementById('reservationForm');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  navigateToPrivacy() {
    this.router.navigate(['/privacy-policy']);
  }

  navigateToTermsAndConditions() {
    this.router.navigate(['/terms-conditions']);
  }

  navigateToShippingDelivery() {
    this.router.navigate(['/shipping-delivery']);
  }

  navigateToCancellationRefund() {
    this.router.navigate(['/cancellation-refund']);
  }
}
